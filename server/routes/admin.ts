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

// GET /api/admin/verification-requests - List all verification requests with enriched user data
adminRouter.get('/verification-requests', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const requests = (database.verificationRequests || []).map(r => {
    const user = database.users.find(u => u.id === r.userId);
    return {
      ...r,
      user: user ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        isFoundingMember: user.isFoundingMember,
        createdAt: user.createdAt,
        walletAddress: user.walletAddress
      } : undefined
    };
  });
  res.json({ requests });
});

// POST /api/admin/verification-requests/:id/review - Approve, reject, or request more info
adminRouter.post('/verification-requests/:id/review', (req: AuthenticatedRequest, res) => {
  const { action, reason, message } = req.body;
  if (!['approve', 'reject', 'needs_info'].includes(action)) {
    return res.status(400).json({ error: "Action must be 'approve', 'reject', or 'needs_info'" });
  }

  const database = db.get();
  if (!Array.isArray(database.verificationRequests)) database.verificationRequests = [];
  const request = database.verificationRequests.find(r => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ error: 'Verification request not found' });
  }

  const now = new Date().toISOString();
  request.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_info';
  request.reviewedAt = now;
  request.reviewedBy = req.user!.username;

  if (action === 'reject') {
    request.rejectionReason = reason || 'Requirements not fully met at this time.';
  } else if (action === 'needs_info') {
    request.adminMessage = message || reason || 'Please provide additional verification links or portfolio evidence.';
  }

  if (!request.history) request.history = [];
  request.history.push({
    id: `hist_${Date.now()}`,
    action: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requested_info',
    actorId: req.user!.id,
    actorName: req.user!.displayName,
    timestamp: now,
    note: action === 'reject' ? request.rejectionReason : action === 'needs_info' ? request.adminMessage : 'Application approved'
  });

  if (request.entityType === 'user') {
    const targetUser = database.users.find(u => u.id === request.userId);
    if (targetUser && action === 'approve') {
      targetUser.isVerified = true;
    }
    if (targetUser) {
      let notifTitle = 'Verification Approved';
      let notifMsg = 'Your user identity verification request has been approved! Your account now displays the MINT verified badge.';

      if (action === 'reject') {
        notifTitle = 'Verification Request Decision';
        notifMsg = `Your verification request was not approved: ${request.rejectionReason}`;
      } else if (action === 'needs_info') {
        notifTitle = 'Additional Verification Information Requested';
        notifMsg = `MINT review team requested more information: ${request.adminMessage}`;
      }

      database.notifications.unshift({
        id: `notif_${Date.now()}_vdec`,
        userId: targetUser.id,
        title: notifTitle,
        message: notifMsg,
        type: 'system',
        read: false,
        timestamp: now
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
          : `Community verification for "${request.communityName}" was declined: ${request.rejectionReason || 'Requirements unmet.'}`,
        type: 'system',
        read: false,
        timestamp: now
      });
    }
  }

  db.save(database);
  res.json({ success: true, request });
});

// POST /api/admin/users/:id/founding-member - Toggle Founding Member status for user
adminRouter.post('/users/:id/founding-member', (req: AuthenticatedRequest, res) => {
  const { isFoundingMember, reason } = req.body;
  const database = db.get();
  const targetUser = database.users.find(u => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const nextState = isFoundingMember !== undefined ? !!isFoundingMember : !targetUser.isFoundingMember;
  targetUser.isFoundingMember = nextState;
  targetUser.foundingMemberGrantedAt = nextState ? new Date().toISOString() : undefined;
  targetUser.foundingMemberReason = reason || (nextState ? 'Granted by platform administration for early genesis participation' : undefined);

  if (nextState) {
    database.notifications.unshift({
      id: `notif_${Date.now()}_founding`,
      userId: targetUser.id,
      title: 'Founding Member Status Awarded',
      message: 'Congratulations! Your account has been designated as a MINT Founding Member for early participation in the protocol.',
      type: 'system',
      read: false,
      timestamp: new Date().toISOString()
    });
  }

  db.save(database);
  res.json({ success: true, user: targetUser });
});

// POST /api/admin/founding-member/evaluate - Automatically evaluate and grant Founding Member status based on criteria
adminRouter.post('/founding-member/evaluate', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const foundingConfig = database.config.verificationConfig?.foundingConfig || {
    enabled: true,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-10-31T23:59:59.999Z',
    minPostsCount: 0,
    minActiveDays: 0,
    minInteractions: 0
  };

  const startMs = new Date(foundingConfig.startDate).getTime();
  const endMs = new Date(foundingConfig.endDate).getTime();
  let grantedCount = 0;

  for (const u of database.users) {
    if (u.isFoundingMember) continue;

    const userCreatedMs = new Date(u.createdAt || Date.now()).getTime();
    const inPeriod = userCreatedMs >= startMs && userCreatedMs <= endMs;

    const userPosts = (database.posts || []).filter(p => p.authorId === u.id).length;
    const userComments = (database.comments || []).filter(c => c.authorId === u.id).length;
    const interactions = userPosts + userComments;

    const minPosts = foundingConfig.minPostsCount || 0;
    const minInteractions = foundingConfig.minInteractions || 0;

    if (inPeriod && userPosts >= minPosts && interactions >= minInteractions) {
      u.isFoundingMember = true;
      u.foundingMemberGrantedAt = new Date().toISOString();
      u.foundingMemberReason = 'Qualified during MINT Founding Period through active platform engagement';
      grantedCount++;

      database.notifications.unshift({
        id: `notif_${Date.now()}_founding_${u.id}`,
        userId: u.id,
        title: 'Founding Member Status Awarded',
        message: 'You have been awarded MINT Founding Member status based on your early participation and community engagement.',
        type: 'system',
        read: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  db.save(database);
  res.json({ success: true, grantedCount, totalUsers: database.users.length });
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
