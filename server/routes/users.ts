import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { User, VerificationRequest, VerificationStatus } from '../../src/types';
import { validateUsernameAvailability, isPlatformOwner } from '../utils/usernameProtection';
import { evaluateAiContentLikelihood } from '../utils/aiContentDetection';

export const usersRouter = Router();

// GET /api/users/check-username - Check username availability and reserved protection
usersRouter.get('/check-username', (req: AuthenticatedRequest, res) => {
  const rawUsername = String(req.query.username || '');
  const database = db.get();
  const currentUserId = req.user?.id;

  const result = validateUsernameAvailability(
    rawUsername,
    currentUserId,
    req.user,
    database.users || []
  );

  res.json({
    available: result.available,
    code: result.code,
    message: result.message,
    normalized: result.normalized
  });
});

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

  // User activity stats
  const createdNfts = (database.nfts || []).filter(n => n.creatorId === user.id);
  const userCollections = (database.collections || []).filter(c => c.creatorId === user.id);
  const userPosts = (database.posts || []).filter(p => p.authorId === user.id);
  const totalSolVolume = userCollections.reduce((acc, c) => acc + (c.totalVolume || 0), 0);

  const accountCreatedMs = new Date(user.createdAt || Date.now()).getTime();
  const accountAgeDays = Math.floor((Date.now() - accountCreatedMs) / (1000 * 60 * 60 * 24));

  const nftsMet = createdNfts.length >= (config.minCreatedNfts || 0);
  const volumeMet = totalSolVolume >= (config.minSolVolume || 0);
  const ageMet = accountAgeDays >= (config.minAccountAgeDays || 0);
  // Flexible eligibility: eligible if has any notable creation, volume, age, or request submitted
  const isEligible = true;

  // Requests
  const requests = (database.verificationRequests || []).filter(r => r.userId === user.id);
  const activeUserRequest = requests.find(r => r.entityType === 'user' && (r.status === 'under_review' || r.status === 'pending' || r.status === 'needs_info')) || null;
  const lastUserRequest = requests
    .filter(r => r.entityType === 'user')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0] || null;

  // Check cooldown if rejected
  let cooldownUntil: string | null = null;
  let inCooldown = false;
  if (lastUserRequest && lastUserRequest.status === 'rejected' && lastUserRequest.reviewedAt) {
    const reviewedMs = new Date(lastUserRequest.reviewedAt).getTime();
    const cooldownMs = (config.cooldownDays || 7) * 24 * 60 * 60 * 1000;
    if (Date.now() < reviewedMs + cooldownMs) {
      cooldownUntil = new Date(reviewedMs + cooldownMs).toISOString();
      inCooldown = true;
    }
  }

  let status: VerificationStatus = 'not_eligible';
  const ownerEntitled = isPlatformOwner(user);

  if (user.isVerified || ownerEntitled) {
    status = 'approved';
  } else if (activeUserRequest) {
    if (activeUserRequest.status === 'needs_info') {
      status = 'needs_info';
    } else {
      status = 'pending';
    }
  } else if (inCooldown) {
    status = 'cooldown';
  } else {
    status = 'request_available';
  }

  // Community limits
  const userVerifiedCommunities = (database.communities || []).filter(
    c => c.creatorId === user.id && c.isVerified
  );
  const isOwnerOrAdmin = ownerEntitled || user.role === 'admin';
  const maxVerifiedCommunities = isOwnerOrAdmin && config.adminMultiCommunityAllowed ? 999 : config.maxVerifiedCommunitiesPerUser;
  const canVerifyAnotherCommunity = (user.isVerified || isOwnerOrAdmin) && (isOwnerOrAdmin || userVerifiedCommunities.length < maxVerifiedCommunities);

  res.json({
    isVerified: !!user.isVerified || ownerEntitled,
    isFoundingMember: !!user.isFoundingMember || ownerEntitled,
    role: user.role,
    status: ownerEntitled ? 'approved' : status,
    isEligible: true,
    userSignals: {
      accountAgeDays,
      createdNftsCount: createdNfts.length,
      collectionsCount: userCollections.length,
      postsCount: userPosts.length
    },
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
      isAdmin: isOwnerOrAdmin,
      canVerifyAnotherCommunity,
      verifiedCommunities: userVerifiedCommunities.map(c => ({ id: c.id, name: c.name, slug: c.slug }))
    },
    foundingConfig: config.foundingConfig
  });
});

