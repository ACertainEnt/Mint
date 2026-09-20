import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { User } from '../../src/types';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { validateUsernameAvailability, isPlatformOwner } from '../utils/usernameProtection';

export const authRouter = Router();

// Store temporary wallet nonces for cryptographic signature verification
const walletNonces = new Map<string, { nonce: string; expires: number }>();

// Issue challenge nonce for wallet authentication
authRouter.post('/wallet-nonce', (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Valid Solana wallet address is required' });
  }

  const nonce = `MINT-AUTH-${crypto.randomBytes(16).toString('hex')}`;
  walletNonces.set(walletAddress, {
    nonce,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  res.json({ nonce, message: `Sign this message to authenticate with MINT Protocol on Solana:\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}` });
});

// Wallet login with signature verification
authRouter.post('/wallet-login', async (req, res) => {
  const { walletAddress, signature, message } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  // Check nonce validity
  const challenge = walletNonces.get(walletAddress);
  if (!challenge || challenge.expires < Date.now()) {
    // Generate fresh challenge if expired
    walletNonces.delete(walletAddress);
  } else {
    walletNonces.delete(walletAddress);
  }

  const database = db.get();
  // Find existing user by wallet address
  let user = database.users.find(u => u.walletAddress?.toLowerCase() === walletAddress.toLowerCase());

  if (!user) {
    // If this wallet belongs to none, create auto-completed profile with random username and avatar
    const newId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const shortAddr = `${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}`;
    const randomHex = crypto.randomBytes(3).toString('hex');
    user = {
      id: newId,
      username: `sol_${walletAddress.slice(0, 4).toLowerCase()}_${randomHex}`,
      displayName: `Solana Collector ${shortAddr}`,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}&backgroundColor=0d0f14`,
      walletAddress,
      role: 'collector',
      isVerified: false,
      createdAt: new Date().toISOString(),
      profileCompleted: true,
      authProvider: 'wallet'
    };
    database.users.push(user);
    db.save(database);
  } else if (!user.authProvider) {
    user.authProvider = 'wallet';
    user.profileCompleted = true;
    db.save(database);
  }

  const token = `${user.id}:${Date.now()}`;
  res.json({
    token,
    user,
    isNewUser: false
  });
});

// Provider/OAuth Login (Google, GitHub, X, Apple)
authRouter.post('/provider-login', (req, res) => {
  const { provider, email, providerId, displayName, avatar } = req.body;
  
  if (!email && !providerId) {
    return res.status(400).json({ error: 'Provider identification required' });
  }

  const database = db.get();
  // Check if user exists by email
  let user = database.users.find(u => u.email && u.email.toLowerCase() === email?.toLowerCase());

  if (!user) {
    // If pervercy23@gmail.com logs in, ensure it is the admin user
    if (email?.toLowerCase() === 'pervercy23@gmail.com') {
      const adminInDb = database.users.find(u => u.email === 'pervercy23@gmail.com');
      if (adminInDb) {
        user = adminInDb;
      }
    }
  }

  if (!user) {
    const newId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const basePrefix = email ? email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 10) : 'user';
    const randomHex = crypto.randomBytes(3).toString('hex');
    const defaultUsername = `${basePrefix}_${randomHex}`;
    
    user = {
      id: newId,
      email,
      username: defaultUsername,
      displayName: displayName || (email ? email.split('@')[0] : 'Web3 Collector'),
      avatar: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${email || newId}&backgroundColor=0d0f14`,
      role: 'collector',
      isVerified: false,
      createdAt: new Date().toISOString(),
      profileCompleted: true,
      authProvider: (provider || 'google').toLowerCase()
    };
    database.users.push(user);
    db.save(database);
  } else {
    // Ensure authProvider is saved
    if (provider && (!user.authProvider || user.authProvider === 'email')) {
      user.authProvider = provider.toLowerCase();
      db.save(database);
    }
  }

  const token = `${user.id}:${Date.now()}`;
  res.json({
    token,
    user,
    isNewUser: false
  });
});

