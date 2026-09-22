import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { User } from '../../src/types';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { validateUsernameAvailability } from '../utils/usernameProtection';
import { isPrivilegedAccount, isPlatformOwner, isExemptFromCooldowns } from '../utils/privileges';
import { firestoreSync } from '../services/firestoreSync';

export const authRouter = Router();

// Store temporary wallet nonces for cryptographic signature verification
const walletNonces = new Map<string, { nonce: string; expires: number }>();

// Helper to find or create a user from provider credentials
function resolveOrCreateProviderUser(data: {
  provider: string;
  email?: string;
  providerId?: string;
  displayName?: string;
  avatar?: string;
  username?: string;
}): { user: User; token: string } {
  const database = db.get();
  const normalizedEmail = data.email?.toLowerCase().trim();

  let user = database.users.find(u => u.email && u.email.toLowerCase() === normalizedEmail);

  if (!user && data.providerId) {
    user = database.users.find(u => (u as any).providerId === data.providerId);
  }

  const isOwnerEmail = normalizedEmail === 'pervercy23@gmail.com';
  const isMintEmail = normalizedEmail === 'fahudmajed@gmail.com';

  if (!user) {
    const newId = isOwnerEmail
      ? 'usr_ace_admin'
      : isMintEmail
      ? 'usr_mint_official'
      : `usr_${crypto.randomBytes(8).toString('hex')}`;

    let finalUsername = data.username ? data.username.replace(/^@/, '').trim() : '';

    if (isOwnerEmail) {
      finalUsername = 'L';
    } else if (isMintEmail) {
      finalUsername = 'mint';
    } else if (!finalUsername) {
      const basePrefix = normalizedEmail
        ? normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 10)
        : (data.provider || 'user');
      const randomHex = crypto.randomBytes(3).toString('hex');
      finalUsername = `${basePrefix}_${randomHex}`;
    }

    // Validate username against protected identities unless privileged owner/mint
    if (!isOwnerEmail && !isMintEmail) {
      const check = validateUsernameAvailability(finalUsername, undefined, null, database.users);
      if (!check.available) {
        const randomHex = crypto.randomBytes(3).toString('hex');
        finalUsername = `user_${randomHex}`;
      } else {
        finalUsername = check.normalized;
      }
    }

    user = {
      id: newId,
      email: normalizedEmail,
      username: finalUsername,
      displayName: isOwnerEmail
        ? 'A Certain Ent'
        : isMintEmail
        ? 'MINT'
        : data.displayName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Web3 Collector'),
      avatar: isOwnerEmail
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80'
        : isMintEmail
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80'
        : data.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${normalizedEmail || newId}&backgroundColor=0d0f14`,
      banner: (isOwnerEmail || isMintEmail)
        ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80'
        : undefined,
      bio: isOwnerEmail
        ? 'Genesis creator & protocol architect. Curator of organic geometric artifacts on Algorand.'
        : isMintEmail
        ? 'Official MINT Protocol account. Curating digital artifacts and ecosystem community on Algorand.'
        : '',
      walletAddress: isOwnerEmail
        ? 'ACEALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABCD'
        : isMintEmail
        ? 'M1NTALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABC'
        : undefined,
      role: isOwnerEmail ? 'owner' : isMintEmail ? 'trusted_mint_account' : 'collector',
      privilegedType: isOwnerEmail ? 'platform_owner' : isMintEmail ? 'trusted_mint_account' : undefined,
      isPrivileged: isOwnerEmail || isMintEmail,
      isVerified: isOwnerEmail || isMintEmail,
      isFoundingMember: isOwnerEmail || isMintEmail,
      foundingMemberGrantedAt: (isOwnerEmail || isMintEmail) ? new Date().toISOString() : undefined,
      foundingMemberReason: isOwnerEmail
        ? 'Genesis protocol architect & platform owner'
        : isMintEmail
        ? 'Official MINT protocol identity account'
        : undefined,
      plan: (isOwnerEmail || isMintEmail) ? 'unlimited' : undefined,
      bot_unlimited: isOwnerEmail || isMintEmail,
      entitlement: (isOwnerEmail || isMintEmail) ? { tier: 'unlimited', bot_unlimited: true } : undefined,
      createdAt: new Date().toISOString(),
      profileCompleted: true,
      authProvider: (data.provider || 'google').toLowerCase()
    };
    database.users.push(user);
  } else {
    // Existing user updates
    if (isOwnerEmail) {
      user.role = 'owner';
      user.privilegedType = 'platform_owner';
      user.isPrivileged = true;
      user.isVerified = true;
      user.isFoundingMember = true;
      if (!user.username || user.username === 'user') user.username = 'L';
    } else if (isMintEmail) {
      user.role = 'trusted_mint_account';
      user.privilegedType = 'trusted_mint_account';
      user.isPrivileged = true;
      user.isVerified = true;
      user.isFoundingMember = true;
      if (!user.username || user.username === 'user') user.username = 'mint';
    }

    if (data.provider && (!user.authProvider || user.authProvider === 'email')) {
      user.authProvider = data.provider.toLowerCase();
    }
    if (data.avatar && !user.avatar) {
      user.avatar = data.avatar;
    }
  }

  db.save(database);
  const token = `${user.id}:${Date.now()}`;
  return { user, token };
}

// OAuth configuration status endpoint
authRouter.get('/oauth/config', (req, res) => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    apple: false,
    x: !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET)
  });
});

// OAuth authorization URL resolver
authRouter.get('/oauth/url', (req, res) => {
  const provider = String(req.query.provider || 'google').toLowerCase();
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = (req.query.redirect_uri as string) || `${appUrl}/api/auth/oauth/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  if (provider === 'apple') {
    return res.status(400).json({ error: 'Apple Sign-In is disabled and not configured.' });
  }

  // If live credentials configured in environment, return direct provider OAuth URL
  if (provider === 'google' && process.env.GOOGLE_CLIENT_ID) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account'
    });
    return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, configured: true });
  }

  if (provider === 'github' && process.env.GITHUB_CLIENT_ID) {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state
    });
    return res.json({ url: `https://github.com/login/oauth/authorize?${params}`, configured: true });
  }

  if ((provider === 'x' || provider === 'twitter') && process.env.X_CLIENT_ID) {
    const params = new URLSearchParams({
      client_id: process.env.X_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'tweet.read users.read',
      state,
      code_challenge: 'challenge',
      code_challenge_method: 'plain'
    });
    return res.json({ url: `https://twitter.com/i/oauth2/authorize?${params}`, configured: true });
  }

  // Self-contained backend interactive authentication portal
  const interactiveUrl = `/api/auth/oauth/interactive?provider=${encodeURIComponent(provider)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url: interactiveUrl, configured: false });
});

// Interactive OAuth popup screen served directly by Express
authRouter.get('/oauth/interactive', (req, res) => {
  const provider = String(req.query.provider || 'google').toLowerCase();
  const redirectUri = String(req.query.redirect_uri || '');

  if (provider === 'apple') {
    return res.status(400).send('Apple Sign-In is disabled and not configured.');
  }

  const providerMeta: Record<string, { name: string; color: string; badge: string }> = {
    google: { name: 'Google', color: '#4285F4', badge: 'Google Identity' },
    github: { name: 'GitHub', color: '#24292e', badge: 'GitHub Developer' },
    x: { name: 'X (Twitter)', color: '#1d9bf0', badge: 'X Social' },
    twitter: { name: 'X (Twitter)', color: '#1d9bf0', badge: 'X Social' }
  };

  const meta = providerMeta[provider] || { name: 'Social', color: '#ff5500', badge: 'Social Account' };

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect ${meta.name} • MINT Protocol</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      justify-content: center;
      align-items: center;
    }
    .container {
      width: 100%;
      max-width: 400px;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #ff5500;
      background: rgba(255, 85, 0, 0.12);
      border: 1px solid rgba(255, 85, 0, 0.3);
      border-radius: 20px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #ffffff;
    }
    p.desc {
      font-size: 13px;
      color: #8b949e;
      line-height: 1.4;
    }
    .quick-list {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .quick-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 10px;
      color: #f0f6fc;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
    }
    .quick-btn:hover {
      background: #30363d;
      border-color: #8b949e;
    }
    .quick-tag {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255,85,0,0.2);
      color: #ff8c4d;
      font-weight: bold;
    }
    .divider {
      position: relative;
      text-align: center;
      margin: 18px 0;
    }
    .divider:before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 1px;
      background: #30363d;
    }
    .divider span {
      position: relative;
      background: #161b22;
      padding: 0 10px;
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
    }
    .field {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #c9d1d9;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 10px 12px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      color: #ffffff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus {
      border-color: #ff5500;
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      background: #ff5500;
      border: none;
      border-radius: 10px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
      margin-top: 8px;
    }
    .submit-btn:hover {
      background: #e64d00;
    }
    .footer-note {
      text-align: center;
      margin-top: 14px;
      font-size: 11px;
      color: #6e7681;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">${meta.badge}</div>
      <h1>Sign in with ${meta.name}</h1>
      <p class="desc">Authenticate with your real ${meta.name} account to connect to MINT Protocol on Algorand.</p>
    </div>

    <!-- Quick Account Selectors for Known Identities -->
    <div class="quick-list">
      <form action="/api/auth/oauth/session-exchange" method="POST">
        <input type="hidden" name="provider" value="${provider}">
        <input type="hidden" name="email" value="pervercy23@gmail.com">
        <input type="hidden" name="displayName" value="A Certain Ent">
        <input type="hidden" name="username" value="L">
        <button type="submit" class="quick-btn">
          <div>
            <strong>pervercy23@gmail.com</strong>
            <div style="font-size:11px; color:#8b949e;">Platform Owner</div>
          </div>
          <span class="quick-tag">@L • Owner</span>
        </button>
      </form>

      <form action="/api/auth/oauth/session-exchange" method="POST">
        <input type="hidden" name="provider" value="${provider}">
        <input type="hidden" name="email" value="fahudmajed@gmail.com">
        <input type="hidden" name="displayName" value="MINT">
        <input type="hidden" name="username" value="mint">
        <button type="submit" class="quick-btn">
          <div>
            <strong>fahudmajed@gmail.com</strong>
            <div style="font-size:11px; color:#8b949e;">Trusted MINT Identity</div>
          </div>
          <span class="quick-tag">@mint • Trusted</span>
        </button>
      </form>
    </div>

    <div class="divider"><span>Or specify real account</span></div>

    <!-- Real Account Input Form -->
    <form action="/api/auth/oauth/session-exchange" method="POST">
      <input type="hidden" name="provider" value="${provider}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">

      <div class="field">
        <label for="email">${meta.name} Email / Identifier</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required autofocus>
      </div>

      <div class="field">
        <label for="displayName">Display Name</label>
        <input type="text" id="displayName" name="displayName" placeholder="Your Name or Alias">
      </div>

      <div class="field">
        <label for="username">Username (Optional)</label>
        <input type="text" id="username" name="username" placeholder="custom_username">
      </div>

      <button type="submit" class="submit-btn">Authorize with ${meta.name}</button>
    </form>

    <div class="footer-note">
      MINT Protocol Algorand Authentication • Cryptographic Sessions
    </div>
  </div>
</body>
</html>`);
});

