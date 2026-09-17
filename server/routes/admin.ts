import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';

export const adminRouter = Router();

// Apply requireAdmin to all admin endpoints
adminRouter.use(requireAdmin);

// List users for admin inspection
adminRouter.get('/users', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const users = database.users.map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    walletAddress: u.walletAddress,
    role: u.role,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
    profileCompleted: u.profileCompleted
  }));

  res.json({ users });
});

// Toggle user verification status
adminRouter.post('/verify-user', (req: AuthenticatedRequest, res) => {
  const { userId, isVerified } = req.body;
  if (!userId || typeof isVerified !== 'boolean') {
    return res.status(400).json({ error: 'userId and isVerified (boolean) are required' });
  }

  const database = db.get();
  const user = database.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.isVerified = isVerified;

  // Notify the user
  database.notifications.unshift({
    id: `notif_${Date.now()}_verify`,
    userId: user.id,
    title: isVerified ? 'Verified Creator Badge Granted' : 'Verification Status Updated',
    message: isVerified 
      ? 'Congratulations! Your user profile now displays the verified checkmark badge.' 
      : 'Your verification status has been revoked by protocol administration.',
    type: 'system',
    read: false,
    timestamp: new Date().toISOString()
  });

  db.save(database);
  res.json({ success: true, user });
});

// GET /api/admin/verification-requests - List all verification requests
adminRouter.get('/verification-requests', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const requests = database.verificationRequests || [];
  res.json({ requests });
});

// POST /api/admin/verification-requests/:id/review - Approve or reject verification request
adminRouter.post('/verification-requests/:id/review', (req: AuthenticatedRequest, res) => {
  const { action, reason } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
  }

  const database = db.get();
  if (!Array.isArray(database.verificationRequests)) database.verificationRequests = [];
  const request = database.verificationRequests.find(r => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ error: 'Verification request not found' });
  }

  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = req.user!.username;
  if (action === 'reject') {
    request.rejectionReason = reason || 'Requirements not fully met at this time.';
  }

  if (request.entityType === 'user') {
    const targetUser = database.users.find(u => u.id === request.userId);
    if (targetUser && action === 'approve') {
      targetUser.isVerified = true;
    }
    if (targetUser) {
      database.notifications.unshift({
        id: `notif_${Date.now()}_vdec`,
        userId: targetUser.id,
        title: action === 'approve' ? 'Verification Approved' : 'Verification Request Decision',
        message: action === 'approve'
          ? 'Your user identity verification request has been approved! Your account now bears the verified badge.'
          : `Your verification request was not approved: ${request.rejectionReason || 'Please review requirements.'}`,
        type: 'system',
        read: false,
        timestamp: new Date().toISOString()
      });
    }
  } else if (request.entityType === 'community' && request.communityId) {
    const targetCommunity = (database.communities || []).find(c => c.id === request.communityId);
    if (targetCommunity && action === 'approve') {
      targetCommunity.isVerified = true;
    }
    const targetUser = database.users.find(u => u.id === request.userId);
    if (targetUser) {
      database.notifications.unshift({
        id: `notif_${Date.now()}_vcomdec`,
        userId: targetUser.id,
        title: action === 'approve' ? 'Community Verified' : 'Community Verification Decision',
        message: action === 'approve'
          ? `Your community "${request.communityName}" has been granted verified community status.`
          : `Community verification for "${request.communityName}" was declined: ${request.rejectionReason || 'One verified community limit reached or requirements unmet.'}`,
        type: 'system',
        read: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  db.save(database);
  res.json({ success: true, request });
});

// Update platform fees & configuration
adminRouter.post('/config', (req: AuthenticatedRequest, res) => {
  const { marketplaceFeePercent, auctionFeePercent, mintFeePercent, treasuryAddress, mintBotConfig, launchConfig, verificationConfig, maxBioLength, maxAccountsPerDevice } = req.body;
  const database = db.get();

  if (marketplaceFeePercent !== undefined) database.config.marketplaceFeePercent = Number(marketplaceFeePercent);
  if (auctionFeePercent !== undefined) database.config.auctionFeePercent = Number(auctionFeePercent);
  if (mintFeePercent !== undefined) database.config.mintFeePercent = Number(mintFeePercent);
  if (treasuryAddress) database.config.treasuryAddress = treasuryAddress.trim();
  if (maxBioLength !== undefined) database.config.maxBioLength = Number(maxBioLength);
  if (maxAccountsPerDevice !== undefined) database.config.maxAccountsPerDevice = Number(maxAccountsPerDevice);

  if (mintBotConfig) {
    database.config.mintBotConfig = {
      ...database.config.mintBotConfig,
      ...mintBotConfig
    };
  }

  if (launchConfig) {
    database.config.launchConfig = {
      ...database.config.launchConfig,
      ...launchConfig
    };
  }

  if (verificationConfig) {
    database.config.verificationConfig = {
      ...database.config.verificationConfig,
      ...verificationConfig
    };
  }

  db.save(database);
  res.json({ config: database.config, success: true });
});

// Moderate NFT (delist or flag)
adminRouter.post('/moderate-nft', (req: AuthenticatedRequest, res) => {
  const { nftId, action } = req.body;
  const database = db.get();
  const nft = database.nfts.find(n => n.id === nftId);
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  if (action === 'delist') {
    nft.isListed = false;
    nft.price = undefined;
  }

  db.save(database);
  res.json({ success: true, nft });
});

// Telegram integration boundary (disabled in V1 per specifications)
adminRouter.post('/telegram-test', async (_req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    disabled: true,
    telegramSent: false,
    note: 'Telegram is disabled in Mint V1. Native MintBot assistant is active inside the Mint platform.'
  });
});