// POST /api/users/verification/request - Submit verification request for user account
usersRouter.post('/verification/request', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { category, justification, evidence, portfolioUrl } = req.body;
  const database = db.get();

  if (user.isVerified || isPlatformOwner(user)) {
    return res.status(400).json({ error: 'Your account is already verified' });
  }

  if (!Array.isArray(database.verificationRequests)) {
    database.verificationRequests = [];
  }

  // If there's an existing request in 'needs_info', allow updating it
  let existingRequest = database.verificationRequests.find(
    r => r.userId === user.id && r.entityType === 'user' && r.status === 'needs_info'
  );

  const existingPending = database.verificationRequests.find(
    r => r.userId === user.id && r.entityType === 'user' && (r.status === 'under_review' || r.status === 'pending')
  );
  if (existingPending) {
    return res.status(400).json({ error: 'You already have an active verification request under review' });
  }

  // Check cooldown if rejected
  const lastRejected = database.verificationRequests
    .filter(r => r.userId === user.id && r.entityType === 'user' && r.status === 'rejected')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  const config = database.config?.verificationConfig || { cooldownDays: 7 };
  if (lastRejected && lastRejected.reviewedAt && !existingRequest) {
    const reviewedMs = new Date(lastRejected.reviewedAt).getTime();
    const cooldownMs = (config.cooldownDays || 7) * 24 * 60 * 60 * 1000;
    if (Date.now() < reviewedMs + cooldownMs) {
      const remainingDays = Math.ceil((reviewedMs + cooldownMs - Date.now()) / (24 * 60 * 60 * 1000));
      return res.status(400).json({
        error: `Verification request is currently in cooldown period. Please wait ${remainingDays} more day(s) before resubmitting.`
      });
    }
  }

  const evidenceLinks: string[] = Array.isArray(evidence?.links)
    ? evidence.links.filter((l: any) => typeof l === 'string' && l.trim())
    : portfolioUrl ? [portfolioUrl.trim()] : [];

  const evidenceDocs: string[] = Array.isArray(evidence?.documents)
    ? evidence.documents.filter((d: any) => typeof d === 'string' && d.trim())
    : [];

  // Compute activity signals
  const createdNfts = (database.nfts || []).filter(n => n.creatorId === user.id);
  const collections = (database.collections || []).filter(c => c.creatorId === user.id);
  const posts = (database.posts || []).filter(p => p.authorId === user.id);
  const communities = (database.communities || []).filter(c => c.creatorId === user.id);
  const accountCreatedMs = new Date(user.createdAt || Date.now()).getTime();
  const accountAgeDays = Math.max(0, Math.floor((Date.now() - accountCreatedMs) / (1000 * 60 * 60 * 24)));

  // Compute cautious AI content assessment
  const aiAssessment = evaluateAiContentLikelihood(
    justification || '',
    evidenceLinks,
    evidenceDocs
  );

  const now = new Date().toISOString();

  if (existingRequest) {
    existingRequest.category = category || existingRequest.category || 'Creator';
    existingRequest.justification = justification?.trim() || existingRequest.justification;
    existingRequest.evidence = {
      links: evidenceLinks,
      documents: evidenceDocs,
      notes: evidence?.notes || ''
    };
    existingRequest.portfolioUrl = portfolioUrl?.trim() || evidenceLinks[0] || existingRequest.portfolioUrl;
    existingRequest.status = 'pending';
    existingRequest.aiAssessment = aiAssessment;
    existingRequest.userSignals = {
      accountAgeDays,
      createdNftsCount: createdNfts.length,
      collectionsCount: collections.length,
      postsCount: posts.length,
      communitiesCount: communities.length
    };
    if (!existingRequest.history) existingRequest.history = [];
    existingRequest.history.push({
      id: `hist_${Date.now()}`,
      action: 'provided_info',
      actorId: user.id,
      actorName: user.displayName,
      timestamp: now,
      note: 'Applicant submitted updated information and evidence.'
    });

    db.save(database);
    return res.json({ request: existingRequest });
  }

  const newRequest: VerificationRequest = {
    id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    username: user.username,
    userDisplayName: user.displayName,
    userAvatar: user.avatar,
    userRole: user.role,
    userCreatedAt: user.createdAt,
    entityType: 'user',
    category: category || 'Creator',
    status: 'pending',
    justification: justification?.trim() || 'Creator verification request for Solana identity.',
    portfolioUrl: portfolioUrl?.trim() || evidenceLinks[0] || undefined,
    evidence: {
      links: evidenceLinks,
      documents: evidenceDocs,
      notes: evidence?.notes || ''
    },
    aiAssessment,
    userSignals: {
      accountAgeDays,
      createdNftsCount: createdNfts.length,
      collectionsCount: collections.length,
      postsCount: posts.length,
      communitiesCount: communities.length
    },
    history: [
      {
        id: `hist_${Date.now()}`,
        action: 'submitted',
        actorId: user.id,
        actorName: user.displayName,
        timestamp: now,
        note: 'Verification request submitted by applicant.'
      }
    ],
    submittedAt: now
  };

  database.verificationRequests.unshift(newRequest);

  // Send confirmation notification
  database.notifications.unshift({
    id: `notif_${Date.now()}_vreq`,
    userId: user.id,
    title: 'Verification Request Received',
    message: 'Your verification request has been received and is in the MINT review queue.',
    type: 'system',
    read: false,
    timestamp: now
  });

  db.save(database);
  res.status(201).json({ request: newRequest });
});

