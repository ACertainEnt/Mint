import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth, requireAdmin } from '../middleware/auth';
import { WaitlistEntry, BetaCodeRecord } from '../../src/types';
import { firestoreSync } from '../services/firestoreSync';

export const waitlistAndBetaRouter = Router();

// Cryptographically secure beta code generator
function generateSecureBetaCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const getChunk = (len: number) => {
    const bytes = crypto.randomBytes(len);
    let str = '';
    for (let i = 0; i < len; i++) {
      str += chars[bytes[i] % chars.length];
    }
    return str;
  };
  return `MINT-BETA-${getChunk(4)}-${getChunk(4)}`;
}

// -------------------------------------------------------------
// WAITLIST ENDPOINTS
// -------------------------------------------------------------

// Anyone can join the waitlist
waitlistAndBetaRouter.post('/waitlist', async (req, res) => {
  const { email, walletAddress, roleInterest, notes } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  const normalizedEmail = trimmedEmail.toLowerCase();
  const database = db.get();
  if (!database.waitlist) database.waitlist = [];

  // Prevent duplicate submissions in-memory
  const existing = database.waitlist.find(w => w.normalizedEmail === normalizedEmail);
  if (existing) {
    return res.status(409).json({
      error: 'This email is already registered on the MINT waitlist.',
      alreadyRegistered: true
    });
  }

  // Derive deterministic document ID from normalized email
  const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24);
  const entryId = `wl_${emailHash}`;

  // Check Firestore for duplicate registration
  const existsInFirestore = await firestoreSync.checkWaitlistEntryExists(entryId);
  if (existsInFirestore) {
    return res.status(409).json({
      error: 'This email is already registered on the MINT waitlist.',
      alreadyRegistered: true
    });
  }

  const newEntry: WaitlistEntry = {
    id: entryId,
    email: trimmedEmail,
    normalizedEmail,
    walletAddress: walletAddress ? String(walletAddress).trim() : undefined,
    roleInterest: roleInterest ? String(roleInterest) as any : undefined,
    notes: notes ? String(notes).trim() : undefined,
    createdAt: new Date().toISOString(),
    hasRedeemedBeta: false
  };

  database.waitlist.unshift(newEntry);
  db.save(database);

  // Directly persist to Firestore
  await firestoreSync.saveWaitlistEntry(newEntry);

  res.status(201).json({
    success: true,
    message: "You're on the waitlist! We'll notify you as beta cohorts open.",
    entry: newEntry,
    position: database.waitlist.length
  });
});

// Admin-only: View waitlist submissions
waitlistAndBetaRouter.get('/waitlist', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const database = db.get();
  let waitlist = database.waitlist || [];

  // If Firestore is available, sync latest entries
  try {
    const firestoreEntries = await firestoreSync.getAllWaitlistEntries();
    if (firestoreEntries && firestoreEntries.length > 0) {
      const mergedMap = new Map<string, WaitlistEntry>();
      for (const entry of waitlist) {
        mergedMap.set(entry.normalizedEmail, entry);
      }
      for (const entry of firestoreEntries) {
        if (entry.normalizedEmail) {
          mergedMap.set(entry.normalizedEmail, { ...mergedMap.get(entry.normalizedEmail), ...entry });
        }
      }
      waitlist = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      database.waitlist = waitlist;
      db.save(database);
    }
  } catch (err) {
    console.warn('[Waitlist] Failed to read from Firestore for admin list:', err);
  }

  res.json({
    waitlist,
    totalCount: waitlist.length
  });
});

// -------------------------------------------------------------
// BETA ACCESS CODES ENDPOINTS
// -------------------------------------------------------------