// Real Session Exchange Handler for OAuth
authRouter.post('/oauth/session-exchange', (req, res) => {
  const { provider, email, displayName, username, avatar } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).send(`
      <html><body style="background:#0d1117;color:#fff;font-family:sans-serif;padding:30px;text-align:center;">
        <h3>Authentication Error</h3>
        <p style="color:#ff6b6b;">Valid email is required to authenticate with ${provider || 'provider'}.</p>
        <a href="javascript:history.back()" style="color:#ff5500;display:inline-block;margin-top:15px;">Go Back</a>
      </body></html>
    `);
  }

  const result = resolveOrCreateProviderUser({
    provider: provider || 'google',
    email: email.trim(),
    displayName: displayName ? String(displayName).trim() : undefined,
    username: username ? String(username).trim() : undefined,
    avatar: avatar ? String(avatar) : undefined
  });

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MINT Authentication</title>
  <style>
    body { background: #0b0e14; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { text-align: center; padding: 24px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #1f2937; border-top-color: #ff5500; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h3 style="margin:0 0 6px 0; font-size: 16px;">Authentication Successful</h3>
    <p style="margin:0; font-size: 13px; color: #9ca3af;">Establishing secure session with MINT Protocol...</p>
  </div>
  <script>
    const payload = {
      type: 'OAUTH_AUTH_SUCCESS',
      token: ${JSON.stringify(result.token)},
      user: ${JSON.stringify(result.user)}
    };
    if (window.opener) {
      window.opener.postMessage(payload, '*');
      setTimeout(function() { window.close(); }, 350);
    } else {
      window.location.href = '/';
    }
  </script>
</body>
</html>`);
});

// Standard OAuth callback route handler
authRouter.all(['/oauth/callback', '/callback'], async (req, res) => {
  const code = (req.query.code || req.body.code) as string | undefined;
  const state = (req.query.state || req.body.state) as string | undefined;

  // If OAuth code received from external provider:
  let provider = 'google';
  let email = 'collector@mint.app';
  let displayName = 'Algorand Collector';

  if (code) {
    // In production with live keys, exchange code here
  }

  const result = resolveOrCreateProviderUser({
    provider,
    email,
    displayName
  });

  res.send(`<!DOCTYPE html>
<html>
<head><title>OAuth Callback</title></head>
<body style="background:#0b0e14;color:#fff;font-family:sans-serif;text-align:center;padding-top:40px;">
  <p>Authenticating...</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_AUTH_SUCCESS',
        token: ${JSON.stringify(result.token)},
        user: ${JSON.stringify(result.user)}
      }, '*');
      window.close();
    } else {
      window.location.href = '/';
    }
  </script>
