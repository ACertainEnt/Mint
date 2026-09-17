import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { LikeRecord, Notification } from '../../src/types';

export const likesRouter = Router();

// GET /api/likes/my-likes - Get array of entity IDs liked by current user
likesRouter.get('/my-likes', (req: AuthenticatedRequest, res) => {
  const database = db.get();
  if (!req.user) {
    return res.json({ likedIds: [] });
  }

  const userLikes = (database.likes || [])
    .filter(l => l.userId === req.user!.id)
    .map(l => l.targetId);

  res.json({ likedIds: userLikes });
});

// POST /api/likes/toggle - Authoritative server-side like toggle with anti-duplicate and notification dispatch
likesRouter.post('/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  const { targetType, targetId } = req.body;
  const user = req.user!;

  if (!targetType || !targetId || typeof targetId !== 'string') {
    return res.status(400).json({ error: 'targetType and targetId are required' });
  }

  const validTypes = ['nft', 'collection', 'auction', 'post', 'bounty'];
  if (!validTypes.includes(targetType)) {
    return res.status(400).json({ error: `targetType must be one of: ${validTypes.join(', ')}` });
  }

  const database = db.get();
  if (!Array.isArray(database.likes)) database.likes = [];
  if (!Array.isArray(database.notifications)) database.notifications = [];

  // Check if like already exists for this user and target
  const existingIndex = database.likes.findIndex(
    l => l.userId === user.id && l.targetId === targetId && l.targetType === targetType
  );

  let targetOwnerId: string | undefined;
  let targetTitle = 'item';
  let targetLink: string | undefined;
  let currentLikes = 0;

  // Resolve target entity & current like count
  if (targetType === 'nft') {
    const nft = database.nfts.find(n => n.id === targetId);
    if (!nft) return res.status(404).json({ error: 'NFT not found' });
    targetOwnerId = nft.ownerId || nft.creatorId;
    targetTitle = 'NFT';
    targetLink = `/nft/${nft.id}`;
    
    if (existingIndex >= 0) {
      database.likes.splice(existingIndex, 1);
      nft.likes = Math.max(0, (nft.likes || 1) - 1);
      currentLikes = nft.likes;
      db.save(database);
      return res.json({ liked: false, likes: currentLikes });
    } else {
      const newLike: LikeRecord = {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        targetType: 'nft',
        targetId,
        createdAt: new Date().toISOString()
      };
      database.likes.push(newLike);
      nft.likes = (nft.likes || 0) + 1;
      currentLikes = nft.likes;
    }
  } else if (targetType === 'collection') {
    const col = database.collections.find(c => c.id === targetId);
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    targetOwnerId = col.creatorId;
    targetTitle = 'collection';
    targetLink = `/collection/${col.id}`;

    if (existingIndex >= 0) {
      database.likes.splice(existingIndex, 1);
      db.save(database);
      const count = database.likes.filter(l => l.targetId === targetId).length;
      return res.json({ liked: false, likes: count });
    } else {
      const newLike: LikeRecord = {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        targetType: 'collection',
        targetId,
        createdAt: new Date().toISOString()
      };
      database.likes.push(newLike);
      currentLikes = database.likes.filter(l => l.targetId === targetId).length;
    }
  } else if (targetType === 'auction') {
    const auc = database.auctions.find(a => a.id === targetId);
    if (!auc) return res.status(404).json({ error: 'Auction not found' });
    targetOwnerId = auc.creatorId;
    targetTitle = 'auction';
    targetLink = `/auctions/${auc.id}`;

    if (existingIndex >= 0) {
      database.likes.splice(existingIndex, 1);
      db.save(database);
      const count = database.likes.filter(l => l.targetId === targetId).length;
      return res.json({ liked: false, likes: count });
    } else {
      const newLike: LikeRecord = {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        targetType: 'auction',
        targetId,
        createdAt: new Date().toISOString()
      };
      database.likes.push(newLike);
      currentLikes = database.likes.filter(l => l.targetId === targetId).length;
    }
  } else if (targetType === 'post') {
    if (!Array.isArray(database.posts)) database.posts = [];
    const post = database.posts.find(p => p.id === targetId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    targetOwnerId = post.authorId;
    targetTitle = 'post';
    targetLink = `/communities`;

    if (existingIndex >= 0) {
      database.likes.splice(existingIndex, 1);
      post.likes = Math.max(0, (post.likes || 1) - 1);
      currentLikes = post.likes;
      db.save(database);
      return res.json({ liked: false, likes: currentLikes });
    } else {
      const newLike: LikeRecord = {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        targetType: 'post',
        targetId,
        createdAt: new Date().toISOString()
      };
      database.likes.push(newLike);
      post.likes = (post.likes || 0) + 1;
      currentLikes = post.likes;
    }
  } else if (targetType === 'bounty') {
    const bounty = database.bounties.find(b => b.id === targetId);
    if (!bounty) return res.status(404).json({ error: 'Bounty not found' });
    targetOwnerId = bounty.creatorId;
    targetTitle = 'bounty';
    targetLink = `/bounties/${bounty.id}`;

    if (existingIndex >= 0) {
      database.likes.splice(existingIndex, 1);
      db.save(database);
      const count = database.likes.filter(l => l.targetId === targetId).length;
      return res.json({ liked: false, likes: count });
    } else {
      const newLike: LikeRecord = {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        targetType: 'bounty',
        targetId,
        createdAt: new Date().toISOString()
      };
      database.likes.push(newLike);
      currentLikes = database.likes.filter(l => l.targetId === targetId).length;
    }
  }

  // SELF-LIKE EXCEPTION:
  // If the owner/creator likes their OWN content, do NOT create a notification for the owner.
  // Otherwise, notify the content owner.
  if (targetOwnerId && targetOwnerId !== user.id) {
    // Avoid duplicate recent notification from rapid unliking/liking
    const existingNotif = database.notifications.find(
      n => n.userId === targetOwnerId &&
           n.type === 'like' &&
           n.targetId === targetId &&
           n.actorId === user.id
    );

    if (!existingNotif) {
      const notif: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: targetOwnerId,
        title: 'New Like',
        message: `@${user.username} liked your ${targetTitle}.`,
        type: 'like',
        read: false,
        link: targetLink,
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorUsername: user.username,
        actorAvatar: user.avatar,
        targetType,
        targetId
      };
      database.notifications.unshift(notif);
    }
  }

  db.save(database);
  res.json({ liked: true, likes: currentLikes });
});
