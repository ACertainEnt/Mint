import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { Bounty, BountySubmission, ActivityEvent, Notification } from '../../src/types';

export const bountiesRouter = Router();

// Get bounties
bountiesRouter.get('/', (req, res) => {
  const { category, status, creatorId, sort } = req.query;
  const database = db.get();
  let bounties = [...database.bounties];

  if (category && typeof category === 'string') {
    bounties = bounties.filter(b => b.category === category);
  }

  if (status && typeof status === 'string') {
    bounties = bounties.filter(b => b.status === status);
  }

  if (creatorId && typeof creatorId === 'string') {
    bounties = bounties.filter(b => b.creatorId === creatorId || b.creatorUsername.toLowerCase() === creatorId.toLowerCase());
  }

  if (sort === 'reward_high') {
    bounties.sort((a, b) => b.reward - a.reward);
  } else if (sort === 'deadline_soon') {
    bounties.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  } else {
    // Newest
    bounties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ bounties });
});

// Get single bounty
bountiesRouter.get('/:id', (req, res) => {
  const database = db.get();
  const bounty = database.bounties.find(b => b.id === req.params.id);
  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  res.json({ bounty });
});

// Create bounty
bountiesRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { title, description, reward, deadlineDays, category, requirements } = req.body;

  if (!title || !description || !reward || !category) {
    return res.status(400).json({ error: 'Title, description, reward, and category are required' });
  }

  const database = db.get();
  const user = req.user!;
  const days = Number(deadlineDays) || 7;
  const deadline = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
  const bountyId = `bounty_${crypto.randomBytes(8).toString('hex')}`;

  const newBounty: Bounty = {
    id: bountyId,
    title: title.trim(),
    description: description.trim(),
    creatorId: user.id,
    creatorName: user.displayName,
    creatorUsername: user.username,
    creatorAvatar: user.avatar,
    creatorVerified: user.isVerified,
    reward: Number(reward),
    currency: 'SOL',
    deadline,
    category,
    requirements: Array.isArray(requirements) ? requirements.filter(r => r.trim().length > 0) : [],
    status: 'open',
    submissions: [],
    createdAt: new Date().toISOString()
  };

  database.bounties.push(newBounty);

  // Activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'bounty_created',
    nftName: newBounty.title,
    fromAddress: user.walletAddress || user.username,
    fromUsername: user.username,
    price: newBounty.reward,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.status(201).json({ bounty: newBounty });
});

// Submit work to bounty
bountiesRouter.post('/:id/submit', requireAuth, (req: AuthenticatedRequest, res) => {
  const { notes, previewUrl } = req.body;

  if (!notes && !previewUrl) {
    return res.status(400).json({ error: 'Submission notes or preview URL is required' });
  }

  const database = db.get();
  const bounty = database.bounties.find(b => b.id === req.params.id);
  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  if (bounty.status !== 'open' && bounty.status !== 'in_progress') {
    return res.status(400).json({ error: 'This bounty is no longer accepting submissions' });
  }

  const submitter = req.user!;
  if (bounty.creatorId === submitter.id) {
    return res.status(400).json({ error: 'Cannot submit to your own bounty' });
  }

  const submission: BountySubmission = {
    id: `sub_${Date.now()}`,
    submitterId: submitter.id,
    submitterUsername: submitter.username,
    submitterAddress: submitter.walletAddress || 'Solana_Devnet_Contributor',
    submitterAvatar: submitter.avatar,
    notes: notes?.trim() || '',
    previewUrl: previewUrl?.trim() || '',
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };

  bounty.submissions.unshift(submission);
  bounty.status = 'in_progress';

  // Notify bounty creator
  database.notifications.unshift({
    id: `notif_${Date.now()}_bounty_sub`,
    userId: bounty.creatorId,
    title: 'New Bounty Submission',
    message: `@${submitter.username} submitted work for "${bounty.title}".`,
    type: 'bounty_submission',
    read: false,
    link: `/bounties/${bounty.id}`,
    timestamp: new Date().toISOString()
  });

  db.save(database);
  res.status(201).json({ bounty, submission });
});

// Complete bounty & accept submission (Creator only)
bountiesRouter.post('/:id/complete', requireAuth, (req: AuthenticatedRequest, res) => {
  const { submissionId, payoutTxSignature } = req.body;

  if (!submissionId) {
    return res.status(400).json({ error: 'Submission ID is required' });
  }

  const database = db.get();
  const bounty = database.bounties.find(b => b.id === req.params.id);
  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  if (bounty.creatorId !== req.user!.id) {
    return res.status(403).json({ error: 'Only the bounty creator can complete and approve submissions' });
  }

  const sub = bounty.submissions.find(s => s.id === submissionId);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  sub.status = 'accepted';
  sub.payoutTxSignature = payoutTxSignature || `tx_payout_${crypto.randomBytes(8).toString('hex')}`;
  bounty.status = 'completed';
  bounty.winnerId = sub.submitterId;
  bounty.winnerAddress = sub.submitterAddress;

  // Mark others as rejected
  bounty.submissions.forEach(s => {
    if (s.id !== submissionId && s.status === 'pending') {
      s.status = 'rejected';
    }
  });

  // Notify winner
  database.notifications.unshift({
    id: `notif_${Date.now()}_bounty_win`,
    userId: sub.submitterId,
    title: 'Bounty Won & Paid!',
    message: `Your submission for "${bounty.title}" was accepted! You earned ${bounty.reward} SOL.`,
    type: 'bounty_completed',
    read: false,
    link: `/bounties/${bounty.id}`,
    timestamp: new Date().toISOString()
  });

  // Activity
  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'bounty_completed',
    nftName: bounty.title,
    fromAddress: bounty.creatorUsername,
    fromUsername: bounty.creatorUsername,
    toAddress: sub.submitterAddress,
    toUsername: sub.submitterUsername,
    price: bounty.reward,
    txSignature: sub.payoutTxSignature,
    timestamp: new Date().toISOString()
  };
  database.activity.unshift(act);

  db.save(database);
  res.json({ bounty, success: true });
});
