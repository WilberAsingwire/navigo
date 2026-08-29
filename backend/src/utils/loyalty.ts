import { getDB } from '../config/database';

/**
 * Zawadi Rewards — real points, real vouchers.
 *
 * Points are never trusted from the client and never stored as a mutable
 * balance either (so there's nothing to tamper with): they're computed on
 * demand from real, auditable facts —
 *   +10 pts per completed ride (from `rides`)
 *   +50 pts per referral that has actually been rewarded (from `referrals`,
 *       only set once the referred friend completes their first ride)
 *   −pointsCost for every reward ever redeemed (from `loyalty_redemptions`)
 *
 * This mirrors the formula the old client-only LoyaltyCard used (10/ride,
 * 50/referral) so nobody's earned-points total changes, but now referrals
 * only count once they're genuinely earned, and redemptions actually cost
 * points instead of being free forever.
 */

export const REWARDS_CATALOG = [
  { name: 'UGX 1,000 Off', points: 50, discountAmount: 1000, emoji: '💰' },
  { name: 'Free Boda Ride', points: 100, discountAmount: 3000, emoji: '🏍️' },
  { name: 'Free NAVIGO Go', points: 200, discountAmount: 6000, emoji: '🚗' },
  { name: 'Free Comfort', points: 350, discountAmount: 10000, emoji: '🚙' },
  { name: 'Free XL Ride', points: 500, discountAmount: 16000, emoji: '🚐' },
  { name: 'UGX 10,000 Cash', points: 800, discountAmount: 10000, emoji: '💵' },
] as const;

export const TIER_CONFIG: Record<string, { name: string; nextTier: number; cashback: string }> = {
  bronze: { name: 'Bronze', nextTier: 500, cashback: '2%' },
  silver: { name: 'Silver', nextTier: 1000, cashback: '5%' },
  gold: { name: 'Gold', nextTier: 2500, cashback: '10%' },
  platinum: { name: 'Platinum', nextTier: 99999, cashback: '15%' },
};

export function tierFor(points: number): keyof typeof TIER_CONFIG {
  if (points >= 2500) return 'platinum';
  if (points >= 1000) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

export async function getLoyaltyStatus(userId: string) {
  const db = getDB();

  const userRow = await db.get('SELECT role, referralCode FROM users WHERE id = ?', [userId]);
  const isDriver = userRow?.role === 'driver';

  // Drivers earn points for rides they *drove*; riders for rides they
  // *booked* — using the wrong column silently zeroed every driver's
  // ride count (and points) since drivers essentially never appear as the
  // `userId` on a ride row.
  const ridesRow = isDriver
    ? await db.get("SELECT COUNT(*)::int AS count FROM rides WHERE driverId = ? AND status = 'completed'", [userId])
    : await db.get("SELECT COUNT(*)::int AS count FROM rides WHERE userId = ? AND status = 'completed'", [userId]);
  const ridesCount = ridesRow?.count || 0;

  const referralsRow = await db.get(
    'SELECT COUNT(*)::int AS count FROM referrals WHERE referrerId = ? AND rewardedAt IS NOT NULL',
    [userId]
  );
  const rewardedReferrals = referralsRow?.count || 0;

  const spentRow = await db.get(
    'SELECT COALESCE(SUM(pointsCost), 0)::int AS spent FROM loyalty_redemptions WHERE userId = ?',
    [userId]
  );
  const spentPoints = spentRow?.spent || 0;

  const earnedPoints = ridesCount * 10 + rewardedReferrals * 50;
  const availablePoints = Math.max(0, earnedPoints - spentPoints);
  const tier = tierFor(earnedPoints);

  const redemptions = await db.all(
    `SELECT id, rewardName, pointsCost, discountAmount, voucherCode, usedOnRideId, usedAt, redeemedAt
     FROM loyalty_redemptions WHERE userId = ? ORDER BY redeemedAt DESC`,
    [userId]
  );

  return {
    points: availablePoints,
    earnedPoints,
    spentPoints,
    ridesCount,
    rewardedReferrals,
    tier,
    tierConfig: TIER_CONFIG[tier],
    referralCode: userRow?.referralCode || null,
    redemptions,
  };
}

/**
 * Called once a ride is marked completed. If this rider was referred by
 * someone and this is their first-ever completed ride, credit the
 * referrer's 50 points by stamping `rewardedAt` — this is the ONLY place
 * referral points are ever granted (never for merely sharing/copying a
 * code, which is trivially repeatable and would let anyone farm points).
 */
export async function creditReferralOnFirstCompletedRide(riderId: string): Promise<void> {
  const db = getDB();
  try {
    const referral = await db.get(
      'SELECT id, referrerId FROM referrals WHERE referredUserId = ? AND rewardedAt IS NULL',
      [riderId]
    );
    if (!referral) return;

    const completedCountRow = await db.get(
      "SELECT COUNT(*)::int AS count FROM rides WHERE userId = ? AND status = 'completed'",
      [riderId]
    );
    // This function runs right after the ride's status flips to 'completed',
    // so exactly one completed ride means this was the first one.
    if ((completedCountRow?.count || 0) !== 1) return;

    await db.run('UPDATE referrals SET rewardedAt = ? WHERE id = ?', [new Date().toISOString(), referral.id]);
    console.log(`🎁 Referral reward credited: referrer ${referral.referrerId} earned 50 pts for ${riderId}'s first ride`);
  } catch (e) {
    console.error('Referral credit error:', e);
  }
}
