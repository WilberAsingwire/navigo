import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { paymentService } from '../services/paymentService';

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

    // Verify the payment with the gateway
    const verification = await paymentService.verifyTransaction(paymentReference);
    if (verification.status !== 'success') {
      return res.status(400).json({
        ok: false,
        message: `Payment verification failed: ${verification.error || 'Transaction not found'}`
      });
    }

    // Idempotency Check: Ensure this payment reference hasn't been used already
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

    // Security check: Verify that the verified amount matches the requested top-up amount
    if (verification.amount && verification.amount !== amount) {
      return res.status(400).json({
        ok: false,
        message: `Amount mismatch. Verified: ${verification.amount}, Requested: ${amount}`
      });
    }

    const transactionId = 'tx_topup_' + Date.now();

    // Use a dedicated client for the transaction
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      await tx.query(
        'UPDATE wallets SET balance = balance + ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
        [amount, userId]
      );
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, reference, note) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionId, userId, 'topup', amount, paymentReference, `Wallet top-up (Ref: ${paymentReference})`]
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
