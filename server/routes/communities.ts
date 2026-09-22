import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { Community, CommunityMember, VerificationRequest } from '../../src/types';
import { isPrivilegedAccount, isExemptFromCooldowns, isPlatformOwner } from '../utils/privileges';
import { validateCommunityNameProtection } from '../utils/usernameProtection';

export const communitiesRouter = Router();

// Helper to check if user has platform owner or admin privileges
function isPlatformOwnerOrAdmin(user?: any): boolean {
  return isPrivilegedAccount(user);
}

// Helper to enrich community with current user's membership status
function enrichCommunity(community: Community, userId?: string, members: CommunityMember[] = []): Community {
  if (!userId) {
    return { ...community, isJoined: false, userRoleInCommunity: null, allowMemberPosts: community.allowMemberPosts ?? true };
  }
  const membership = members.find(m => m.communityId === community.id && m.userId === userId);
  return {
    ...community,
    allowMemberPosts: community.allowMemberPosts ?? true,
    isJoined: !!membership || community.creatorId === userId,
    userRoleInCommunity: membership ? membership.communityRole : (community.creatorId === userId ? 'owner' : null)
  };
}

// GET /api/communities/creation-status - Authoritative community creation cooldown status
communitiesRouter.get('/creation-status', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();

  if (isPlatformOwnerOrAdmin(user)) {
    return res.json({
      canCreate: true,
      isOwnerExempt: true,
      remainingSeconds: 0,
      cooldownEndsAt: null,
      cooldownHours: database.config?.communityCreationCooldownHours || 10
    });
  }

  const userCommunities = (database.communities || [])
    .filter(c => c.creatorId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const lastCreated = userCommunities[0];
  const cooldownHours = database.config?.communityCreationCooldownHours || 10;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  if (!lastCreated) {
    return res.json({
      canCreate: true,
      isOwnerExempt: false,
      remainingSeconds: 0,
      cooldownEndsAt: null,
      cooldownHours
    });
  }

  const timeSince = Date.now() - new Date(lastCreated.createdAt).getTime();
  if (timeSince >= cooldownMs) {
    return res.json({
      canCreate: true,
      isOwnerExempt: false,
      remainingSeconds: 0,
      cooldownEndsAt: null,
      cooldownHours
    });
  }

  const remainingMs = cooldownMs - timeSince;
  const cooldownEndsAt = new Date(Date.now() + remainingMs).toISOString();

  return res.json({
    canCreate: false,
    isOwnerExempt: false,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    cooldownEndsAt,
    cooldownHours
  });
});

// GET /api/communities - List communities
communitiesRouter.get('/', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const communities = database.communities || [];
  const members = database.communityMembers || [];
  const userId = req.user?.id;

  const enriched = communities.map(c => enrichCommunity(c, userId, members));
  res.json({ communities: enriched });
});

