import { User } from '../../src/types';

/**
 * Centrally maintained list of official and brand-protected MINT usernames.
 */
export const EXACT_RESERVED_USERNAMES = new Set<string>([
  'mint',
  'mintofficial',
  'mintapp',
  'mintsocial',
  'mintplatform',
  'mintnetwork',
  'getmint',
  'usemint',
  'mintprotocol',
  'mintteam',
  'mintstaff',
  'mintadmin',
  'mintmod',
  'mintmoderator',
  'mintsupport',
  'minthelp',
  'mintdao',
  'mintbot',
  'mintfoundation',
  'mintsolana',
  'officialmint',
  'realmint',
  'theofficialmint',
  'mint_official',
  'mint_app',
  'mint_team',
  'mint_support',
  'mint_admin',
  'mint_protocol',
  'mint_network',
  'mint_platform',
  'mint_social',
  'mint_sol',
  'mint_bot',
  // System and platform reserved words
  'admin',
  'administrator',
  'moderator',
  'support',
  'help',
  'security',
  'official',
  'verified',
  'system',
  'root',
  'governance',
  'treasury'
]);

/**
 * Checks if the requesting user has platform owner privileges.
 * Does NOT rely on public email exposure.
 */
export function isPlatformOwner(user?: User | { role?: string; entitlement?: any; id?: string } | null): boolean {
  if (!user) return false;
  return (
    user.role === 'owner' ||
    (user as any).id === 'usr_ace_admin' ||
    user.entitlement?.tier === 'unlimited' ||
    (user as any).isOwner === true
  );
}

/**
 * Evaluates whether a handle is reserved or matches protected impersonation variations.
 */
export function isReservedUsername(
  rawUsername: string,
  requestingUser?: User | { role?: string; entitlement?: any; id?: string } | null
): { isReserved: boolean; reason?: string } {
  if (!rawUsername) return { isReserved: false };

  // Platform owner account is explicitly permitted to use protected MINT-related names
  if (isPlatformOwner(requestingUser)) {
    return { isReserved: false };
  }

  const clean = rawUsername.replace(/^@/, '').trim().toLowerCase();

  // 1. Direct match in exact reserved list
  if (EXACT_RESERVED_USERNAMES.has(clean)) {
    return { isReserved: true, reason: 'This username is reserved.' };
  }

  // 2. Normalized leetspeak variation check (e.g., m1nt, mint0ff1c1al)
  const leetNormalized = clean
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[-_.]/g, '');

  if (
    leetNormalized === 'mint' ||
    leetNormalized === 'mintofficial' ||
    leetNormalized === 'mintapp' ||
    leetNormalized === 'mintsocial' ||
    leetNormalized === 'mintplatform' ||
    leetNormalized === 'mintnetwork' ||
    leetNormalized === 'getmint' ||
    leetNormalized === 'usemint'
  ) {
    return { isReserved: true, reason: 'This username is reserved.' };
  }

  // 3. Pattern matches for obvious official prefix/suffix impersonation
  const officialSuffixes = [
    'official',
    'support',
    'admin',
    'team',
    'staff',
    'mod',
    'help',
    'protocol',
    'platform',
    'network',
    'social',
    'app',
    'bot',
    'foundation'
  ];

  for (const suffix of officialSuffixes) {
    if (clean === `mint${suffix}` || clean === `mint_${suffix}` || clean === `mint-${suffix}`) {
      return { isReserved: true, reason: 'This username is reserved.' };
    }
  }

  const officialPrefixes = ['get', 'use', 'the', 'real', 'official'];
  for (const prefix of officialPrefixes) {
    if (clean === `${prefix}mint` || clean === `${prefix}_mint` || clean === `${prefix}-mint`) {
      return { isReserved: true, reason: 'This username is reserved.' };
    }
  }

  return { isReserved: false };
}

/**
 * Complete availability validation for choosing or updating handles.
 */
export function validateUsernameAvailability(
  rawUsername: string,
  currentUserId?: string,
  requestingUser?: User | { role?: string; entitlement?: any; id?: string } | null,
  allUsers: User[] = []
): { available: boolean; code: 'available' | 'reserved' | 'taken' | 'invalid_format' | 'length' | 'same_as_current'; message: string; normalized: string } {
  const clean = rawUsername.replace(/^@/, '').trim().toLowerCase();

  // Length check (3 to 20 chars)
  if (clean.length < 3 || clean.length > 20) {
    return {
      available: false,
      code: 'length',
      message: 'Username must be 3-20 characters.',
      normalized: clean
    };
  }

  // Character check (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return {
      available: false,
      code: 'invalid_format',
      message: 'Only letters, numbers, and underscores are allowed.',
      normalized: clean
    };
  }

  // Reserved brand check
  const reservedCheck = isReservedUsername(clean, requestingUser);
  if (reservedCheck.isReserved) {
    return {
      available: false,
      code: 'reserved',
      message: 'This username is reserved.',
      normalized: clean
    };
  }

  // Uniqueness check across registered users
  const existingUser = allUsers.find(
    u => u.username.toLowerCase() === clean && u.id !== currentUserId
  );

  if (existingUser) {
    return {
      available: false,
      code: 'taken',
      message: 'Username is already taken.',
      normalized: clean
    };
  }

  // If matches current user's username
  const currentUser = allUsers.find(u => u.id === currentUserId);
  if (currentUser && currentUser.username.toLowerCase() === clean) {
    return {
      available: true,
      code: 'same_as_current',
      message: 'Current username',
      normalized: clean
    };
  }

  return {
    available: true,
    code: 'available',
    message: 'Available',
    normalized: clean
  };
}
