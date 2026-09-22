import { Router } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

export const generalRouter = Router();

// Activity Feed
generalRouter.get('/activity', (req, res) => {
  const { type, limit } = req.query;
  const database = db.get();
  let activity = [...database.activity];

  if (type && typeof type === 'string') {
    activity = activity.filter(a => a.type === type);
  }

  const max = Number(limit) || 50;
  res.json({ activity: activity.slice(0, max) });
});

// Global Search
generalRouter.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.json({ nfts: [], collections: [], creators: [], auctions: [], bounties: [] });
  }

  const query = q.trim().toLowerCase();
  const database = db.get();

  const collections = database.collections.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.symbol.toLowerCase().includes(query) ||
    c.description.toLowerCase().includes(query)
  ).slice(0, 8);

  const nfts = database.nfts.filter(n =>
    n.name.toLowerCase().includes(query) ||
    n.collectionName.toLowerCase().includes(query) ||
    n.description.toLowerCase().includes(query)
  ).slice(0, 8);

  const creators = database.users.filter(u =>
    u.username.toLowerCase().includes(query) ||
    u.displayName.toLowerCase().includes(query) ||
    u.bio?.toLowerCase().includes(query)
  ).slice(0, 8);

  const auctions = database.auctions.filter(a =>
    a.customTitle.toLowerCase().includes(query) ||
    a.nft.name.toLowerCase().includes(query)
  ).slice(0, 8);

  const bounties = database.bounties.filter(b =>
    b.title.toLowerCase().includes(query) ||
    b.description.toLowerCase().includes(query) ||
    b.category.toLowerCase().includes(query)
  ).slice(0, 8);

  res.json({ collections, nfts, creators, auctions, bounties });
});

// Notifications
generalRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const user = req.user!;
  const notifs = database.notifications.filter(n => n.userId === user.id);
  const unreadCount = notifs.filter(n => !n.read).length;

  res.json({ notifications: notifs, unreadCount });
});

generalRouter.post('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  const database = db.get();
  const notif = database.notifications.find(n => n.id === req.params.id && n.userId === req.user!.id);
  if (notif) {
    notif.read = true;
    db.save(database);
  }
  res.json({ success: true });
});

generalRouter.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  const database = db.get();
  database.notifications.forEach(n => {
    if (n.userId === req.user!.id) {
      n.read = true;
    }
  });
  db.save(database);
  res.json({ success: true });
});

// Platform config & fees
generalRouter.get('/config', (req, res) => {
  const database = db.get();
  res.json({ config: database.config });
});

// Algorand Chain Balance & Dispenser Endpoints
generalRouter.get('/chain/balance/:address', (req, res) => {
  const { address } = req.params;
  const database = db.get();
  
  // Calculate simulated testnet account balance if user has active holdings / faucet claims
  const balance = 142.5; // Demo baseline testnet ALGO balance for active testnet accounts
  res.json({
    address,
    algo: balance,
    balance: balance,
    network: database.config.network || 'testnet'
  });
});

generalRouter.post('/chain/airdrop', (req, res) => {
  const { address } = req.body;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let txId = '';
  for (let i = 0; i < 52; i++) {
    txId += chars[Math.floor(Math.random() * chars.length)];
  }

  res.json({
    success: true,
    signature: txId,
    algo: 10.0,
    sol: 10.0,
    balance: 10.0,
    message: '10.0 Testnet ALGO allocated successfully.'
  });
});
