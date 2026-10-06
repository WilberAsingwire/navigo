import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { payoutLimiter } from '../middleware/rateLimit';
import { paymentService } from '../services/paymentService';

const MIN_PAYOUT = 10000;
const MAX_PAYOUT = 2000000;
const MIN_TOPUP = 1000;
const MAX_TOPUP = 2000000;

const router = express.Router();

/**
 * FREE-MODE PAYMENTS (current default)
 * ------------------------------------
 * No payment gateway fees. Top-ups work by the rider sending Mobile Money
 * person-to-person to the NAVIGO MoMo number, then submitting the MoMo
 * transaction ID. An admin verifies the deposit and approves it — the wallet
 * is credited atomically. Payouts are queued for the admin to send manually.
 *
 * PAID-MODE (later): set FLUTTERWAVE_SECRET_KEY and the existing /topup
 * (gateway-verified) and gateway payout paths take over. The wallet ledger,
 * limits and admin screens stay exactly the same.
 */
const paymentInfo = () => ({
  mode: process.env.FLUTTERWAVE_SECRET_KEY ? 'gateway' : 'manual',
  deposits: [
    {
      provider: 'mtn',
      label: 'MTN Mobile Money',
      number: process.env.MOMO_MTN_NUMBER || '',
      name: process.env.MOMO_MTN_NAME || 'NAVIGO',
    },
    {
      provider: 'airtel',
      label: 'Airtel Money',
      number: process.env.MOMO_AIRTEL_NUMBER || '',
      name: process.env.MOMO_AIRTEL_NAME || 'NAVIGO',
    },
  ].filter(d => d.number),
  minTopup: MIN_TOPUP,
  maxTopup: MAX_TOPUP,
});

// Single source of truth for Ugandan phone normalization
const normalizePhoneStrict = (raw: string): string | null => {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('256')) cleaned = cleaned.slice(3);
  if (cleaned.length === 9 && cleaned.startsWith('7')) cleaned = '0' + cleaned;
  return /^07\d{8}$/.test(cleaned) ? cleaned : null;
};

// How to deposit money (NAVIGO MoMo numbers) + current payment mode.
router.get('/payment-info', authenticate, async (_req: Request, res: Response) => {
  res.json({ ok: true, ...paymentInfo() });
});

