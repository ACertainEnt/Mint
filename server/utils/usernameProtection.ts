import { User } from '../../src/types';
import { isPlatformOwner, isPrivilegedAccount, canUseSingleLetterUsername } from './privileges';

export { isPlatformOwner, isPrivilegedAccount };

/**
 * Normalized check for the protected 'mint' identity substring.
 * Protects against obvious evasions (punctuation, separators, leetspeak, repeated chars).
 */
export function normalizeForMintCheck(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[@_.\-+\s]/g, '') // remove separators
    .replace(/[1!|íìîï]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[3]/g, 'e')
    .replace(/[5]/g, 's')
    .replace(/[7+†]/g, 't')
    .replace(/rn/g, 'm') // "rn" visual homoglyph for "m"
    .replace(/(.)\1+/g, '$1'); // collapse repeated letters
}

/**
 * Evaluates whether text contains the protected "mint" identity substring (case-insensitively and normalized).
 */
export function containsMintProtectedSubstring(text: string): boolean {
  if (!text) return false;
  const rawLower = text.toLowerCase();
  if (rawLower.includes('mint')) return true;

  const normalized = normalizeForMintCheck(text);
  if (normalized.includes('mint')) return true;

  // Secondary check with basic separator strip without collapsing repeated letters
  const stripped = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[@_.\-+\s]/g, '')
    .replace(/[1!|]/g, 'i')
    .replace(/[7+†]/g, 't');
  if (stripped.includes('mint')) return true;

  return false;
}

/**
 * Validates a community name or handle against MINT brand protection.
 * Only privileged MINT accounts may create communities containing "mint".
 */
export function validateCommunityNameProtection(
  nameOrHandle: string,
  requestingUser?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean; id?: string } | null
): { allowed: boolean; error?: string } {
  if (!nameOrHandle) return { allowed: true };

  if (containsMintProtectedSubstring(nameOrHandle)) {
    if (!isPrivilegedAccount(requestingUser)) {
      return {
        allowed: false,
        error: 'That community name is reserved by MINT.'
      };
    }
  }

  return { allowed: true };
}

/**
 * System and platform reserved words that cannot be claimed by standard users.
 */
export const SYSTEM_RESERVED_USERNAMES = new Set<string>([
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
 * Checks whether a requested username is reserved by MINT or the system.
 */
export function isReservedUsername(
  rawUsername: string,
  requestingUser?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean; id?: string } | null
): { isReserved: boolean; reason?: string } {
  if (!rawUsername) return { isReserved: false };

  const clean = rawUsername.replace(/^@/, '').trim().toLowerCase();

  // Primary platform owner @L reservation: only platform owner can use @L or single-letter handles
  if (clean === 'l') {
    if (isPlatformOwner(requestingUser)) {
      return { isReserved: false };
    }
    return {
      isReserved: true,
      reason: 'This username is reserved by MINT.'
    };
  }

  // Exact @mint reservation: only privileged accounts can use @mint
  if (clean === 'mint') {
    if (isPrivilegedAccount(requestingUser)) {
      return { isReserved: false };
    }
    return {
      isReserved: true,
      reason: 'This username is reserved by MINT.'
    };
  }

  // Any username containing "mint" is strictly reserved for privileged MINT accounts
  if (containsMintProtectedSubstring(clean)) {
    if (isPrivilegedAccount(requestingUser)) {
      return { isReserved: false };
    }
    return {
      isReserved: true,
      reason: 'This username is reserved by MINT.'
    };
  }

  // General system words check
  if (SYSTEM_RESERVED_USERNAMES.has(clean)) {
    if (isPlatformOwner(requestingUser)) {
      return { isReserved: false };
    }
    return {
      isReserved: true,
      reason: 'This username is reserved by system administration.'
    };
  }

  return { isReserved: false };
}

/**
 * Complete availability validation for choosing or updating handles.
 * Enforces length, character restrictions, brand reservations, and database uniqueness.
 */
export function validateUsernameAvailability(
  rawUsername: string,
  currentUserId?: string,
  requestingUser?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean; id?: string } | null,
  allUsers: User[] = []
): {
  available: boolean;
  code: 'available' | 'reserved' | 'taken' | 'invalid_format' | 'length' | 'same_as_current';
  message: string;
  normalized: string;
} {
  const clean = rawUsername.replace(/^@/, '').trim();
  const cleanLower = clean.toLowerCase();

  // Platform owner exception: @L is explicitly allowed 1-character length
  const isOwner = isPlatformOwner(requestingUser);
  const minLength = isOwner ? 1 : 3;

  // Length check
  if (cleanLower.length < minLength || cleanLower.length > 20) {
    if (cleanLower.length < minLength && isOwner) {
      return {
        available: false,
        code: 'length',
        message: 'Username must be at least 1 character.',
        normalized: cleanLower
      };
    }
    return {
      available: false,
      code: 'length',
      message: 'Username must be 3-20 characters.',
      normalized: cleanLower
    };
  }

  // Character check (alphanumeric and underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(cleanLower)) {
    return {
      available: false,
      code: 'invalid_format',
      message: 'Only letters, numbers, and underscores are allowed.',
      normalized: cleanLower
    };
  }

  // Reserved brand / MINT substring check
  const reservedCheck = isReservedUsername(cleanLower, requestingUser);
  if (reservedCheck.isReserved) {
    return {
      available: false,
      code: 'reserved',
      message: reservedCheck.reason || 'This username is reserved by MINT.',
      normalized: cleanLower
    };
  }

  // Uniqueness check across all users in database
  const existingUser = allUsers.find(
    u => u.username.toLowerCase() === cleanLower && u.id !== currentUserId
  );

  if (existingUser) {
    return {
      available: false,
      code: 'taken',
      message: 'Username is already taken.',
      normalized: cleanLower
    };
  }

  // Same as user's current username
  const currentUser = allUsers.find(u => u.id === currentUserId);
  if (currentUser && currentUser.username.toLowerCase() === cleanLower) {
    return {
      available: true,
      code: 'same_as_current',
      message: 'Current username',
      normalized: cleanLower
    };
  }

  return {
    available: true,
    code: 'available',
    message: 'Available',
    normalized: cleanLower
  };
}