// POST /api/communities - Create a community
communitiesRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, handle, description, avatar, banner, category, collectionId, socialLinks, allowMemberPosts, postPermissionMode, postCooldownSeconds, joiningMode, aboutAnimation } = req.body;
  const user = req.user!;
  const database = db.get();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Community name is required' });
  }

  // Validate community name against protected MINT brand reservations
  const nameCheck = validateCommunityNameProtection(name.trim(), user);
  if (!nameCheck.allowed) {
    return res.status(400).json({ error: nameCheck.error || 'That community name is reserved by MINT.' });
  }

  if (handle) {
    const handleCheck = validateCommunityNameProtection(handle.trim(), user);
    if (!handleCheck.allowed) {
      return res.status(400).json({ error: handleCheck.error || 'That community name is reserved by MINT.' });
    }
  }

  // Authoritative Cooldown check for normal users (Privileged accounts are exempt)
  if (!isExemptFromCooldowns(user)) {
    const userCommunities = (database.communities || [])
      .filter(c => c.creatorId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const lastCreated = userCommunities[0];
    if (lastCreated) {
      const cooldownHours = database.config?.communityCreationCooldownHours || 10;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const timeSince = Date.now() - new Date(lastCreated.createdAt).getTime();

      if (timeSince < cooldownMs) {
        const remainingMs = cooldownMs - timeSince;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMinutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        return res.status(429).json({
          error: `Community creation cooldown active. You can create another community in ${remainingHours > 0 ? `${remainingHours}h ` : ''}${remainingMinutes}m.`
        });
      }
    }
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cleanHandle = handle ? `@${handle.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '')}` : `@${slug.replace(/-/g, '_')}`;

  if (!Array.isArray(database.communities)) database.communities = [];
  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  if (database.communities.some(c => c.slug === slug || (c.handle && c.handle.toLowerCase() === cleanHandle.toLowerCase()))) {
    return res.status(400).json({ error: 'A community with this name or @handle already exists' });
  }

  const defaultSpaces = [
    {
      id: `sp_${Date.now()}_gen`,
      communityId: '',
      name: 'General',
      slug: 'general',
      description: 'General community conversations and updates',
      icon: 'layers',
      isDefault: true,
      order: 1,
      createdAt: new Date().toISOString()
    }
  ];

  const newCommunity: Community = {
    id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    handle: cleanHandle,
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
    allowMemberPosts: allowMemberPosts !== undefined ? !!allowMemberPosts : true,
    postPermissionMode: postPermissionMode || 'everyone',
    postCooldownSeconds: postCooldownSeconds ?? 0,
    joiningMode: joiningMode || 'open',
    aboutAnimation: aboutAnimation || 'none',
    rules: ['Be respectful to fellow members', 'No spam or unauthorized promotional links', 'Keep conversations constructive'],
    spaces: defaultSpaces,
    roles: [],
    socialLinks: socialLinks || undefined,
    createdAt: new Date().toISOString()
  };

  newCommunity.spaces![0].communityId = newCommunity.id;

  // Add creator as owner member
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
    assignedRoleIds: [],
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

// PUT /api/communities/:id/members/:userId/role - Update community member role
communitiesRouter.put('/:id/members/:userId/role', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can update member roles' });
  }

  const { role } = req.body;
  if (!['moderator', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "moderator" or "member"' });
  }

  const targetMember = (database.communityMembers || []).find(
    m => m.communityId === community.id && m.userId === req.params.userId
  );

  if (!targetMember) {
    return res.status(404).json({ error: 'Member not found in this community' });
  }

  if (targetMember.userId === community.creatorId) {
    return res.status(400).json({ error: 'Cannot change the role of the community owner' });
  }

  targetMember.communityRole = role;
  db.save(database);

  res.json({ member: targetMember, success: true });
});

// DELETE /api/communities/:id/members/:userId - Remove member from community
communitiesRouter.delete('/:id/members/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  const isOwner = community.creatorId === user.id;
  const isPlatformStaff = isPlatformOwnerOrAdmin(user);
  const currentMember = (database.communityMembers || []).find(m => m.communityId === community.id && m.userId === user.id);
  const isMod = currentMember?.communityRole === 'moderator';

  if (!isOwner && !isPlatformStaff && !isMod) {
    return res.status(403).json({ error: 'Only community leaders can remove members' });
  }

  if (req.params.userId === community.creatorId) {
    return res.status(400).json({ error: 'Cannot remove the community owner' });
  }

  const memberIdx = (database.communityMembers || []).findIndex(
    m => m.communityId === community.id && m.userId === req.params.userId
  );

  if (memberIdx !== -1) {
    database.communityMembers.splice(memberIdx, 1);
    community.memberCount = Math.max(1, (community.memberCount || 1) - 1);
    db.save(database);
  }

  res.json({ success: true });
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
      communityRole: 'member',
      joinedAt: new Date().toISOString()
    };
    database.communityMembers.push(newMember);
    community.memberCount = (community.memberCount || 0) + 1;
    db.save(database);
  }

  res.json({ success: true, isJoined: true, memberCount: community.memberCount });
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
    return res.status(400).json({ error: 'The community creator cannot leave the community. You may delete it from settings if desired.' });
  }

  if (!Array.isArray(database.communityMembers)) database.communityMembers = [];

  const memberIdx = database.communityMembers.findIndex(
    m => m.communityId === community.id && m.userId === user.id
  );

  if (memberIdx !== -1) {
    database.communityMembers.splice(memberIdx, 1);
    community.memberCount = Math.max(1, (community.memberCount || 1) - 1);
    db.save(database);
  }

  res.json({ success: true, isJoined: false, memberCount: community.memberCount });
});

// GET /api/communities/:id/verification/status - Verification status for community
communitiesRouter.get('/:id/verification/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  const isOwner = community.creatorId === user.id;
  const isPlatformStaff = isPlatformOwnerOrAdmin(user);
  if (!isOwner && !isPlatformStaff) {
    return res.status(403).json({ error: 'Only the community creator can check or manage verification' });
  }

  const config = database.config?.verificationConfig || {
    maxVerifiedCommunitiesPerUser: 1,
    adminMultiCommunityAllowed: true
  };

  const existingVerifiedCommunities = (database.communities || []).filter(
    c => c.creatorId === user.id && c.isVerified && c.id !== community.id
  );

  const maxAllowed = isPlatformStaff && config.adminMultiCommunityAllowed ? 999 : (config.maxVerifiedCommunitiesPerUser || 1);
  const canRequestVerification = user.isVerified && (existingVerifiedCommunities.length < maxAllowed);

  const activeRequest = (database.verificationRequests || []).find(
    r => r.entityType === 'community' && r.communityId === community.id && r.status === 'under_review'
  ) || null;

  res.json({
    isVerified: !!community.isVerified,
    creatorIsVerified: !!user.isVerified || isPlatformStaff,
    canRequestVerification,
    maxAllowed,
    existingVerifiedCount: existingVerifiedCommunities.length,
    activeRequest
  });
});

