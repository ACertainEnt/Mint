import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { Community, CommunityMember, CommunityPost, VerificationRequest } from '../../src/types';

export const communitiesRouter = Router();

// Helper to enrich community with current user's membership status
function enrichCommunity(community: Community, userId?: string, members: CommunityMember[] = []): Community {
  if (!userId) {
    return { ...community, isJoined: false, userRoleInCommunity: null };
  }
  const membership = members.find(m => m.communityId === community.id && m.userId === userId);
  return {
    ...community,
    isJoined: !!membership || community.creatorId === userId,
    userRoleInCommunity: membership ? membership.communityRole : (community.creatorId === userId ? 'owner' : null)
  };
}

// GET /api/communities - List communities
communitiesRouter.get('/', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const communities = database.communities || [];
  const members = database.communityMembers || [];
  const userId = req.user?.id;

  const enriched = communities.map(c => enrichCommunity(c, userId, members));
  res.json({ communities: enriched });
});

// GET /api/communities/:id - Get community by ID or slug
communitiesRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const idOrSlug = req.params.id.toLowerCase();
  const community = (database.communities || []).find(
    c => c.id === req.params.id || c.slug.toLowerCase() === idOrSlug
  );
  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  const members = database.communityMembers || [];
  const enriched = enrichCommunity(community, req.user?.id, members);
  res.json({ community: enriched });
});

// POST /api/communities - Create a community
communitiesRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, description, avatar, banner, category, collectionId, socialLinks } = req.body;
  const user = req.user!;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Community name is required' });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const database = db.get();
  if (!Array.isArray(database.communities)) database.communities = [];
  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  if (database.communities.some(c => c.slug === slug)) {
    return res.status(400).json({ error: 'A community with this name/slug already exists' });
  }

  const newCommunity: Community = {
    id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    slug,
    description: (description || '').trim(),
    avatar: avatar || user.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80',
    banner: banner || user.banner,
    creatorId: user.id,
    creatorUsername: user.username,
    memberCount: 1,
    postCount: 0,
    isVerified: false,
    category: category || 'Art',
    collectionId: collectionId || undefined,
    socialLinks: socialLinks || undefined,
    createdAt: new Date().toISOString()
  };

  // Add owner to community members
  const ownerMember: CommunityMember = {
    id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    communityId: newCommunity.id,
    userId: user.id,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar,
      isVerified: !!user.isVerified,
      role: user.role
    },
    communityRole: 'owner',
    joinedAt: new Date().toISOString()
  };

  database.communities.unshift(newCommunity);
  database.communityMembers.push(ownerMember);
  db.save(database);

  res.status(201).json({
    community: {
      ...newCommunity,
      isJoined: true,
      userRoleInCommunity: 'owner'
    }
  });
});

// PUT /api/communities/:id - Update community settings
communitiesRouter.put('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Only community creator or platform admin can edit settings
  if (community.creatorId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the community owner can update settings' });
  }

  const { name, description, avatar, banner, category, socialLinks, rules } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Community name cannot be empty' });
    }
    community.name = name.trim();
  }

  if (description !== undefined) {
    community.description = (description || '').trim();
  }

  if (avatar !== undefined) {
    community.avatar = avatar;
  }

  if (banner !== undefined) {
    community.banner = banner;
  }

  if (category !== undefined) {
    community.category = category;
  }

  if (socialLinks !== undefined) {
    community.socialLinks = socialLinks;
  }

  if (rules !== undefined && Array.isArray(rules)) {
    community.rules = rules.filter(r => typeof r === 'string' && r.trim());
  }

  db.save(database);

  const members = database.communityMembers || [];
  res.json({
    community: enrichCommunity(community, user.id, members),
    success: true
  });
});