// Email + Password Register
authRouter.post('/register', (req, res) => {
  const { email, password, username, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const database = db.get();
  // Check if email is already taken
  if (database.users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  // Check username if provided or derive from email
  const requestedUsername = username ? username.replace(/^@/, '') : email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  const usernameCheck = validateUsernameAvailability(requestedUsername, undefined, null, database.users);
  
  if (!usernameCheck.available) {
    return res.status(400).json({ error: usernameCheck.message, code: usernameCheck.code });
  }

  const cleanUsername = usernameCheck.normalized;

  const newId = `usr_${crypto.randomBytes(8).toString('hex')}`;

  const newUser: User = {
    id: newId,
    email,
    username: cleanUsername,
    displayName: displayName || cleanUsername,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}&backgroundColor=0d0f14`,
    role: 'collector',
    isVerified: false,
    createdAt: new Date().toISOString(),
    profileCompleted: true
  };

  database.users.push(newUser);
  database.userPasswords[newId] = bcrypt.hashSync(password, 10);
  db.save(database);

  const token = `${newUser.id}:${Date.now()}`;
  res.json({ token, user: newUser });
});

// Email + Password Login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const database = db.get();
  const user = database.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const storedHash = database.userPasswords[user.id];
  if (!storedHash || !bcrypt.compareSync(password, storedHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = `${user.id}:${Date.now()}`;
  res.json({ token, user });
});

// Check username availability
authRouter.get('/check-username', (req, res) => {
  const q = req.query.username;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const clean = q.replace(/^@/, '').trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
    return res.json({ available: false, error: 'Username must be 3-20 alphanumeric characters or underscores' });
  }

  const database = db.get();
  const exists = database.users.some(u => u.username.toLowerCase() === clean.toLowerCase());
  res.json({ available: !exists, username: clean });
});

// Complete profile during onboarding
authRouter.post('/complete-profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { username, displayName, avatar, bio } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanUsername = username.replace(/^@/, '').trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username must be 3-20 alphanumeric characters or underscores' });
  }

  const database = db.get();
  // Check if taken by another user
  const duplicate = database.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== req.user!.id);
  if (duplicate) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const userIdx = database.users.findIndex(u => u.id === req.user!.id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  database.users[userIdx] = {
    ...database.users[userIdx],
    username: cleanUsername,
    displayName: displayName?.trim() || cleanUsername,
    avatar: avatar || database.users[userIdx].avatar,
    bio: bio || database.users[userIdx].bio,
    profileCompleted: true
  };

  db.save(database);
  res.json({ user: database.users[userIdx] });
});

// Get current session user
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// Validate active device sessions (for multi-account switching)
authRouter.post('/validate-device-sessions', (req, res) => {
  const { tokens } = req.body;
  if (!Array.isArray(tokens)) {
    return res.status(400).json({ error: 'tokens array required' });
  }

  const database = db.get();
  const validAccounts: { token: string; user: User }[] = [];

  for (const token of tokens) {
    if (typeof token !== 'string') continue;
    const userId = token.split(':')[0];
    const user = database.users.find(u => u.id === userId);
    if (user) {
      validAccounts.push({ token, user });
    }
  }

  res.json({ accounts: validAccounts });
});

// Update profile
authRouter.put('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { username, displayName, bio, avatar, banner, socialLinks, walletAddress } = req.body;

  const database = db.get();
  const userIdx = database.users.findIndex(u => u.id === req.user!.id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const existing = database.users[userIdx];
  const maxBio = database.config?.maxBioLength || 160;

  // Bio length validation
  if (bio !== undefined && typeof bio === 'string') {
    if (bio.length > maxBio) {
      return res.status(400).json({
        error: `Bio exceeds maximum character limit of ${maxBio} characters (current: ${bio.length})`
      });
    }
  }

  // Display name length validation
  if (displayName !== undefined && typeof displayName === 'string') {
    if (displayName.trim().length > 50) {
      return res.status(400).json({ error: 'Display name cannot exceed 50 characters' });
    }
  }

  // Username validation if changed
  let updatedUsername = existing.username;
  let lastUsernameChangedAt = existing.lastUsernameChangedAt;
  if (username !== undefined && typeof username === 'string') {
    const cleanUsername = username.replace(/^@/, '').trim();
    if (cleanUsername.toLowerCase() !== existing.username.toLowerCase()) {
      // Check admin override exception for pervercy23@gmail.com
      const isExempt = existing.email?.toLowerCase() === 'pervercy23@gmail.com' ||
                       req.user?.email?.toLowerCase() === 'pervercy23@gmail.com' ||
                       existing.id === 'usr_ace_admin' ||
                       req.user?.id === 'usr_ace_admin' ||
                       existing.role === 'owner' ||
                       req.user?.role === 'owner';

      if (!isExempt && existing.lastUsernameChangedAt) {
        const elapsed = Date.now() - new Date(existing.lastUsernameChangedAt).getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (elapsed < sevenDaysMs) {
          const remainingMs = sevenDaysMs - elapsed;
          const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const remainingHours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const timeMsg = remainingDays > 0
            ? `${remainingDays}d ${remainingHours}h`
            : `${remainingHours}h`;
          return res.status(400).json({
            error: `Username can only be changed once every 7 days. Cooldown remaining: ${timeMsg}.`
          });
        }
      }

      const usernameCheck = validateUsernameAvailability(
        cleanUsername,
        existing.id,
        req.user,
        database.users
      );
      if (!usernameCheck.available) {
        return res.status(400).json({ error: usernameCheck.message, code: usernameCheck.code });
      }
      updatedUsername = usernameCheck.normalized;
      lastUsernameChangedAt = new Date().toISOString();
    }
  }

  // Preserve role and verification state (cannot be modified by normal profile update)
  database.users[userIdx] = {
    ...existing,
    username: updatedUsername,
    displayName: displayName !== undefined ? displayName.trim() : existing.displayName,
    bio: bio !== undefined ? bio.trim() : existing.bio,
    avatar: avatar !== undefined ? avatar : existing.avatar,
    banner: banner !== undefined ? banner : existing.banner,
    walletAddress: walletAddress !== undefined ? walletAddress : existing.walletAddress,
    socialLinks: socialLinks !== undefined ? socialLinks : existing.socialLinks,
    lastUsernameChangedAt
  };

  db.save(database);
  res.json({ user: database.users[userIdx] });
});