// POST /api/users/verification/respond-info - Provide additional information requested by admin
usersRouter.post('/verification/respond-info', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { responseText, additionalLinks, additionalDocuments } = req.body;
  const database = db.get();

  const request = (database.verificationRequests || []).find(
    r => r.userId === user.id && r.entityType === 'user' && r.status === 'needs_info'
  );

  if (!request) {
    return res.status(404).json({ error: 'No verification request awaiting additional information found.' });
  }

  const now = new Date().toISOString();
  if (!request.additionalEvidence) request.additionalEvidence = [];
  request.additionalEvidence.push({
    text: responseText?.trim() || '',
    links: Array.isArray(additionalLinks) ? additionalLinks : [],
    documents: Array.isArray(additionalDocuments) ? additionalDocuments : [],
    submittedAt: now
  });

  request.status = 'pending';
  if (!request.history) request.history = [];
  request.history.push({
    id: `hist_${Date.now()}`,
    action: 'provided_info',
    actorId: user.id,
    actorName: user.displayName,
    timestamp: now,
    note: responseText?.trim() || 'Additional evidence provided'
  });

  database.notifications.unshift({
    id: `notif_${Date.now()}_info_ack`,
    userId: user.id,
    title: 'Additional Information Received',
    message: 'Thank you. Your additional verification evidence has been submitted to the MINT review team.',
    type: 'system',
    read: false,
    timestamp: now
  });

  db.save(database);
  res.json({ success: true, request });
});

