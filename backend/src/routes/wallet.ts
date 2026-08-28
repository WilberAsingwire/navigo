import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// ─── Get Wallet Balance ──────────────────────────────────────
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const db = getDB();

    // Try to get existing wallet balance
    const wallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [userId]);

    if (wallet) {
      res.json({ ok: true, balance: wallet.balance });
    } else {
      // Create a wallet if it doesn't exist (Lazy initialization)
      await db.run('INSERT INTO wallets (userId, balance) VALUES (?, 0)', [userId]);
      res.json({ ok: true, balance: 0 });
    }
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch wallet balance' });
  }
});

// ─── Top Up Wallet ──────────────────────────────────────────
router.post('/topup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentReference } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    if (!amount || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid top-up amount' });
    }

    if (!paymentReference) {
      return res.status(400).json({ ok: false, message: 'Payment reference is required for verification' });
    }

    const transactionId = 'tx_topup_' + Date.now();

    // Use a dedicated client for the transaction
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      // NOTE: In production, you MUST verify the paymentReference via a payment gateway (MoMo/Airtel)
      // before proceeding with the update. This is currently a placeholder.

      await tx.query(
        'UPDATE wallets SET balance = balance + ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
        [amount, userId]
      );
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note) VALUES (?, ?, ?, ?, ?)',
        [transactionId, userId, 'topup', amount, `Wallet top-up (Ref: ${paymentReference})`]
      );
      await tx.query('COMMIT');
      tx.release();

      const wallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [userId]);
      res.json({ ok: true, balance: wallet?.balance });
    } catch (e) {
      await tx.query('ROLLBACK');
      tx.release();
      throw e;
    }
  } catch (error) {
    console.error('Top-up error:', error);
    res.status(500).json({ ok: false, message: 'Top-up failed' });
  }
});

export default router;