// Authenticated users: Redeem a beta access code
waitlistAndBetaRouter.post('/beta/redeem', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Beta access code is required' });
  }

  const normalizedCode = code.trim().toUpperCase();
  const database = db.get();

  const record = (database.betaCodes || []).find(
    b => b.code.trim().toUpperCase() === normalizedCode
  );

  if (!record) {
    return res.status(404).json({ error: 'Invalid beta access code. Please verify and try again.' });
  }

  if (record.status === 'redeemed') {
    return res.status(400).json({ error: 'This beta access code has already been redeemed.' });
  }

  if (record.status === 'revoked') {
    return res.status(400).json({ error: 'This beta access code has been revoked.' });
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This beta access code has expired.' });
  }

  // If restricted to a specific email, verify authenticated user matches
  if (record.assignedEmail) {
    const userEmail = req.user!.email ? req.user!.email.trim().toLowerCase() : '';
    const assigned = record.assignedEmail.trim().toLowerCase();
    if (!userEmail || userEmail !== assigned) {
      return res.status(403).json({
        error: `This beta access code is designated for a specific email address (${record.assignedEmail}).`
      });
    }
  }

  // Atomically mark the code as redeemed
  const now = new Date().toISOString();
  record.status = 'redeemed';
  record.redeemedByUid = req.user!.firebaseUid || req.user!.id;
  record.redeemedByUserId = req.user!.id;
  record.redeemedAt = now;

  // Grant beta access to user profile
  const userIdx = database.users.findIndex(u => u.id === req.user!.id);
  if (userIdx !== -1) {
    database.users[userIdx].beta_access = true;
  }

  // Update waitlist entry if user's email was on the waitlist
  const userEmailNorm = req.user!.email ? req.user!.email.trim().toLowerCase() : '';
  const waitlistMatch = database.waitlist?.find(w => w.normalizedEmail === userEmailNorm);
  if (waitlistMatch) {
    waitlistMatch.hasRedeemedBeta = true;
    firestoreSync.saveWaitlistEntry(waitlistMatch).catch(console.warn);
  }

  db.save(database);

  // Sync to Firestore
  firestoreSync.saveBetaCode(record).catch(console.warn);
  if (userIdx !== -1) {
    firestoreSync.saveUserProfile(database.users[userIdx]).catch(console.warn);
  }

  const updatedUser = userIdx !== -1 ? database.users[userIdx] : req.user!;
  res.json({
    success: true,
    message: 'Beta access unlocked successfully! Welcome to MINT.',
    user: updatedUser
  });
});

// Admin-only: Generate one or more single-use beta access codes
waitlistAndBetaRouter.post('/beta/generate', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { assignedEmail, notes, expiresAt, count = 1 } = req.body;
  const numCodes = Math.min(Math.max(1, parseInt(String(count), 10) || 1), 20);

  const database = db.get();
  if (!database.betaCodes) database.betaCodes = [];

  const createdCodes: BetaCodeRecord[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < numCodes; i++) {
    // Generate unique code
    let uniqueCode = '';
    do {
      uniqueCode = generateSecureBetaCode();
    } while (database.betaCodes.some(b => b.code === uniqueCode));

    const record: BetaCodeRecord = {
      id: `beta_${crypto.randomBytes(6).toString('hex')}`,
      code: uniqueCode,
      status: 'unused',
      assignedEmail: (assignedEmail && typeof assignedEmail === 'string' && assignedEmail.trim())
        ? assignedEmail.trim().toLowerCase()
        : undefined,
      createdAt: now,
      expiresAt: (expiresAt && typeof expiresAt === 'string') ? expiresAt : undefined,
      createdById: req.user!.id,
      notes: notes ? String(notes).trim() : undefined
    };

    database.betaCodes.unshift(record);
    createdCodes.push(record);
    firestoreSync.saveBetaCode(record).catch(console.warn);
  }

  db.save(database);

  res.status(201).json({
    success: true,
    message: `Generated ${createdCodes.length} beta access code(s).`,
    codes: createdCodes,
    code: createdCodes[0] // for single generation convenience
  });
});

// Admin-only: List all beta codes
waitlistAndBetaRouter.get('/beta/codes', requireAdmin, (req: AuthenticatedRequest, res) => {
  const database = db.get();
  res.json({
    codes: database.betaCodes || []
  });
});

// Admin-only: Revoke an unused beta code
waitlistAndBetaRouter.post('/beta/revoke', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { codeId } = req.body;
  if (!codeId) {
    return res.status(400).json({ error: 'codeId is required' });
  }

  const database = db.get();
  const record = (database.betaCodes || []).find(b => b.id === codeId);
  if (!record) {
    return res.status(404).json({ error: 'Beta code not found' });
  }

  if (record.status === 'redeemed') {
    return res.status(400).json({ error: 'Cannot revoke an already-redeemed beta code' });
  }

  record.status = 'revoked';
  db.save(database);
  firestoreSync.saveBetaCode(record).catch(console.warn);

  res.json({ success: true, message: 'Beta code revoked', code: record });
});