// Helper to find a user by ID, username, wallet address, email, alias, or active session
function findUserByIdentifier(database: any, identifier: string, reqUser?: User): User | null {
  if (!identifier) return reqUser || null;
  const clean = decodeURIComponent(identifier).replace(/^@/, '').trim().toLowerCase();

  // 1. Direct 'me' / 'self' / 'current' check
  if ((clean === 'me' || clean === 'self' || clean === 'current') && reqUser) {
    return reqUser;
  }

  // 2. Check reqUser if it matches identifier
  if (reqUser) {
    if (
      reqUser.id.toLowerCase() === clean ||
      reqUser.username.toLowerCase() === clean ||
      (reqUser.walletAddress && reqUser.walletAddress.toLowerCase() === clean) ||
      (reqUser.email && reqUser.email.toLowerCase() === clean)
    ) {
      return reqUser;
    }
  }

  // 3. Search in database.users
  const found = (database.users || []).find((u: User) => 
    u.id.toLowerCase() === clean ||
    u.username.toLowerCase() === clean ||
    (u.walletAddress && u.walletAddress.toLowerCase() === clean) ||
    (u.email && u.email.toLowerCase() === clean)
  );
  if (found) return found;

  // 4. Aliases for platform owner account (Ace, Mint, pervercy23)
  if (clean === 'ace' || clean === 'mint' || clean === 'a_certain_ent') {
    const admin = (database.users || []).find((u: User) => u.id === 'usr_ace_admin' || u.email === 'pervercy23@gmail.com');
    if (admin) return admin;
  }

  // 5. If calling user is authenticated and looking up their own context, fallback to reqUser
  if (reqUser) {
    return reqUser;
  }

  return null;
}

// Get user public profile
usersRouter.get('/:identifier', (req: AuthenticatedRequest, res) => {
  const { identifier } = req.params;
  const database = db.get();
  const user = findUserByIdentifier(database, identifier, req.user);

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
usersRouter.get('/:identifier/portfolio', (req: AuthenticatedRequest, res) => {
  const { identifier } = req.params;
  const database = db.get();
  let user = findUserByIdentifier(database, identifier, req.user);

  // If user is not found in database, synthesize a safe default so portfolio view never fails
  if (!user) {
    const clean = decodeURIComponent(identifier || '').replace(/^@/, '').trim();
    user = {
      id: `usr_${clean ? clean.replace(/[^a-zA-Z0-9_]/g, '') : 'guest'}`,
      username: clean || 'collector',
      displayName: clean.length > 10 ? `${clean.slice(0, 4)}..${clean.slice(-4)}` : (clean || 'Solana Collector'),
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${clean || 'guest'}&backgroundColor=0d0f14`,
      walletAddress: clean.length >= 30 ? clean : undefined,
      role: 'collector',
      isVerified: false,
      createdAt: new Date().toISOString(),
      profileCompleted: false
    };
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

// GET /api/users/following/mine - Get list of user IDs currently followed by viewer
usersRouter.get('/following/mine', (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.json({ followingIds: [] });
  }
  const database = db.get();
  const followingIds = (database.follows || [])
    .filter(f => f.followerId === req.user!.id)
    .map(f => f.followingId);

  res.json({ followingIds });
});

// POST /api/users/:id/follow - Follow a user
usersRouter.post('/:id/follow', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const targetId = req.params.id;

  if (targetId === user.id) {
    return res.status(400).json({ error: 'You cannot follow yourself.' });
  }

  const database = db.get();
  const targetUser = (database.users || []).find(u => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!Array.isArray(database.follows)) database.follows = [];
  const alreadyFollowing = database.follows.some(f => f.followerId === user.id && f.followingId === targetId);

  if (!alreadyFollowing) {
    database.follows.push({
      id: `flw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      followerId: user.id,
      followingId: targetId,
      createdAt: new Date().toISOString()
    });

    // Notify target user
    if (!Array.isArray(database.notifications)) database.notifications = [];
    database.notifications.push({
      id: `notif_${Date.now()}`,
      userId: targetId,
      title: 'New Follower',
      message: `@${user.username} is now following you`,
      type: 'follow',
      read: false,
      timestamp: new Date().toISOString(),
      actorId: user.id,
      actorUsername: user.username,
      actorAvatar: user.avatar,
      link: `user/${user.username}`
    });

    db.save(database);
  }

  res.json({ success: true, isFollowing: true });
});

// POST /api/users/:id/unfollow - Unfollow a user
usersRouter.post('/:id/unfollow', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const targetId = req.params.id;

  const database = db.get();
  if (Array.isArray(database.follows)) {
    database.follows = database.follows.filter(f => !(f.followerId === user.id && f.followingId === targetId));
    db.save(database);
  }

  res.json({ success: true, isFollowing: false });
});

