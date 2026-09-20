import { useState, useEffect, useCallback } from 'react';

// Cooldown configuration defaults (in seconds)
export const DEFAULT_COOLDOWNS = {
  globalPost: 15,
  comment: 8,
  reply: 4,
};

interface CooldownRecord {
  lastPostAtByCommunity: Record<string, number>;
  lastGlobalPostAt: number;
  lastCommentAt: number;
  lastReplyAt: number;
}

const memoryRecords: CooldownRecord = {
  lastPostAtByCommunity: {},
  lastGlobalPostAt: 0,
  lastCommentAt: 0,
  lastReplyAt: 0,
};

export const cooldownManager = {
  getRemainingPostCooldown(communityId?: string, communityCooldownSec?: number, isExempt = false): number {
    if (isExempt) return 0;
    const now = Date.now();

    if (communityId && communityCooldownSec !== undefined) {
      // Community owner-controlled post cooldown
      if (communityCooldownSec <= 0) return 0;
      const lastAt = memoryRecords.lastPostAtByCommunity[communityId] || 0;
      const elapsed = Math.floor((now - lastAt) / 1000);
      return Math.max(0, communityCooldownSec - elapsed);
    }

    // Default global post cooldown
    const lastAt = memoryRecords.lastGlobalPostAt || 0;
    const elapsed = Math.floor((now - lastAt) / 1000);
    return Math.max(0, DEFAULT_COOLDOWNS.globalPost - elapsed);
  },

  getRemainingCommentCooldown(isExempt = false): number {
    if (isExempt) return 0;
    const now = Date.now();
    const lastAt = memoryRecords.lastCommentAt || 0;
    const elapsed = Math.floor((now - lastAt) / 1000);
    return Math.max(0, DEFAULT_COOLDOWNS.comment - elapsed);
  },

  getRemainingReplyCooldown(isExempt = false): number {
    if (isExempt) return 0;
    const now = Date.now();
    const lastAt = memoryRecords.lastReplyAt || 0;
    const elapsed = Math.floor((now - lastAt) / 1000);
    return Math.max(0, DEFAULT_COOLDOWNS.reply - elapsed);
  },

  recordPost(communityId?: string) {
    const now = Date.now();
    memoryRecords.lastGlobalPostAt = now;
    if (communityId) {
      memoryRecords.lastPostAtByCommunity[communityId] = now;
    }
  },

  recordComment() {
    memoryRecords.lastCommentAt = Date.now();
  },

  recordReply() {
    memoryRecords.lastReplyAt = Date.now();
  },

  formatCooldownMessage(remainingSeconds: number, type: 'post' | 'comment' | 'reply'): string {
    const unit = remainingSeconds === 1 ? 'second' : 'seconds';
    if (type === 'post') {
      return `Please wait ${remainingSeconds} ${unit} before posting again.`;
    }
    if (type === 'comment') {
      return `Please wait ${remainingSeconds} ${unit} before commenting again.`;
    }
    return `Please wait ${remainingSeconds} ${unit} before replying again.`;
  }
};

export function useCooldownTimer(
  type: 'post' | 'comment' | 'reply',
  communityId?: string,
  communityCooldownSec?: number,
  isExempt = false
) {
  const getRemaining = useCallback(() => {
    if (type === 'post') {
      return cooldownManager.getRemainingPostCooldown(communityId, communityCooldownSec, isExempt);
    }
    if (type === 'comment') {
      return cooldownManager.getRemainingCommentCooldown(isExempt);
    }
    return cooldownManager.getRemainingReplyCooldown(isExempt);
  }, [type, communityId, communityCooldownSec, isExempt]);

  const [remaining, setRemaining] = useState<number>(getRemaining());

  useEffect(() => {
    setRemaining(getRemaining());
    const interval = setInterval(() => {
      const rem = getRemaining();
      setRemaining(rem);
    }, 1000);
    return () => clearInterval(interval);
  }, [getRemaining]);

  const canSubmit = remaining === 0;
  const message = !canSubmit ? cooldownManager.formatCooldownMessage(remaining, type) : null;

  return {
    canSubmit,
    remainingSeconds: remaining,
    message,
    refresh: () => setRemaining(getRemaining())
  };
}
