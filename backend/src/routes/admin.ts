import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Admin analytics summary — cards on top of the analytics page
router.get('/summary', authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const totalRidesRow = await db.get("SELECT COUNT(*) AS count FROM rides");
    const completedRow = await db.get("SELECT COUNT(*) AS count FROM rides WHERE status = 'completed'");
    const cancelledRow = await db.get("SELECT COUNT(*) AS count FROM rides WHERE status = 'cancelled'");
    const driversRow = await db.get("SELECT COUNT(*) AS count FROM users WHERE role IN ('driver','motorist')");
    const ridersRow = await db.get("SELECT COUNT(*) AS count FROM users WHERE role IN ('rider','customer')");
    const revenueRow = await db.get("SELECT COALESCE(ABS(SUM(amount)),0) AS total FROM wallet_transactions WHERE kind = 'commission'");

    const totalRides = Number(totalRidesRow?.count || 0);
    const completed = Number(completedRow?.count || 0);

    res.json({
      ok: true,
      totalRides,
      completedRides: completed,
      cancelledRides: Number(cancelledRow?.count || 0),
      totalDrivers: Number(driversRow?.count || 0),
      totalRiders: Number(ridersRow?.count || 0),
      totalRevenue: Number(revenueRow?.total || 0),
      completionRate: totalRides > 0 ? Math.round((completed / totalRides) * 100) : 0,
    });
  } catch (error) {
    console.error('Admin analytics summary error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load analytics summary.' });
  }
});

// Daily rides/revenue for the last 30 days (chart data)
router.get('/daily', authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    // Try Postgres syntax first; on failure fall back to SQLite
    try {
      const rows = await db.all(`
        SELECT TO_CHAR(DATE_TRUNC('day', "requestedAt"), 'YYYY-MM-DD') AS day,
               COUNT(*)                            AS rides,
               COALESCE(SUM("fareFinal"),0)        AS revenue
        FROM rides
        WHERE "requestedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `);
      return res.json({ ok: true, daily: rows });
    } catch {
      const rows = await db.all(`
        SELECT strftime('%Y-%m-%d', "requestedAt") AS day,
               COUNT(*)                          AS rides,
               COALESCE(SUM(COALESCE("fareFinal",0)),0) AS revenue
        FROM rides
        WHERE "requestedAt" >= datetime('now', '-30 days')
        GROUP BY 1
        ORDER BY 1 ASC
      `);
      return res.json({ ok: true, daily: rows });
    }
  } catch (error) {
    console.error('Admin analytics daily error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load daily analytics.' });
  }
});

// Top drivers by completed rides
router.get('/top-drivers', authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all(`
      SELECT u.id AS "driverId", u."fullName", COALESCE(dp.rating,5) AS rating,
             COUNT(r.id) AS rides,
             COALESCE(SUM(COALESCE(r."fareFinal",0)),0) AS earnings
      FROM users u
      LEFT JOIN rides r ON r."driverId" = u.id AND r.status = 'completed'
      LEFT JOIN driver_profiles dp ON dp."userId" = u.id
      WHERE u.role IN ('driver','motorist')
      GROUP BY u.id, u."fullName", dp.rating
      ORDER BY rides DESC
      LIMIT 10
    `);
    // Normalize numeric fields for safety
    const normalized = rows.map((r: any) => ({
      ...r,
      rides: Number(r.rides || 0),
      earnings: Number(r.earnings || 0),
      rating: Number(r.rating || 5),
    }));
    res.json({ ok: true, drivers: normalized });
  } catch (error) {
    console.error('Admin analytics top drivers error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load top drivers.' });
  }
});

// Admin payouts list (all users; different from the driver-owned /wallet/payouts)
router.get('/payouts', authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all(`
      SELECT p.*, u."fullName" AS "userName", u.phone AS "userPhone"
      FROM payouts p
      LEFT JOIN users u ON u.id = p."userId"
      ORDER BY p."createdAt" DESC
      LIMIT 200
    `);
    res.json({ ok: true, payouts: rows });
  } catch (error) {
    console.error('Admin payouts list error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load payouts.' });
  }
});

// Admin can mark a payout as completed (manual review)
router.post('/payouts/:id/complete', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const existing = await db.get('SELECT * FROM payouts WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ ok: false, message: 'Payout not found.' });
    const adminId = (req as AuthRequest).user?.userId || 'unknown';
    await db.run(
      "UPDATE payouts SET status = 'completed', note = COALESCE(note,'') || ? WHERE id = ?",
      [`\n[${new Date().toISOString()}] Marked complete by admin ${adminId}`, id]
    );
    res.json({ ok: true, message: 'Payout marked as completed.' });
  } catch (error) {
    console.error('Admin payout complete error:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark payout complete.' });
  }
});

export default router;
