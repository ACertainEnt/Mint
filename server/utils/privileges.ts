import { User } from '../../src/types';

/**
 * Privileged role definitions.
 * Privileged accounts are recognized through persistent backend roles/entitlements,
 * not by hardcoded frontend checks.
 */
export const PRIVILEGED_ROLES = new Set<string>([
  'owner',
  'platform_owner',
  'trusted_mint_account',
  'privileged_account'
]);

/**
 * Checks if a user has platform owner privileges.
 * Platform owner account is @L.
 */
export function isPlatformOwner(
  user?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean; id?: string } | null
): boolean {
  if (!user) return false;
  if (user.privilegedType === 'platform_owner') return true;
  if (user.role === 'owner' || user.role === 'platform_owner') return true;
  if (user.id === 'usr_owner_L' || user.id === 'usr_ace_admin') return true;
  return false;
}

/**
 * Checks if a user is one of the privileged MINT accounts:
 * - Primary: @L (platform_owner)
 * - Second: @mint (trusted_mint_account)
 * or has an assigned privileged role.
 */
export function isPrivilegedAccount(
  user?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean; id?: string } | null
): boolean {
  if (!user) return false;
  if (user.isPrivileged === true) return true;
  if (
    user.privilegedType === 'platform_owner' ||
    user.privilegedType === 'trusted_mint_account' ||
    user.privilegedType === 'privileged_account'
  ) {
    return true;
  }
  if (user.role && PRIVILEGED_ROLES.has(user.role)) {
    return true;
  }
  if (
    user.id === 'usr_owner_L' ||
    user.id === 'usr_ace_admin' ||
    user.id === 'usr_mint_official'
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if user is exempt from customer-facing limitations and cooldowns:
 * - Community creation cooldown
 * - Post cooldowns
 * - Comment/reply cooldowns
 * - Profile username change cooldowns
 */
export function isExemptFromCooldowns(
  user?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean } | null
): boolean {
  return isPrivilegedAccount(user);
}

/**
 * Checks if user is allowed to use a 1-character username (strictly reserved for platform owner @L).
 */
export function canUseSingleLetterUsername(
  user?: Partial<User> | { role?: string; privilegedType?: string | null; isPrivileged?: boolean } | null
): boolean {
  return isPlatformOwner(user);
}