// POST /api/communities/:id/verification/request - Submit verification for community
communitiesRouter.post('/:id/verification/request', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community creator can request verification' });
  }

  if (community.isVerified) {
    return res.status(400).json({ error: 'This community is already verified' });
  }

  if (!user.isVerified && !isPlatformOwnerOrAdmin(user)) {
    return res.status(400).json({ error: 'You must have a verified creator profile before requesting community verification.' });
  }

  const config = database.config?.verificationConfig || {
    maxVerifiedCommunitiesPerUser: 1,
    adminMultiCommunityAllowed: true
  };

  const isPlatformStaff = isPlatformOwnerOrAdmin(user);
  const existingVerifiedCommunities = (database.communities || []).filter(
    c => c.creatorId === user.id && c.isVerified && c.id !== community.id
  );

  const maxAllowed = isPlatformStaff && config.adminMultiCommunityAllowed ? 999 : (config.maxVerifiedCommunitiesPerUser || 1);

  if (existingVerifiedCommunities.length >= maxAllowed) {
    const verifiedName = existingVerifiedCommunities[0]?.name || 'another community';
    return res.status(400).json({
      error: `Platform Rule Restriction: Standard creators may have at most ${maxAllowed} verified community. You already have a verified community ("${verifiedName}"). Your other communities remain active but unverified.`
    });
  }

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

// PUT /api/communities/:id - Update community settings
communitiesRouter.put('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Only community creator or platform owner/admin can edit settings
  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can update settings' });
  }

  const {
    name,
    handle,
    description,
    avatar,
    banner,
    category,
    socialLinks,
    rules,
    allowMemberPosts,
    postPermissionMode,
    postCooldownSeconds,
    joiningMode,
    aboutAnimation,
    customLinks
  } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Community name cannot be empty' });
    }
    community.name = name.trim();
  }

  if (handle !== undefined) {
    const cleanHandle = `@${handle.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '')}`;
    const duplicate = (database.communities || []).find(
      c => c.id !== community.id && c.handle && c.handle.toLowerCase() === cleanHandle.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: `The handle ${cleanHandle} is already taken by another community.` });
    }
    community.handle = cleanHandle;
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

  if (aboutAnimation !== undefined) {
    community.aboutAnimation = aboutAnimation;
  }

  if (postPermissionMode !== undefined) {
    community.postPermissionMode = postPermissionMode;
  }

  if (postCooldownSeconds !== undefined) {
    community.postCooldownSeconds = Number(postCooldownSeconds) || 0;
  }

  if (joiningMode !== undefined) {
    community.joiningMode = joiningMode;
  }

  if (customLinks !== undefined && Array.isArray(customLinks)) {
    community.customLinks = customLinks;
  }

  if (socialLinks !== undefined) {
    community.socialLinks = socialLinks;
  }

  if (rules !== undefined && Array.isArray(rules)) {
    community.rules = rules.filter(r => typeof r === 'string' && r.trim());
  }

  if (allowMemberPosts !== undefined) {
    community.allowMemberPosts = !!allowMemberPosts;
  }

  db.save(database);

  const members = database.communityMembers || [];
  res.json({
    community: enrichCommunity(community, user.id, members),
    success: true
  });
});

