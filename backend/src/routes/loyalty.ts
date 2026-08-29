import express, { Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { getLoyaltyStatus, REWARDS_CATALOG } from '../utils/loyalty';

const router = express.Router();

// ─── Real Zawadi Rewards status ─────────────────────────
// Points, tier, referral code, and redemption history are all computed
// from real DB facts (completed rides, rewarded referrals, past
// redemptions) — never trusted from/stored on the client.
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const status = await getLoyaltyStatus(userId);
    res.json({ ok: true, ...status, catalog: REWARDS_CATALOG });
  } catch (error) {
    console.error('Loyalty status error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load rewards status' });
  }
});

// ─── Redeem a reward for a real voucher ─────────────────
// Deducts points (server-verified balance, not client-supplied) and issues
// a one-time voucher code that /rides/request can actually apply to a fare.
router.post('/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { rewardName } = req.body;
    const reward = REWARDS_CATALOG.find(r => r.name === rewardName);
    if (!reward) {
      return res.status(400).json({ ok: false, message: 'Unknown reward' });
    }

    const status = await getLoyaltyStatus(userId);
    if (status.points < reward.points) {
      return res.status(400).json({
        ok: false,
        message: `You need ${reward.points - status.points} more points for ${reward.name}.`,
      });
    }

    const db = getDB();
    const voucherCode = `ZWD${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const id = `lr_${Date.now()}_${userId}`;

    await db.run(
      'INSERT INTO loyalty_redemptions (id, userId, rewardName, pointsCost, discountAmount, voucherCode) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, reward.name, reward.points, reward.discountAmount, voucherCode]
    );

    res.status(201).json({
      ok: true,
      message: `🎉 Redeemed: ${reward.name}! Apply voucher ${voucherCode} at checkout for UGX ${reward.discountAmount.toLocaleString()} off.`,
      voucherCode,
      discountAmount: reward.discountAmount,
    });
  } catch (error) {
    console.error('Loyalty redeem error:', error);
    res.status(500).json({ ok: false, message: 'Failed to redeem reward' });
  }
});

export default router;