// GET /api/communities/:id/members - List members of a community
communitiesRouter.get('/:id/members', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  // Ensure owner is included in communityMembers if missing
  let members = database.communityMembers.filter(m => m.communityId === community.id);
  const hasOwner = members.some(m => m.userId === community.creatorId);
  if (!hasOwner) {
    const ownerUser = database.users.find(u => u.id === community.creatorId);
    if (ownerUser) {
      const ownerMember: CommunityMember = {
        id: `cm_${community.id}_owner`,
        communityId: community.id,
        userId: ownerUser.id,
        user: {
          id: ownerUser.id,
          username: ownerUser.username,
          displayName: ownerUser.displayName || ownerUser.username,
          avatar: ownerUser.avatar,
          isVerified: !!ownerUser.isVerified,
          role: ownerUser.role
        },
        communityRole: 'owner',
        joinedAt: community.createdAt
      };
      database.communityMembers.unshift(ownerMember);
      db.save(database);
      members = database.communityMembers.filter(m => m.communityId === community.id);
    }
  }

  // Enrich members with latest user data
  const enrichedMembers: CommunityMember[] = members.map(m => {
    const freshUser = database.users.find(u => u.id === m.userId);
    return {
      ...m,
      user: freshUser ? {
        id: freshUser.id,
        username: freshUser.username,
        displayName: freshUser.displayName || freshUser.username,
        avatar: freshUser.avatar,
        isVerified: !!freshUser.isVerified,
        role: freshUser.role
      } : m.user
    };
  });

  res.json({ members: enrichedMembers });
});

// POST /api/communities/:id/join - Join a community
communitiesRouter.post('/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  const existing = database.communityMembers.find(
    m => m.communityId === community.id && m.userId === user.id
  );

  if (!existing) {
    const newMember: CommunityMember = {
      id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      communityId: community.id,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        isVerified: !!user.isVerified,
        role: user.role
      },
      communityRole: community.creatorId === user.id ? 'owner' : 'member',
      joinedAt: new Date().toISOString()
    };
    database.communityMembers.push(newMember);
    community.memberCount = database.communityMembers.filter(m => m.communityId === community.id).length;
    db.save(database);
  }

  res.json({
    success: true,
    community: enrichCommunity(community, user.id, database.communityMembers)
  });
});

// POST /api/communities/:id/leave - Leave a community
communitiesRouter.post('/:id/leave', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId === user.id) {
    return res.status(400).json({ error: 'Community owner cannot leave their own community' });
  }

  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  database.communityMembers = database.communityMembers.filter(
    m => !(m.communityId === community.id && m.userId === user.id)
  );

  community.memberCount = database.communityMembers.filter(m => m.communityId === community.id).length;
  db.save(database);

  res.json({
    success: true,
    community: enrichCommunity(community, user.id, database.communityMembers)
  });
});

// PUT /api/communities/:id/members/:userId/role - Manage community member role (e.g. member -> moderator)
communitiesRouter.put('/:id/members/:userId/role', requireAuth, (req: AuthenticatedRequest, res) => {
  const operator = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Must be owner or admin
  if (community.creatorId !== operator.id && operator.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to manage member roles in this community' });
  }

  const { role } = req.body;
  if (!['moderator', 'member'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'moderator' or 'member'" });
  }

  const targetMember = (database.communityMembers || []).find(
    m => m.communityId === community.id && m.userId === req.params.userId
  );

  if (!targetMember) {
    return res.status(404).json({ error: 'Member not found in this community' });
  }

  if (targetMember.communityRole === 'owner') {
    return res.status(400).json({ error: 'Cannot change the role of the community owner' });
  }

  targetMember.communityRole = role;
  db.save(database);

  res.json({ success: true, member: targetMember });
});

// DELETE /api/communities/:id/members/:userId - Remove a member from the community
communitiesRouter.delete('/:id/members/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
  const operator = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Must be owner or admin
  if (community.creatorId !== operator.id && operator.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to remove members from this community' });
  }

  if (req.params.userId === community.creatorId) {
    return res.status(400).json({ error: 'Cannot remove the community owner' });
  }

  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  const previousCount = database.communityMembers.length;
  database.communityMembers = database.communityMembers.filter(
    m => !(m.communityId === community.id && m.userId === req.params.userId)
  );

  if (database.communityMembers.length === previousCount) {
    return res.status(404).json({ error: 'Member not found in community' });
  }

  community.memberCount = database.communityMembers.filter(m => m.communityId === community.id).length;
  db.save(database);

  res.json({ success: true });
});

