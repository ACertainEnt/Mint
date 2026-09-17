import { db } from '../db';
import { MintBotUsage, User } from '../../src/types';

interface UsageRecord {
  count: number;
  windowStart: number;
}

// In-memory rate limiting tracker (1-hour window)
const usageMap = new Map<string, UsageRecord>();
const ONE_HOUR_MS = 60 * 60 * 1000;

export class MintBotEntitlements {
  /**
   * Determine entitlement tier for a user.
   * Server-side authoritative evaluation:
   * - Unlimited entitlement: bot_unlimited flag, unlimited plan, admin role, or unlimited tier entitlement
   * - Pro entitlement: pro plan, verified creator, or pro tier entitlement
   * - Free entitlement: standard accounts, guest visitors
   */
  public static getUserTier(user?: User): 'free' | 'pro' | 'unlimited' {
    if (!user) return 'free';

    // 1. Check for unlimited bot entitlements from database/admin configuration
    if (
      user.bot_unlimited === true ||
      user.plan === 'unlimited' ||
      user.plan === 'enterprise' ||
      user.entitlement?.bot_unlimited === true ||
      user.entitlement?.tier === 'unlimited' ||
      user.role === 'admin'
    ) {
      return 'unlimited';
    }

    // 2. Check for pro tier
    if (
      user.plan === 'pro' ||
      user.entitlement?.tier === 'pro' ||
      user.role === 'creator' ||
      user.isVerified
    ) {
      return 'pro';
    }

    return 'free';
  }

  /**
   * Get configured limits from platform database config
   */
  public static getConfiguredLimits(): { freeLimit: number; proLimit: number } {
    const database = db.get();
    const botConfig = database.config.mintBotConfig;
    return {
      freeLimit: botConfig?.freeHourlyLimit || 20,
      proLimit: botConfig?.proHourlyLimit || 200
    };
  }

  /**
   * Get current usage state without incrementing
   */
  public static getUsage(user?: User, ipAddress: string = 'unknown'): MintBotUsage {
    const key = user ? `usr:${user.id}` : `ip:${ipAddress}`;
    const tier = this.getUserTier(user);
    const { freeLimit, proLimit } = this.getConfiguredLimits();

    const now = Date.now();
    const record = usageMap.get(key);
    const usedThisHour = (!record || (now - record.windowStart) > ONE_HOUR_MS) ? 0 : record.count;
    const elapsed = record ? (now - record.windowStart) : 0;
    const resetInMinutes = record && elapsed < ONE_HOUR_MS 
      ? Math.max(1, Math.ceil((ONE_HOUR_MS - elapsed) / (60 * 1000)))
      : 60;

    if (tier === 'unlimited') {
      return {
        tier: 'unlimited',
        usedThisHour,
        limit: 'unlimited',
        remaining: 'unlimited',
        resetInMinutes: 60,
        isUnlimited: true
      };
    }

    // Support custom user-level bot_usage_limit override if present
    const limit = user?.bot_usage_limit && user.bot_usage_limit > 0
      ? user.bot_usage_limit
      : (tier === 'pro' ? proLimit : freeLimit);

    const remaining = Math.max(0, limit - usedThisHour);

    return {
      tier,
      usedThisHour,
      limit,
      remaining,
      resetInMinutes,
      isUnlimited: false
    };
  }

  /**
   * Check entitlement and consume one query quota.
   * Returns whether query is permitted, along with updated usage metadata.
   */
  public static checkAndConsumeUsage(user?: User, ipAddress: string = 'unknown'): {
    allowed: boolean;
    usage: MintBotUsage;
    error?: string;
  } {
    const key = user ? `usr:${user.id}` : `ip:${ipAddress}`;
    const tier = this.getUserTier(user);
    const { freeLimit, proLimit } = this.getConfiguredLimits();

    const now = Date.now();
    let record = usageMap.get(key);

    if (!record || (now - record.windowStart) > ONE_HOUR_MS) {
      record = { count: 0, windowStart: now };
      usageMap.set(key, record);
    }

    // Unlimited tier bypasses any hourly cap
    if (tier === 'unlimited') {
      record.count += 1;
      return {
        allowed: true,
        usage: {
          tier: 'unlimited',
          usedThisHour: record.count,
          limit: 'unlimited',
          remaining: 'unlimited',
          resetInMinutes: 60,
          isUnlimited: true
        }
      };
    }

    const limit = user?.bot_usage_limit && user.bot_usage_limit > 0
      ? user.bot_usage_limit
      : (tier === 'pro' ? proLimit : freeLimit);

    if (record.count >= limit) {
      const elapsed = now - record.windowStart;
      const resetInMinutes = Math.max(1, Math.ceil((ONE_HOUR_MS - elapsed) / (60 * 1000)));
      return {
        allowed: false,
        usage: {
          tier,
          usedThisHour: record.count,
          limit,
          remaining: 0,
          resetInMinutes,
          isUnlimited: false
        },
        error: `Hourly MintBot research limit reached (${record.count}/${limit} queries). Quota resets in ${resetInMinutes} minute${resetInMinutes === 1 ? '' : 's'}. Pro tier provides 10x throughput.`
      };
    }

    record.count += 1;
    const remaining = Math.max(0, limit - record.count);
    const elapsed = now - record.windowStart;
    const resetInMinutes = Math.max(1, Math.ceil((ONE_HOUR_MS - elapsed) / (60 * 1000)));

    return {
      allowed: true,
      usage: {
        tier,
        usedThisHour: record.count,
        limit,
        remaining,
        resetInMinutes,
        isUnlimited: false
      }
    };
  }
}