// POST /api/communities/:id/roles - Create or update custom role
communitiesRouter.post('/:id/roles', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can manage roles' });
  }

  if (!Array.isArray(community.roles)) community.roles = [];

  const { id, name, description, color, fontStyle, icon, badgeUrl, animation, permissions } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  const roleId = id || `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const existingIdx = community.roles.findIndex(r => r.id === roleId);

  const roleObj = {
    id: roleId,
    communityId: community.id,
    name: name.trim(),
    description: description?.trim(),
    color: color || '#ff5500',
    fontStyle: fontStyle || 'default',
    icon: icon || 'award',
    badgeUrl: badgeUrl?.trim() || undefined,
    animation: animation || 'none',
    permissions: permissions || { canPostContent: true },
    createdAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    community.roles[existingIdx] = roleObj;
  } else {
    community.roles.push(roleObj);
  }

  db.save(database);
  res.json({ role: roleObj, roles: community.roles, success: true });
});

// DELETE /api/communities/:id/roles/:roleId - Delete a custom role
communitiesRouter.delete('/:id/roles/:roleId', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can delete roles' });
  }

  if (Array.isArray(community.roles)) {
    community.roles = community.roles.filter(r => r.id !== req.params.roleId);
  }

  // Remove this role from any members who had it assigned
  if (Array.isArray(database.communityMembers)) {
    database.communityMembers.forEach(m => {
      if (m.communityId === community.id && Array.isArray(m.assignedRoleIds)) {
        m.assignedRoleIds = m.assignedRoleIds.filter(rId => rId !== req.params.roleId);
      }
    });
  }

  db.save(database);
  res.json({ success: true, roles: community.roles });
});

// POST /api/communities/:id/roles/assign - Assign or unassign role to member
communitiesRouter.post('/:id/roles/assign', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { userId, roleId, assigned } = req.body;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can assign roles' });
  }

  const member = (database.communityMembers || []).find(
    m => m.communityId === community.id && m.userId === userId
  );

  if (!member) {
    return res.status(404).json({ error: 'Member not found in this community' });
  }

  if (!Array.isArray(member.assignedRoleIds)) {
    member.assignedRoleIds = [];
  }

  if (assigned) {
    if (!member.assignedRoleIds.includes(roleId)) {
      member.assignedRoleIds.push(roleId);
    }
  } else {
    member.assignedRoleIds = member.assignedRoleIds.filter(r => r !== roleId);
  }

  db.save(database);
  res.json({ success: true, member });
});

// POST /api/communities/:id/spaces - Create or update a Space
communitiesRouter.post('/:id/spaces', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can manage Spaces' });
  }

  if (!Array.isArray(community.spaces)) community.spaces = [];

  const { id, name, description, icon } = req.body;
  const cleanName = (name || '').trim().replace(/^#+/, '');

  if (!cleanName) {
    return res.status(400).json({ error: 'Space name is required' });
  }

  const spaceId = id || `space_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const existingIdx = community.spaces.findIndex(s => s.id === spaceId);

  const spaceObj = {
    id: spaceId,
    communityId: community.id,
    name: cleanName,
    slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: description?.trim(),
    icon: icon || 'layers',
    order: existingIdx !== -1 ? community.spaces[existingIdx].order : community.spaces.length + 1,
    createdAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    community.spaces[existingIdx] = spaceObj;
  } else {
    community.spaces.push(spaceObj);
  }

  db.save(database);
  res.json({ space: spaceObj, spaces: community.spaces, success: true });
});

// DELETE /api/communities/:id/spaces/:spaceId - Delete a Space
communitiesRouter.delete('/:id/spaces/:spaceId', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const community = (database.communities || []).find(c => c.id === req.params.id);

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can delete Spaces' });
  }

  if (Array.isArray(community.spaces)) {
    community.spaces = community.spaces.filter(s => s.id !== req.params.spaceId);
  }

  db.save(database);
  res.json({ success: true, spaces: community.spaces });
});

// DELETE /api/communities/:id - Delete a community (Owner only)
communitiesRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const communityIndex = (database.communities || []).findIndex(c => c.id === req.params.id);

  if (communityIndex === -1) {
    return res.status(404).json({ error: 'Community not found' });
  }

  const community = database.communities[communityIndex];
  if (community.creatorId !== user.id && !isPlatformOwnerOrAdmin(user)) {
    return res.status(403).json({ error: 'Only the community owner can delete this community' });
  }

  // Remove community
  database.communities.splice(communityIndex, 1);

  // Remove associated memberships
  database.communityMembers = (database.communityMembers || []).filter(m => m.communityId !== community.id);

  // Remove associated community posts and their comments/likes
  const deletedPosts = (database.posts || []).filter(p => p.communityId === community.id);
  const deletedPostIds = deletedPosts.map(p => p.id);
  database.posts = (database.posts || []).filter(p => p.communityId !== community.id);

  if (Array.isArray(database.comments)) {
    database.comments = database.comments.filter(c => !deletedPostIds.includes(c.postId));
  }
  if (Array.isArray(database.likes)) {
    database.likes = database.likes.filter(l => !(l.targetType === 'post' && deletedPostIds.includes(l.targetId)));
  }
  if (Array.isArray(database.verificationRequests)) {
    database.verificationRequests = database.verificationRequests.filter(r => r.communityId !== community.id);
  }

  db.save(database);
  res.json({ success: true, deletedCommunityId: community.id });
});