// ─── MANUAL TOP-UP (free mode) ───────────────────────────────────────────
// Rider has sent MoMo to the NAVIGO number and submits the transaction ID.
router.post('/topup-request', authenticate, payoutLimiter, async (req: Request, res: Response) => {
  try {
    const { amount, provider, senderPhone, momoRef } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const amt = parseInt(amount, 10);
    if (!amt || isNaN(amt) || amt < MIN_TOPUP) {
      return res.status(400).json({ ok: false, message: `Minimum top-up is UGX ${MIN_TOPUP.toLocaleString()}` });
    }
    if (amt > MAX_TOPUP) {
      return res.status(400).json({ ok: false, message: `Maximum top-up is UGX ${MAX_TOPUP.toLocaleString()} per request` });
    }
    if (!['mtn', 'airtel'].includes(provider)) {
      return res.status(400).json({ ok: false, message: 'Provider must be mtn or airtel' });
    }
    const cleanPhone = normalizePhoneStrict(senderPhone || '');
    if (!cleanPhone) {
      return res.status(400).json({ ok: false, message: 'Enter the Ugandan number you sent the money from (07XXXXXXXX)' });
    }
    const ref = String(momoRef || '').trim().toUpperCase();
    if (ref.length < 6 || ref.length > 40) {
      return res.status(400).json({ ok: false, message: 'Enter the Mobile Money transaction ID from your confirmation SMS.' });
    }

    const id = `topup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await db.run(
        'INSERT INTO topup_requests (id, userId, amount, provider, senderPhone, momoRef) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, amt, provider, cleanPhone, ref]
      );
    } catch (e: any) {
      if (e?.code === '23505') {
        return res.status(400).json({ ok: false, message: 'This Mobile Money transaction ID has already been submitted.' });
      }
      throw e;
    }

    res.status(201).json({
      ok: true,
      request: { id, amount: amt, provider, status: 'pending' },
      message: 'Top-up submitted! It will be verified and credited shortly (usually within a few minutes).',
    });
  } catch (error) {
    console.error('Topup request error:', error);
    res.status(500).json({ ok: false, message: 'Failed to submit top-up. Try again.' });
  }
});

// Rider's own top-up requests (to show pending/approved/rejected status).
router.get('/topup-requests', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();
    const requests = await db.all(
      'SELECT id, amount, provider, senderPhone, momoRef, status, reviewNote, createdAt, reviewedAt FROM topup_requests WHERE userId = ? ORDER BY createdAt DESC LIMIT 20',
      [userId]
    );
    res.json({ ok: true, requests });
  } catch (error) {
    console.error('Topup requests error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch top-up requests' });
  }
});

// ─── ADMIN: review manual top-ups ────────────────────────────────────────
router.get('/admin/topup-requests', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const status = req.query.status as string | undefined;
    const params: any[] = [];
    let where = '';
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where = 'WHERE t.status = ?';
      params.push(status);
    }
    const requests = await db.all(
      `SELECT t.*, u.fullName AS userName, u.phone AS userPhone
       FROM topup_requests t LEFT JOIN users u ON u.id = t.userId
       ${where}
       ORDER BY t.createdAt DESC LIMIT 200`,
      params
    );
    res.json({ ok: true, requests });
  } catch (error) {
    console.error('Admin topup list error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load top-up requests.' });
  }
});

router.post('/admin/topup-requests/:id/approve', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const adminId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      // Atomically claim the request — double-approval is impossible.
      const claim = await tx.query(
        "UPDATE topup_requests SET status = 'approved', reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending' RETURNING userId, amount, momoRef, provider",
        [adminId, id]
      );
      if (claim.rowCount === 0) {
        await tx.query('ROLLBACK');
        tx.release();
        return res.status(400).json({ ok: false, message: 'Request not found or already reviewed.' });
      }
      const reqRow = claim.rows[0];

      await tx.query(
        `INSERT INTO wallets (userId, balance) VALUES (?, ?)
         ON CONFLICT(userId) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updatedAt = CURRENT_TIMESTAMP`,
        [reqRow.userId, reqRow.amount]
      );
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, reference, note) VALUES (?, ?, ?, ?, ?, ?)',
        [
          `tx_topup_${Date.now()}_${reqRow.userId}`,
          reqRow.userId,
          'topup',
          reqRow.amount,
          reqRow.momoRef,
          `Wallet top-up via ${String(reqRow.provider).toUpperCase()} (MoMo ref: ${reqRow.momoRef})`,
        ]
      );

      await tx.query('COMMIT');
      tx.release();
      res.json({ ok: true, message: `Approved — UGX ${Number(reqRow.amount).toLocaleString()} credited.` });
    } catch (e: any) {
      try { await tx.query('ROLLBACK'); } catch {}
      tx.release();
      if (e?.code === '23505') {
        return res.status(400).json({ ok: false, message: 'This MoMo reference was already credited.' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Admin topup approve error:', error);
    res.status(500).json({ ok: false, message: 'Failed to approve top-up.' });
  }
});

router.post('/admin/topup-requests/:id/reject', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const reason = String(req.body?.reason || 'Could not verify this deposit').slice(0, 300);
    const adminId = (req as AuthRequest).user?.userId;
    const db = getDB();
    const result = await db.run(
      "UPDATE topup_requests SET status = 'rejected', reviewNote = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'",
      [reason, adminId, id]
    );
    if (!result.rowCount) {
      return res.status(400).json({ ok: false, message: 'Request not found or already reviewed.' });
    }
    res.json({ ok: true, message: 'Top-up request rejected.' });
  } catch (error) {
    console.error('Admin topup reject error:', error);
    res.status(500).json({ ok: false, message: 'Failed to reject top-up.' });
  }
});

router.get('/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();
    const wallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [userId]);
    res.json({ ok: true, balance: wallet?.balance || 0 });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch balance' });
  }
});

router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const transactions = await db.all(
      'SELECT * FROM wallet_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 100',
      [userId]
    );

    res.json({ ok: true, transactions });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch transactions' });
  }
});

router.post('/payout', authenticate, authorize(['driver', 'motorist']), payoutLimiter, async (req: Request, res: Response) => {
  try {
    const { amount, provider, phone } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const amt = parseInt(amount, 10);
    if (!amt || isNaN(amt) || amt < MIN_PAYOUT) {
      return res.status(400).json({ ok: false, message: `Minimum payout is UGX ${MIN_PAYOUT.toLocaleString()}` });
    }
    if (amt > MAX_PAYOUT) {
      return res.status(400).json({ ok: false, message: `Maximum payout is UGX ${MAX_PAYOUT.toLocaleString()} per request` });
    }
    if (!['mtn', 'airtel'].includes(provider)) {
      return res.status(400).json({ ok: false, message: 'Provider must be mtn or airtel' });
    }
    const cleanPhone = normalizePhoneStrict(phone || '');
    if (!cleanPhone) {
      return res.status(400).json({ ok: false, message: 'Enter a valid Ugandan mobile number (07XXXXXXXX)' });
    }

    const reference = `PO-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;

    // PHASE 1 — debit + queue, atomically, and COMMIT before any network call.
    // Holding a row lock across an external HTTP request would starve the pool
    // and risk "money sent but never debited" if the process died mid-call.
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      const walletRes = await tx.query('SELECT balance FROM wallets WHERE userId = ? FOR UPDATE', [userId]);
      const wallet = walletRes.rows[0];
      if (!wallet || Number(wallet.balance) < amt) {
        throw new Error('Insufficient wallet balance for this payout');
      }

      await tx.query('UPDATE wallets SET balance = balance - ? WHERE userId = ?', [amt, userId]);
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note) VALUES (?, ?, ?, ?, ?)',
        [`tx_wd_${Date.now()}_${userId}`, userId, 'withdrawal', -amt, `Payout ${reference} to ${provider.toUpperCase()} ${cleanPhone}`]
      );
      await tx.query(
        'INSERT INTO payouts (id, userId, amount, provider, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
        [reference, userId, amt, provider, cleanPhone, 'pending']
      );

      await tx.query('COMMIT');
      tx.release();
    } catch (e: any) {
      try { await tx.query('ROLLBACK'); } catch {}
      tx.release();
      if (e.message === 'Insufficient wallet balance for this payout') {
        return res.status(400).json({ ok: false, message: 'Insufficient wallet balance for this payout' });
      }
      throw e;
    }

    // PHASE 2 — hand off to the gateway (paid mode) or leave queued for the
    // admin to send manually (free mode). The money is already safely debited.
    const result = await paymentService.requestPayout({
      amount: amt,
      phone: cleanPhone,
      provider,
      reference,
      name: 'NAVIGO Driver Payout',
    });

    if (result.mode === 'manual') {
      // Free mode: stays 'pending' in the admin payout queue.
      return res.json({
        ok: true,
        payout: { id: reference, amount: amt, provider, phone: cleanPhone, status: 'pending' },
        message: 'Payout request received — it will be sent to your Mobile Money shortly.',
      });
    }

    if (result.status === 'failed') {
      // Gateway rejected it → refund in a fresh transaction.
      const refundTx = await db.getTransactionClient();
      try {
        await refundTx.query('BEGIN');
        const claim = await refundTx.query(
          "UPDATE payouts SET status = 'failed', note = ? WHERE id = ? AND status = 'pending'",
          [`Gateway error: ${result.error || 'rejected'}`, reference]
        );
        if (claim.rowCount) {
          await refundTx.query('UPDATE wallets SET balance = balance + ? WHERE userId = ?', [amt, userId]);
          await refundTx.query(
            'INSERT INTO wallet_transactions (id, userId, kind, amount, note) VALUES (?, ?, ?, ?, ?)',
            [`tx_refund_${Date.now()}_${userId}`, userId, 'refund', amt, `Refund — payout ${reference} failed: ${result.error}`]
          );
        }
        await refundTx.query('COMMIT');
        refundTx.release();
      } catch (e) {
        try { await refundTx.query('ROLLBACK'); } catch {}
        refundTx.release();
        console.error(`CRITICAL: refund for failed payout ${reference} did not apply — needs admin review`, e);
      }
      return res.status(400).json({ ok: false, message: `Payout failed: ${result.error}. Your balance was refunded.` });
    }

    await db.run(
      "UPDATE payouts SET status = ?, gatewayRef = ? WHERE id = ?",
      [result.status, result.gatewayRef || null, reference]
    );
    res.json({
      ok: true,
      payout: { id: reference, amount: amt, provider, phone: cleanPhone, status: result.status },
      message: 'Payout sent — check your phone for the Mobile Money prompt.',
    });
  } catch (error) {
    console.error('Payout error:', error);
    res.status(500).json({ ok: false, message: 'Payout request failed. Try again.' });
  }
});

