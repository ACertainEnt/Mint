import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { VerificationRequest, VerificationStatus } from '../../src/types';

export const usersRouter = Router();

// GET /api/users/verification/status - Get eligibility and verification status
usersRouter.get('/verification/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const config = database.config?.verificationConfig || {
    minAccountAgeDays: 0,
    minCreatedNfts: 1,
    minSolVolume: 0.1,
    maxVerifiedCommunitiesPerUser: 1,
    adminMultiCommunityAllowed: true,
    cooldownDays: 7
  };

  // User stats
  const createdNfts = (database.nfts || []).filter(n => n.creatorId === user.id);
  const userCollections = (database.collections || []).filter(c => c.creatorId === user.id);
  const totalSolVolume = userCollections.reduce((acc, c) => acc + (c.totalVolume || 0), 0);

  const accountCreatedMs = new Date(user.createdAt || Date.now()).getTime();
  const accountAgeDays = Math.floor((Date.now() - accountCreatedMs) / (1000 * 60 * 60 * 24));

  const nftsMet = createdNfts.length >= config.minCreatedNfts;
  const volumeMet = totalSolVolume >= config.minSolVolume;
  const ageMet = accountAgeDays >= config.minAccountAgeDays;
  const isEligible = nftsMet && volumeMet && ageMet;

  // Requests
  const requests = (database.verificationRequests || []).filter(r => r.userId === user.id);
  const activeUserRequest = requests.find(r => r.entityType === 'user' && r.status === 'under_review') || null;
  const lastUserRequest = requests
    .filter(r => r.entityType === 'user')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null;

  // Check cooldown if rejected
  let cooldownUntil: string | null = null;
  let inCooldown = false;
  if (lastUserRequest && lastUserRequest.status === 'rejected' && lastUserRequest.reviewedAt) {
    const reviewedMs = new Date(lastUserRequest.reviewedAt).getTime();
    const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;
    if (Date.now() < reviewedMs + cooldownMs) {
      cooldownUntil = new Date(reviewedMs + cooldownMs).toISOString();
      inCooldown = true;
    }
  }

  let status: VerificationStatus = 'not_eligible';
  if (user.isVerified) {
    status = 'approved';
  } else if (activeUserRequest) {
    status = 'under_review';
  } else if (inCooldown) {
    status = 'cooldown';
  } else if (lastUserRequest && lastUserRequest.status === 'rejected' && !inCooldown) {
    status = isEligible ? 'request_available' : 'not_eligible';
  } else if (isEligible) {
    status = 'eligible';
  } else {
    status = 'not_eligible';
  }

  // Community limits
  const userVerifiedCommunities = (database.communities || []).filter(
    c => c.creatorId === user.id && c.isVerified
  );
  const isAdmin = user.role === 'admin';
  const maxVerifiedCommunities = isAdmin && config.adminMultiCommunityAllowed ? 999 : config.maxVerifiedCommunitiesPerUser;
  const canVerifyAnotherCommunity = user.isVerified && (userVerifiedCommunities.length < maxVerifiedCommunities);

  res.json({
    isVerified: !!user.isVerified,
    role: user.role,
    status,
    isEligible,
    requirements: [
      {
        id: 'created_nfts',
        label: `Mint at least ${config.minCreatedNfts} NFT artifact`,
        required: config.minCreatedNfts,
        current: createdNfts.length,
        met: nftsMet
      },
      {
        id: 'sol_volume',
        label: `Generate at least ${config.minSolVolume} SOL in collection volume`,
        required: config.minSolVolume,
        current: totalSolVolume,
        unit: 'SOL',
        met: volumeMet
      },
      {
        id: 'account_age',
        label: `Account active for ${config.minAccountAgeDays} days`,
        required: config.minAccountAgeDays,
        current: accountAgeDays,
        unit: 'days',
        met: ageMet
      }
    ],
    activeRequest: activeUserRequest,
    lastRequest: lastUserRequest,
    cooldownUntil,
    communityLimits: {
      max: config.maxVerifiedCommunitiesPerUser,
      currentVerifiedCount: userVerifiedCommunities.length,
      isAdmin,
      canVerifyAnotherCommunity,
      verifiedCommunities: userVerifiedCommunities.map(c => ({ id: c.id, name: c.name, slug: c.slug }))
    }
  });
});

