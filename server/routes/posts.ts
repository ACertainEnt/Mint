import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { CommunityPost, PostComment, Notification } from '../../src/types';
import { isPrivilegedAccount } from '../utils/privileges';

export const postsRouter = Router();

function isPlatformOwnerOrAdmin(user?: any): boolean {
  return isPrivilegedAccount(user);
}

// GET /feed/posts or /posts - Get community or general feed posts
postsRouter.get(['/feed/posts', '/posts', '/communities/feed/posts', '/communities/posts'], (req: AuthenticatedRequest, res) => {
  const { communityId, spaceId, authorId, tab } = req.query;
  const database = db.get();
  let posts = [...(database.posts || [])];

  if (communityId && typeof communityId === 'string') {
    // Isolated community feed
    posts = posts.filter(p => p.communityId === communityId);
    if (spaceId && typeof spaceId === 'string' && spaceId !== 'all') {
      posts = posts.filter(p => p.spaceId === spaceId);
    }
  } else if (authorId && typeof authorId === 'string') {
    // Profile posts by specific author
    posts = posts.filter(p => p.authorId === authorId);
  } else {
    // General Home / Discover feed: strictly preserve community isolation
    // Unless author explicitly set shareToHome === true
    posts = posts.filter(p => !p.communityId || p.shareToHome === true);
  }

  // If tab === 'following' and user is logged in
  if (tab === 'following' && req.user) {
    const followingUserIds = (database.follows || [])
      .filter(f => f.followerId === req.user!.id)
      .map(f => f.followingId);
    
    posts = posts.filter(p => followingUserIds.includes(p.authorId));
  }

  // Filter out private or followers-only posts if viewer is not authorized
  const viewerId = req.user?.id;
  const viewerFollowingIds = viewerId
    ? (database.follows || []).filter(f => f.followerId === viewerId).map(f => f.followingId)
    : [];

  posts = posts.filter(p => {
    if (!p.visibility || p.visibility === 'public') return true;
    if (viewerId && p.authorId === viewerId) return true; // Author can always see their own posts
    if (p.visibility === 'private') return false;
    if (p.visibility === 'followers') {
      return viewerFollowingIds.includes(p.authorId);
    }
    return true;
  });

  // Check liked status for logged in user
  const userLikes = req.user ? (database.likes || []).filter(l => l.userId === req.user!.id && l.targetType === 'post').map(l => l.targetId) : [];

  // Sort pinned posts first within a community feed or profile view
  if (communityId) {
    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (authorId) {
    posts.sort((a, b) => {
      if (a.isPinnedToProfile && !b.isPinnedToProfile) return -1;
      if (!a.isPinnedToProfile && b.isPinnedToProfile) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const enrichedPosts = posts.map(p => {
    let userVotedOptionId: string | undefined;
    if (p.poll && req.user) {
      for (const opt of p.poll.options) {
        if (opt.voterIds && opt.voterIds.includes(req.user.id)) {
          userVotedOptionId = opt.id;
          break;
        }
      }
    }

    return {
      ...p,
      likedByMe: userLikes.includes(p.id),
      poll: p.poll ? { ...p.poll, userVotedOptionId } : undefined
    };
  });

  res.json({ posts: enrichedPosts });
});

// POST /posts or /communities/posts - Create a new post
postsRouter.post(['/posts', '/communities/posts'], requireAuth, (req: AuthenticatedRequest, res) => {
  const { content, communityId, spaceId, mediaUrl, links, poll, shareToHome, nftId } = req.body;
  const user = req.user!;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  const database = db.get();
  if (!Array.isArray(database.posts)) database.posts = [];

  let communityName: string | undefined;
  let spaceName: string | undefined;
  let authorCommunityRole = undefined;

  if (communityId) {
    const com = (database.communities || []).find(c => c.id === communityId);
    if (!com) {
      return res.status(404).json({ error: 'Community not found' });
    }
    communityName = com.name;

    // Check Space if provided
    if (spaceId && com.spaces) {
      const sp = com.spaces.find(s => s.id === spaceId);
      if (sp) spaceName = sp.name;
    }

    // Check Community Member Posting Setting & Cooldown
    const isOwner = com.creatorId === user.id;
    const isPlatformStaff = isPlatformOwnerOrAdmin(user);
    const membership = (database.communityMembers || []).find(m => m.communityId === com.id && m.userId === user.id);
    const isLeader = membership?.communityRole === 'owner' || membership?.communityRole === 'moderator';

    if (com.allowMemberPosts === false || com.postPermissionMode === 'leaders_only') {
      if (!isOwner && !isPlatformStaff && !isLeader) {
        return res.status(403).json({ error: 'Posting in this community has been restricted to community leaders by the owner.' });
      }
    }

    // Check member's assigned role badge
    if (membership && membership.assignedRoleIds && membership.assignedRoleIds.length > 0 && com.roles) {
      const matchedRole = com.roles.find(r => membership.assignedRoleIds!.includes(r.id));
      if (matchedRole) authorCommunityRole = matchedRole;
    } else if (isOwner) {
      authorCommunityRole = {
        id: 'role_owner',
        communityId: com.id,
        name: 'Owner',
        color: '#ff5500',
        fontStyle: 'modern' as const,
        icon: 'crown',
        animation: 'none' as const,
        permissions: { canManageCommunity: true },
        createdAt: com.createdAt
      };
    }

    com.postCount = (com.postCount || 0) + 1;
  }

  let nftItem = undefined;
  if (nftId) {
    nftItem = database.nfts.find(n => n.id === nftId);
  }

  // Format Poll if provided
  let formattedPoll = undefined;
  if (poll && poll.question && Array.isArray(poll.options) && poll.options.length >= 2) {
    formattedPoll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: poll.question.trim(),
      options: poll.options.map((optText: string, idx: number) => ({
        id: `opt_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        text: typeof optText === 'string' ? optText.trim() : (optText as any).text,
        votes: 0,
        voterIds: []
      })),
      totalVotes: 0,
      createdAt: new Date().toISOString()
    };
  }

  const newPost: CommunityPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    communityId: communityId || undefined,
    communityName,
    spaceId: spaceId || undefined,
    spaceName,
    authorId: user.id,
    authorUsername: user.username,
    authorDisplayName: user.displayName || user.username,
    authorAvatar: user.avatar,
    authorVerified: user.isVerified || false,
    authorCommunityRole,
    content: content.trim(),
    mediaUrl: mediaUrl || undefined,
    links: Array.isArray(links) ? links : undefined,
    poll: formattedPoll,
    shareToHome: !!shareToHome,
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

// PUT /posts/:id/pin - Pin or unpin a post
postsRouter.put(['/posts/:id/pin', '/communities/posts/:id/pin'], requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const post = (database.posts || []).find(p => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!post.communityId) {
    return res.status(400).json({ error: 'Only community posts can be pinned.' });
  }

  const com = (database.communities || []).find(c => c.id === post.communityId);
  const membership = (database.communityMembers || []).find(m => m.communityId === post.communityId && m.userId === user.id);
  const isLeader = com?.creatorId === user.id || membership?.communityRole === 'moderator' || membership?.communityRole === 'owner' || isPlatformOwnerOrAdmin(user);

  if (!isLeader) {
    return res.status(403).json({ error: 'Only community leaders can pin posts.' });
  }

  post.isPinned = req.body.pinned !== undefined ? !!req.body.pinned : !post.isPinned;
  db.save(database);

  res.json({ success: true, post });
});

// POST /posts/:id/poll/vote - Vote on a post poll
postsRouter.post(['/posts/:id/poll/vote', '/communities/posts/:id/poll/vote'], requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { optionId } = req.body;
  const database = db.get();
  const post = (database.posts || []).find(p => p.id === req.params.id);

  if (!post || !post.poll) {
    return res.status(404).json({ error: 'Poll not found on this post' });
  }

  // Check if user already voted on any option
  for (const opt of post.poll.options) {
    if (opt.voterIds && opt.voterIds.includes(user.id)) {
      return res.status(400).json({ error: 'You have already voted on this poll.' });
    }
  }

  const targetOption = post.poll.options.find(o => o.id === optionId);
  if (!targetOption) {
    return res.status(404).json({ error: 'Poll option not found' });
  }

  if (!Array.isArray(targetOption.voterIds)) targetOption.voterIds = [];
  targetOption.voterIds.push(user.id);
  targetOption.votes += 1;
  post.poll.totalVotes = (post.poll.totalVotes || 0) + 1;

  db.save(database);
  res.json({ success: true, poll: post.poll, userVotedOptionId: optionId });
});

// PATCH /posts/:id or PUT /posts/:id - Edit post content, reply permissions, privacy, or pin to profile
const handleUpdatePost = (req: AuthenticatedRequest, res: any) => {
  const user = req.user!;
  const database = db.get();
  const post = (database.posts || []).find(p => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const isAuthor = post.authorId === user.id;
  const isPlatformStaff = isPlatformOwnerOrAdmin(user);

  if (!isAuthor && !isPlatformStaff) {
    return res.status(403).json({ error: 'You are not authorized to edit this post.' });
  }

  const { content, replyPermission, visibility, isPinnedToProfile } = req.body;

  if (content !== undefined) {
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }
    post.content = content.trim();
    post.editedAt = new Date().toISOString();
  }

  if (replyPermission !== undefined) {
    if (['everyone', 'following', 'mentioned', 'none'].includes(replyPermission)) {
      post.replyPermission = replyPermission;
    }
  }

  if (visibility !== undefined) {
    if (['public', 'followers', 'private'].includes(visibility)) {
      post.visibility = visibility;
    }
  }

  if (isPinnedToProfile !== undefined) {
    post.isPinnedToProfile = !!isPinnedToProfile;
  }

  db.save(database);
  res.json({ success: true, post });
};

postsRouter.patch(['/posts/:id', '/communities/posts/:id'], requireAuth, handleUpdatePost);
postsRouter.put(['/posts/:id', '/communities/posts/:id'], requireAuth, handleUpdatePost);

// DELETE /posts/:id - Delete a post (Own post, Community leader, or Platform Owner)
postsRouter.delete(['/posts/:id', '/communities/posts/:id'], requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const database = db.get();
  const postIndex = (database.posts || []).findIndex(p => p.id === req.params.id);

  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const post = database.posts[postIndex];
  let canDelete = post.authorId === user.id || isPlatformOwnerOrAdmin(user);

  if (!canDelete && post.communityId) {
    const community = (database.communities || []).find(c => c.id === post.communityId);
    const membership = (database.communityMembers || []).find(m => m.communityId === post.communityId && m.userId === user.id);
    if (community?.creatorId === user.id || membership?.communityRole === 'moderator' || membership?.communityRole === 'owner') {
      canDelete = true;
    }
  }

  if (!canDelete) {
    return res.status(403).json({ error: 'You are not authorized to delete this post.' });
  }

  // Remove post
  database.posts.splice(postIndex, 1);

  // Decrement community post count
  if (post.communityId) {
    const com = (database.communities || []).find(c => c.id === post.communityId);
    if (com && com.postCount > 0) {
      com.postCount = Math.max(0, com.postCount - 1);
    }
  }

  // Clean up comments and likes
  if (Array.isArray(database.comments)) {
    database.comments = database.comments.filter(c => c.postId !== post.id);
  }
  if (Array.isArray(database.likes)) {
    database.likes = database.likes.filter(l => !(l.targetType === 'post' && l.targetId === post.id));
  }

  db.save(database);
  res.json({ success: true, deletedPostId: post.id });
});

// GET /posts/:postId/comments - Get comments and replies for a post
postsRouter.get(['/posts/:postId/comments', '/communities/posts/:postId/comments'], (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const postId = req.params.postId;
  const post = (database.posts || []).find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!Array.isArray(database.comments)) database.comments = [];
  const allComments = database.comments.filter(c => c.postId === postId);

  const userLikes = req.user ? (database.likes || []).filter(l => l.userId === req.user!.id && l.targetType === 'comment').map(l => l.targetId) : [];

  // Build comment map with multi-level nesting support
  const commentMap = new Map<string, PostComment>();
  allComments.forEach(c => {
    commentMap.set(c.id, {
      ...c,
      likedByMe: userLikes.includes(c.id),
      replyCount: 0,
      replies: []
    });
  });

  const rootComments: PostComment[] = [];

  // Wire up parent-child relationships hierarchically
  allComments.forEach(c => {
    const enriched = commentMap.get(c.id)!;
    if (c.parentId && commentMap.has(c.parentId)) {
      const parent = commentMap.get(c.parentId)!;
      if (!parent.replies) parent.replies = [];
      parent.replies.push(enriched);
      parent.replyCount = (parent.replyCount || 0) + 1;
    } else {
      rootComments.push(enriched);
    }
  });

  // Sort recursively by createdAt
  const sortTree = (nodes: PostComment[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    nodes.forEach(node => {
      if (node.replies && node.replies.length > 0) {
        sortTree(node.replies);
      }
    });
  };

  sortTree(rootComments);

  res.json({
    comments: rootComments,
    totalCount: allComments.length,
    postAuthorId: post.authorId
  });
});

// POST /posts/:postId/comments - Add a comment or reply
postsRouter.post(['/posts/:postId/comments', '/communities/posts/:postId/comments'], requireAuth, (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  const parentId = req.body.parentId || req.body.parentCommentId;
  const user = req.user!;
  const postId = req.params.postId;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  const database = db.get();
  const post = (database.posts || []).find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!Array.isArray(database.comments)) database.comments = [];
  if (!Array.isArray(database.notifications)) database.notifications = [];

  let parentComment: PostComment | undefined;
  if (parentId) {
    parentComment = database.comments.find(c => c.id === parentId);
    if (!parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }
  }

  const newComment: PostComment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    postId,
    parentId: parentId || undefined,
    authorId: user.id,
    authorUsername: user.username,
    authorDisplayName: user.displayName || user.username,
    authorAvatar: user.avatar,
    authorVerified: user.isVerified || false,
    content: content.trim(),
    likes: 0,
    likedByMe: false,
    createdAt: new Date().toISOString()
  };

  database.comments.push(newComment);
  post.commentCount = (post.commentCount || 0) + 1;

  // Dispatches notifications avoiding self-actions and duplicates
  if (parentId && parentComment) {
    // Notify parent comment author if not self
    if (parentComment.authorId !== user.id) {
      const notif: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: parentComment.authorId,
        title: 'New Reply',
        message: `@${user.username} replied to your comment: "${newComment.content.slice(0, 40)}${newComment.content.length > 40 ? '...' : ''}"`,
        type: 'reply',
        read: false,
        link: `/posts/${postId}`,
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorUsername: user.username,
        actorAvatar: user.avatar,
        targetType: 'comment',
        targetId: newComment.id
      };
      database.notifications.unshift(notif);
    }

    // Also notify post author if post author is different from commenter and parent comment author
    if (post.authorId !== user.id && post.authorId !== parentComment.authorId) {
      const notif: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: post.authorId,
        title: 'New Reply in Thread',
        message: `@${user.username} replied to a comment on your post.`,
        type: 'reply',
        read: false,
        link: `/posts/${postId}`,
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorUsername: user.username,
        actorAvatar: user.avatar,
        targetType: 'post',
        targetId: post.id
      };
      database.notifications.unshift(notif);
    }
  } else {
    // Top-level comment: notify post author if not self
    if (post.authorId !== user.id) {
      const notif: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: post.authorId,
        title: 'New Comment',
        message: `@${user.username} commented on your post: "${newComment.content.slice(0, 40)}${newComment.content.length > 40 ? '...' : ''}"`,
        type: 'comment',
        read: false,
        link: `/posts/${postId}`,
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorUsername: user.username,
        actorAvatar: user.avatar,
        targetType: 'comment',
        targetId: newComment.id
      };
      database.notifications.unshift(notif);
    }
  }

  db.save(database);
  res.status(201).json({ comment: newComment });
});

// DELETE /posts/comments/:commentId & /posts/:postId/comments/:commentId - Delete a comment or reply
const handleDeleteComment = (req: AuthenticatedRequest, res: any) => {
  const user = req.user!;
  const database = db.get();
  const commentIndex = (database.comments || []).findIndex(c => c.id === req.params.commentId);

  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const comment = database.comments[commentIndex];
  const post = (database.posts || []).find(p => p.id === comment.postId);

  const isCommentAuthor = comment.authorId === user.id;
  const isPostAuthor = post && post.authorId === user.id;
  const isPlatformStaff = isPlatformOwnerOrAdmin(user);

  if (!isCommentAuthor && !isPostAuthor && !isPlatformStaff) {
    return res.status(403).json({ error: 'You are not authorized to delete this comment' });
  }

  // Recursively collect all descendant comment IDs (for multi-level replies)
  const getDescendantIds = (parentId: string): string[] => {
    const children = (database.comments || []).filter(c => c.parentId === parentId);
    let ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...getDescendantIds(child.id));
    }
    return ids;
  };

  const descendantIds = getDescendantIds(comment.id);
  const commentIdsToDelete = [comment.id, ...descendantIds];

  // Remove comments
  database.comments = database.comments.filter(c => !commentIdsToDelete.includes(c.id));

  // Decrement post comment count
  if (post && post.commentCount > 0) {
    post.commentCount = Math.max(0, post.commentCount - commentIdsToDelete.length);
  }

  // Remove associated likes
  if (Array.isArray(database.likes)) {
    database.likes = database.likes.filter(l => !(l.targetType === 'comment' && commentIdsToDelete.includes(l.targetId)));
  }

  db.save(database);
  res.json({ success: true, deletedCommentId: comment.id, deletedCount: commentIdsToDelete.length });
};

postsRouter.delete(['/posts/comments/:commentId', '/communities/posts/comments/:commentId'], requireAuth, handleDeleteComment);
postsRouter.delete(['/posts/:postId/comments/:commentId', '/communities/posts/:postId/comments/:commentId'], requireAuth, handleDeleteComment);
