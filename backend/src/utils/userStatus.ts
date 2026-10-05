import { getDB } from '../config/database';

/**
 * Account-status enforcement (banned / suspended).
 *
 * Admin moderation writes `users.status`, but JWTs live for days — so every
 * authenticated request must verify the account is still active. To keep that
 * cheap, results are cached in-memory for a short TTL; admin moderation calls
 * `invalidateUserStatus()` so a ban takes effect immediately on this instance
 * and within TTL_MS everywhere else.
 */

const TTL_MS = 60 * 1000;

interface CacheEntry {
  status: string | null; // null = user no longer exists
  expires: number;
}

const cache = new Map<string, CacheEntry>();

const BLOCK_MESSAGES: Record<string, string> = {
  banned: 'This account has been banned. Contact NAVIGO support if you believe this is a mistake.',
  suspended: 'This account is suspended. Contact NAVIGO support for more information.',
  deleted: 'This account has been closed.',
};

/** Returns the user's current status ('active' | 'suspended' | 'banned' | ...), or null if the user no longer exists. */
export const getUserStatus = async (userId: string): Promise<string | null> => {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && hit.expires > now) return hit.status;

  const db = getDB();
  const row = await db.get('SELECT status FROM users WHERE id = ?', [userId]);
  const status = row ? (row.status || 'active') : null;
  cache.set(userId, { status, expires: now + TTL_MS });

  // Opportunistic cleanup so the map can't grow unbounded
  if (cache.size > 10000) {
    for (const [key, entry] of cache) {
      if (entry.expires <= now) cache.delete(key);
    }
  }

  return status;
};

/** Call after moderation actions (ban/suspend/reactivate/delete) so they apply immediately. */
export const invalidateUserStatus = (userId: string) => {
  cache.delete(userId);
};

/** Returns a user-facing block message if the account may not be used, or null if it's fine. */
export const getBlockMessage = async (userId: string): Promise<string | null> => {
  try {
    const status = await getUserStatus(userId);
    if (status === null) return 'Account not found. Please register again.';
    return BLOCK_MESSAGES[status] || null;
  } catch (e) {
    // If the status check itself fails (e.g. transient DB issue), do not lock
    // everyone out — fail open and let the request proceed.
    console.error('User status check failed:', (e as any)?.message);
    return null;
  }
};