// POST /api/users/verification/request - Submit verification request for user account
usersRouter.post('/verification/request', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { justification, portfolioUrl } = req.body;
  const database = db.get();

  if (user.isVerified) {
    return res.status(400).json({ error: 'Your account is already verified' });
  }

  if (!Array.isArray(database.verificationRequests)) {
    database.verificationRequests = [];
  }

  const existingPending = database.verificationRequests.find(
    r => r.userId === user.id && r.entityType === 'user' && r.status === 'under_review'
  );
  if (existingPending) {
    return res.status(400).json({ error: 'You already have an active verification request under review' });
  }

  // Check cooldown if rejected
  const lastRejected = database.verificationRequests
    .filter(r => r.userId === user.id && r.entityType === 'user' && r.status === 'rejected')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  const config = database.config?.verificationConfig || { cooldownDays: 7 };
  if (lastRejected && lastRejected.reviewedAt) {
    const reviewedMs = new Date(lastRejected.reviewedAt).getTime();
    const cooldownMs = (config.cooldownDays || 7) * 24 * 60 * 60 * 1000;
    if (Date.now() < reviewedMs + cooldownMs) {
      const remainingDays = Math.ceil((reviewedMs + cooldownMs - Date.now()) / (24 * 60 * 60 * 1000));
      return res.status(400).json({
        error: `Verification request is currently in cooldown period. Please wait ${remainingDays} more day(s) before resubmitting.`
      });
    }
  }

  const newRequest: VerificationRequest = {
    id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    username: user.username,
    userDisplayName: user.displayName,
    userAvatar: user.avatar,
    entityType: 'user',
    status: 'under_review',
    justification: justification?.trim() || 'Creator verification request for Solana identity.',
    portfolioUrl: portfolioUrl?.trim() || undefined,
    submittedAt: new Date().toISOString()
  };

  database.verificationRequests.unshift(newRequest);

  // Send confirmation notification
  database.notifications.unshift({
    id: `notif_${Date.now()}_vreq`,
    userId: user.id,
    title: 'Verification Request Submitted',
    message: 'Your creator verification request has been received and is currently under review by protocol moderators.',
    type: 'system',
    read: false,
    timestamp: new Date().toISOString()
  });

  db.save(database);
  res.status(201).json({ request: newRequest });
});

// Get user public profile
usersRouter.get('/:identifier', (req, res) => {
  const { identifier } = req.params;
  const database = db.get();
  const clean = identifier.replace(/^@/, '').toLowerCase();

  const user = database.users.find(u => 
    u.id.toLowerCase() === clean ||
    u.username.toLowerCase() === clean ||
    (u.walletAddress && u.walletAddress.toLowerCase() === clean)
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Sanitize user object (no internal passwords)
  const { ...safeUser } = user;

  // Stats
  const createdCollections = database.collections.filter(c => c.creatorId === user.id);
  const createdNfts = database.nfts.filter(n => n.creatorId === user.id);
  const ownedNfts = database.nfts.filter(n => n.ownerId === user.id);
  const activeListings = ownedNfts.filter(n => n.isListed);

  res.json({
    user: safeUser,
    stats: {
      collectionsCount: createdCollections.length,
      nftsCreatedCount: createdNfts.length,
      nftsOwnedCount: ownedNfts.length,
      listingsCount: activeListings.length
    }
  });
});

// Get user portfolio
usersRouter.get('/:identifier/portfolio', (req, res) => {
  const { identifier } = req.params;
  const database = db.get();
  const clean = identifier.replace(/^@/, '').toLowerCase();

  const user = database.users.find(u => 
    u.id.toLowerCase() === clean ||
    u.username.toLowerCase() === clean ||
    (u.walletAddress && u.walletAddress.toLowerCase() === clean)
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const ownedNfts = database.nfts.filter(n => n.ownerId === user.id || (user.walletAddress && n.ownerAddress.toLowerCase() === user.walletAddress.toLowerCase()));
  const listedNfts = ownedNfts.filter(n => n.isListed);
  const createdCollections = database.collections.filter(c => c.creatorId === user.id);
  const createdNfts = database.nfts.filter(n => n.creatorId === user.id);
  
  // Active bids placed by this user
  const activeBids = database.auctions
    .filter(a => a.status === 'active' && a.bids.some(b => b.bidderId === user.id))
    .map(a => {
      const myHighestBid = a.bids.filter(b => b.bidderId === user.id).sort((x, y) => y.amount - x.amount)[0];
      return {
        auction: a,
        myBid: myHighestBid,
        isLeading: a.currentBidderId === user.id
      };
    });

  // Won auctions
  const wonAuctions = database.auctions.filter(a => a.status === 'settled' && a.winnerId === user.id);

  // Bounties created by or submitted to by user
  const createdBounties = database.bounties.filter(b => b.creatorId === user.id);
  const submittedBounties = database.bounties.filter(b => b.submissions.some(s => s.submitterId === user.id));

  // User activity
  const userActivity = database.activity.filter(act => 
    act.fromUsername?.toLowerCase() === user.username.toLowerCase() ||
    act.toUsername?.toLowerCase() === user.username.toLowerCase() ||
    (user.walletAddress && (act.fromAddress?.toLowerCase() === user.walletAddress.toLowerCase() || act.toAddress?.toLowerCase() === user.walletAddress.toLowerCase()))
  );

  res.json({
    user,
    portfolio: {
      ownedNfts,
      listedNfts,
      createdCollections,
      createdNfts,
      activeBids,
      wonAuctions,
      createdBounties,
      submittedBounties,
      activity: userActivity
    }
  });
});