// POST /api/communities/:id/verify-request - Request verification for a community
communitiesRouter.post('/:id/verify-request', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the community creator can request verification' });
  }

  if (community.isVerified) {
    return res.status(400).json({ error: 'This community is already verified' });
  }

  // 1. Requirement: User account itself must be verified
  if (!user.isVerified) {
    return res.status(400).json({
      error: 'Your user account must be verified before you can request verification for a community.'
    });
  }

  // 2. Verified community limit for normal users (1 verified community limit)
  const config = database.config?.verificationConfig || {
    maxVerifiedCommunitiesPerUser: 1,
    adminMultiCommunityAllowed: true
  };

  const isAdmin = user.role === 'admin';
  const existingVerifiedCommunities = (database.communities || []).filter(
    c => c.creatorId === user.id && c.isVerified && c.id !== community.id
  );

  const maxAllowed = isAdmin && config.adminMultiCommunityAllowed ? 999 : (config.maxVerifiedCommunitiesPerUser || 1);

  if (existingVerifiedCommunities.length >= maxAllowed) {
    const verifiedName = existingVerifiedCommunities[0]?.name || 'another community';
    return res.status(400).json({
      error: `Platform Rule Restriction: Standard creators may have at most ${maxAllowed} verified community. You already have a verified community ("${verifiedName}"). Your other communities remain active but unverified.`
    });
  }

  // Check pending requests
  if (!Array.isArray(database.verificationRequests)) database.verificationRequests = [];
  const existingPending = database.verificationRequests.find(
    r => r.entityType === 'community' && r.communityId === community.id && r.status === 'under_review'
  );
  if (existingPending) {
    return res.status(400).json({ error: 'A verification request for this community is already under review' });
  }

  const newRequest: VerificationRequest = {
    id: `vreq_${Date.now()}_com_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    username: user.username,
    userDisplayName: user.displayName,
    userAvatar: user.avatar,
    entityType: 'community',
    communityId: community.id,
    communityName: community.name,
    status: 'under_review',
    justification: req.body.justification?.trim() || `Community verification request for ${community.name}.`,
    submittedAt: new Date().toISOString()
  };

  database.verificationRequests.unshift(newRequest);
  db.save(database);
  res.status(201).json({ request: newRequest });
});

// GET /api/posts - Get community/feed posts
communitiesRouter.get('/feed/posts', (req: AuthenticatedRequest, res) => {
  const { communityId, authorId, tab } = req.query;
  const database = db.get();
  let posts = [...(database.posts || [])];

  if (communityId && typeof communityId === 'string') {
    posts = posts.filter(p => p.communityId === communityId);
  }

  if (authorId && typeof authorId === 'string') {
    posts = posts.filter(p => p.authorId === authorId);
  }

  // If tab === 'following' and user is logged in
  if (tab === 'following' && req.user) {
    const followingUserIds = (database.follows || [])
      .filter(f => f.followerId === req.user!.id)
      .map(f => f.followingId);
    
    posts = posts.filter(p => followingUserIds.includes(p.authorId));
  }

  // Check liked status for logged in user
  const userLikes = req.user ? (database.likes || []).filter(l => l.userId === req.user!.id && l.targetType === 'post').map(l => l.targetId) : [];

  const enrichedPosts = posts.map(p => ({
    ...p,
    likedByMe: userLikes.includes(p.id)
  }));

  res.json({ posts: enrichedPosts });
});

// POST /api/posts - Create a new post
communitiesRouter.post('/posts', requireAuth, (req: AuthenticatedRequest, res) => {
  const { content, communityId, mediaUrl, nftId } = req.body;
  const user = req.user!;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  const database = db.get();
  if (!Array.isArray(database.posts)) database.posts = [];

  let communityName: string | undefined;
  if (communityId) {
    const com = (database.communities || []).find(c => c.id === communityId);
    if (com) {
      communityName = com.name;
      com.postCount = (com.postCount || 0) + 1;
    }
  }

  let nftItem = undefined;
  if (nftId) {
    nftItem = database.nfts.find(n => n.id === nftId);
  }

  const newPost: CommunityPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    communityId: communityId || undefined,
    communityName,
    authorId: user.id,
    authorUsername: user.username,
    authorDisplayName: user.displayName || user.username,
    authorAvatar: user.avatar,
    authorVerified: user.isVerified || false,
    content: content.trim(),
    mediaUrl: mediaUrl || undefined,
    nftId: nftId || undefined,
    nft: nftItem,
    likes: 0,
    commentCount: 0,
    createdAt: new Date().toISOString()
  };

  database.posts.unshift(newPost);
  db.save(database);
  res.status(201).json({ post: newPost });
});