router.get('/payouts', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();
    const payouts = await db.all(
      'SELECT * FROM payouts WHERE userId = ? ORDER BY createdAt DESC LIMIT 20',
      [userId]
    );
    res.json({ ok: true, payouts });
  } catch (error) {
    console.error('Payouts error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch payouts' });
  }
});

router.post('/topup', authenticate, async (req: Request, res: Response) => {
  try {
    const { amount, paymentReference } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const requestedAmount = Number(amount);
    const db = getDB();

    if (!paymentReference) {
      return res.status(400).json({ ok: false, message: 'Payment reference is required for verification' });
    }
    if (!Number.isInteger(requestedAmount) || requestedAmount < MIN_TOPUP || requestedAmount > MAX_TOPUP) {
      return res.status(400).json({ ok: false, message: `Top-up must be between UGX ${MIN_TOPUP.toLocaleString()} and UGX ${MAX_TOPUP.toLocaleString()}` });
    }

    const verification = await paymentService.verifyTransaction(String(paymentReference));
    if (verification.status !== 'success') {
      return res.status(400).json({
        ok: false,
        message: `Payment verification failed: ${verification.error || 'Transaction not found'}`
      });
    }

    const existingTx = await db.get(
      'SELECT id FROM wallet_transactions WHERE reference = ?',
      [paymentReference]
    );
    if (existingTx) {
      return res.status(400).json({
        ok: false,
        message: 'This payment reference has already been processed.'
      });
    }

    if (verification.currency !== 'UGX' || Number(verification.amount) !== requestedAmount) {
      return res.status(400).json({
        ok: false,
        message: `Payment mismatch. Verified: UGX ${Number(verification.amount || 0).toLocaleString()}, requested: UGX ${requestedAmount.toLocaleString()}`
      });
    }

    const transactionId = 'tx_topup_' + Date.now();
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');
      await tx.query(
        'UPDATE wallets SET balance = balance + ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
        [requestedAmount, userId]
      );
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, reference, note) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionId, userId, 'topup', requestedAmount, paymentReference, `Wallet top-up (Ref: ${paymentReference})`]
      );
      await tx.query('COMMIT');
      tx.release();
      res.json({ ok: true, message: 'Wallet top-up successful!' });
    } catch (e: any) {
      await tx.query('ROLLBACK');
      tx.release();
      // 23505 = unique_violation on wallet_transactions.reference — a concurrent
      // request already credited this payment. Never credit twice.
      if (e?.code === '23505') {
        return res.status(400).json({ ok: false, message: 'This payment reference has already been processed.' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Topup error:', error);
    res.status(500).json({ ok: false, message: 'Top-up request failed. Try again.' });
  }
});

export default router;