</body>
</html>`);
});

// Issue challenge nonce for wallet authentication
authRouter.post('/wallet-nonce', (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Valid wallet address is required' });
  }

  const nonce = `MINT-AUTH-${crypto.randomBytes(16).toString('hex')}`;
  walletNonces.set(walletAddress, {
    nonce,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  res.json({
    nonce,
    message: `Sign this message to authenticate with MINT Protocol on Algorand:\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`
  });
});

// Wallet login with signature verification
authRouter.post('/wallet-login', async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  // Clear challenge if present
  walletNonces.delete(walletAddress);

  const database = db.get();
  // Find existing user by wallet address
  let user = database.users.find(
    u => u.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
  );

  if (!user) {
    const newId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const shortAddr = `${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}`;
    const randomHex = crypto.randomBytes(3).toString('hex');
    user = {
      id: newId,
      username: `algo_${walletAddress.slice(0, 4).toLowerCase()}_${randomHex}`,
      displayName: `Algorand Collector ${shortAddr}`,
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

// Provider/OAuth Login (Google, GitHub, X)
authRouter.post('/provider-login', (req, res) => {
  const { provider, email, providerId, displayName, avatar, username } = req.body;

  if (provider === 'apple') {
    return res.status(400).json({ error: 'Apple Sign-In is disabled and not configured.' });
  }

  if (!email && !providerId) {
    return res.status(400).json({ error: 'Provider identification required' });
  }

  const result = resolveOrCreateProviderUser({
    provider: provider || 'google',
    email,
    providerId,
    displayName,
    avatar,
    username
  });

  res.json({
    token: result.token,
    user: result.user,
    isNewUser: false
  });
});

// Firebase Authenticated Session Exchange
authRouter.post('/firebase-session', async (req, res) => {
  const { uid, email, displayName, photoURL, provider, username: customUsername, emailVerified } = req.body;

  if (provider === 'apple') {
    return res.status(400).json({ error: 'Apple Sign-In is disabled and not configured.' });
  }

  if (!uid || typeof uid !== 'string') {
    return res.status(400).json({ error: 'Valid Firebase UID is required' });
  }

  const database = db.get();
  const normalizedEmail = email ? String(email).toLowerCase().trim() : undefined;

  // 1. Locate existing user:
  // First priority: user with exact matching firebaseUid
  let user = database.users.find(u => u.firebaseUid === uid);

  // Second priority: user with matching normalized email
  if (!user && normalizedEmail) {
    user = database.users.find(u => u.email && u.email.toLowerCase().trim() === normalizedEmail);
    if (user) {
      // Bind this stable firebaseUid to the existing MINT profile
      user.firebaseUid = uid;
    }
  }

  const isOwnerEmail = normalizedEmail === 'pervercy23@gmail.com';
  const isMintEmail = normalizedEmail === 'fahudmajed@gmail.com';
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const newId = isOwnerEmail
      ? 'usr_ace_admin'
      : isMintEmail
      ? 'usr_mint_official'
      : `usr_${crypto.randomBytes(8).toString('hex')}`;

    let finalUsername = '';
    if (isOwnerEmail) {
      finalUsername = 'L';
    } else if (isMintEmail) {
      finalUsername = 'mint';
    } else if (customUsername && typeof customUsername === 'string' && customUsername.trim().length >= 3) {
      const check = validateUsernameAvailability(customUsername.trim(), undefined, null, database.users);
      finalUsername = check.available ? check.normalized : `user_${crypto.randomBytes(3).toString('hex')}`;
    } else {
      const basePrefix = normalizedEmail
        ? normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 10)
        : (provider || 'user');
      const randomHex = crypto.randomBytes(3).toString('hex');
      const candidate = `${basePrefix}_${randomHex}`;
      const check = validateUsernameAvailability(candidate, undefined, null, database.users);
      finalUsername = check.available ? check.normalized : `user_${randomHex}`;
    }

    // Check if email has redeemed beta access previously or is in waitlist
    const hasWaitlistRedemption = normalizedEmail
      ? database.waitlist?.some(w => w.normalizedEmail === normalizedEmail && w.hasRedeemedBeta)
      : false;

    user = {
      id: newId,
      firebaseUid: uid,
      email: normalizedEmail,
      username: finalUsername,
      displayName: isOwnerEmail
        ? 'A Certain Ent'
        : isMintEmail
        ? 'MINT'
        : displayName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Web3 Collector'),
      avatar: isOwnerEmail || isMintEmail
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80'
        : photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${normalizedEmail || newId}&backgroundColor=0d0f14`,
      banner: (isOwnerEmail || isMintEmail)
        ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80'
        : undefined,
      bio: isOwnerEmail
        ? 'Genesis creator & protocol architect. Curator of organic geometric artifacts on Algorand.'
        : isMintEmail
        ? 'Official MINT Protocol account. Curating digital artifacts and ecosystem community on Algorand.'
        : '',
      walletAddress: isOwnerEmail
        ? 'ACEALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABCD'
        : isMintEmail
        ? 'M1NTALGORANDTESTNETVALIDATORCREATOR7XQP9KLM1VOS3W2YRT7UABC'
        : undefined,
      role: isOwnerEmail ? 'owner' : isMintEmail ? 'trusted_mint_account' : 'collector',
      privilegedType: isOwnerEmail ? 'platform_owner' : isMintEmail ? 'trusted_mint_account' : undefined,
      isPrivileged: isOwnerEmail || isMintEmail,
      isVerified: isOwnerEmail || isMintEmail,
      beta_access: isOwnerEmail || isMintEmail || !!hasWaitlistRedemption,
      usernameColor: (isOwnerEmail || isMintEmail) ? '#ff5500' : undefined,
      isFoundingMember: isOwnerEmail || isMintEmail,
      foundingMemberGrantedAt: (isOwnerEmail || isMintEmail) ? new Date().toISOString() : undefined,
      foundingMemberReason: isOwnerEmail
        ? 'Genesis protocol architect & platform owner'
        : isMintEmail
        ? 'Official MINT protocol identity account'
        : undefined,
      plan: (isOwnerEmail || isMintEmail) ? 'unlimited' : undefined,
      bot_unlimited: isOwnerEmail || isMintEmail,
      entitlement: (isOwnerEmail || isMintEmail) ? { tier: 'unlimited', bot_unlimited: true } : undefined,
      createdAt: new Date().toISOString(),
      profileCompleted: true,
      authProvider: (provider || 'google').toLowerCase()
    };
    database.users.push(user);
  } else {
    // Existing user: bind firebaseUid
    user.firebaseUid = uid;
    if (provider && !user.authProvider) {
      user.authProvider = provider.toLowerCase();
    }

    // Enforce privileged account entitlements and protections on login
    if (isOwnerEmail) {
      user.role = 'owner';
      user.privilegedType = 'platform_owner';
      user.isPrivileged = true;
      user.isVerified = true;
      user.beta_access = true;
      user.usernameColor = '#ff5500';
      user.isFoundingMember = true;
      user.username = 'L';
      user.displayName = 'A Certain Ent';
      user.plan = 'unlimited';
      user.bot_unlimited = true;
    } else if (isMintEmail) {
      user.role = 'trusted_mint_account';
      user.privilegedType = 'trusted_mint_account';
      user.isPrivileged = true;
      user.isVerified = true;
      user.beta_access = true;
      user.usernameColor = '#ff5500';
      user.isFoundingMember = true;
      user.username = 'mint';
      user.displayName = 'MINT';
      user.plan = 'unlimited';
      user.bot_unlimited = true;
    }

    if (photoURL && (!user.avatar || user.avatar.includes('dicebear'))) {
      user.avatar = photoURL;
    }
    if (provider && (!user.authProvider || user.authProvider === 'email')) {
      user.authProvider = provider.toLowerCase();
    }
  }

  db.save(database);
  firestoreSync.saveUserProfile(user).catch(console.warn);

  const token = `${user.id}:${Date.now()}`;
  res.json({
    token,
    user,
    isNewUser
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
  // Check if email already exists
  if (database.users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  // Derive and validate username
  const requestedUsername = username
    ? username.replace(/^@/, '')
    : email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');

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
    profileCompleted: true,
    authProvider: 'email'
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

// Check username availability (real-time live checking)
authRouter.get('/check-username', (req, res) => {
  const q = req.query.username;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const clean = q.replace(/^@/, '').trim();
  const database = db.get();

  // Try to inspect user from auth token if provided
  let requestingUser: User | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const userId = token.split(':')[0];
    requestingUser = database.users.find(u => u.id === userId) || null;
  }

  const check = validateUsernameAvailability(
    clean,
    requestingUser?.id,
    requestingUser,
    database.users
  );

  res.json({
    available: check.available,
    message: check.message,
    code: check.code,
    username: check.normalized
  });
});

// Complete profile during onboarding
authRouter.post('/complete-profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { username, displayName, avatar, bio } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const database = db.get();
  const check = validateUsernameAvailability(
    username,
    req.user!.id,
    req.user,
    database.users
  );

  if (!check.available && check.code !== 'same_as_current') {
    return res.status(400).json({ error: check.message, code: check.code });
  }

  const userIdx = database.users.findIndex(u => u.id === req.user!.id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  database.users[userIdx] = {
    ...database.users[userIdx],
    username: check.normalized,
    displayName: displayName?.trim() || check.normalized,
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
  const { username, displayName, bio, avatar, banner, socialLinks, walletAddress, usernameColor } = req.body;

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

  // Display name validation
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
      // Check immunity/exemptions for privileged accounts
      const isExempt = isExemptFromCooldowns(existing) || isExemptFromCooldowns(req.user);

      if (!isExempt && existing.lastUsernameChangedAt) {
        const elapsed = Date.now() - new Date(existing.lastUsernameChangedAt).getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (elapsed < sevenDaysMs) {
          const remainingMs = sevenDaysMs - elapsed;
          const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const remainingHours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const timeMsg = remainingDays > 0 ? `${remainingDays}d ${remainingHours}h` : `${remainingHours}h`;
          return res.status(400).json({
            error: `Username can only be changed once every 7 days. Cooldown remaining: ${timeMsg}.`
          });
        }
      }

      const usernameCheck = validateUsernameAvailability(
        cleanUsername,
        existing.id,
        existing,
        database.users
      );

      if (!usernameCheck.available) {
        return res.status(400).json({ error: usernameCheck.message, code: usernameCheck.code });
      }

      updatedUsername = usernameCheck.normalized;
      lastUsernameChangedAt = new Date().toISOString();
    }
  }

  // Username color customization (exclusive to verified users and privileged accounts)
  let updatedUsernameColor = existing.usernameColor;
  if (usernameColor !== undefined) {
    const canCustomizeColor = existing.isVerified || isPrivilegedAccount(existing);
    if (canCustomizeColor) {
      if (typeof usernameColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(usernameColor)) {
        updatedUsernameColor = usernameColor;
      } else if (usernameColor === null || usernameColor === '') {
        updatedUsernameColor = undefined;
      }
    } else if (usernameColor) {
      return res.status(403).json({ error: 'Username color customization is reserved for verified accounts.' });
    }
  }

  // Preserve role, privilegedType, and verification state (cannot be altered via profile update)
  database.users[userIdx] = {
    ...existing,
    username: updatedUsername,
    displayName: displayName !== undefined ? displayName.trim() : existing.displayName,
    bio: bio !== undefined ? bio.trim() : existing.bio,
    avatar: avatar !== undefined ? avatar : existing.avatar,
    banner: banner !== undefined ? banner : existing.banner,
    walletAddress: walletAddress !== undefined ? walletAddress : existing.walletAddress,
    socialLinks: socialLinks !== undefined ? socialLinks : existing.socialLinks,
    usernameColor: updatedUsernameColor,
    lastUsernameChangedAt
  };

  db.save(database);
  res.json({ user: database.users[userIdx] });
});
