import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { paymentService } from '../services/paymentService';

const MIN_PAYOUT = 10000; // UGX — below this, MoMo fees would eat the transfer

const router = express.Router();

router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const db = getDB();
    const wallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [userId]);
    res.json({ ok: true, balance: wallet?.balance || 0 });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to fetch balance' });
  }
});

router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
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

router.post('/payout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, provider, phone } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    const amt = parseInt(amount, 10);
    if (!amt || amt < MIN_PAYOUT) {
      return res.status(400).json({ ok: false, message: `Minimum payout is UGX ${MIN_PAYOUT.toLocaleString()}` });
    }
    if (amt > 2000000) {
      return res.status(400).json({ ok: false, message: 'Maximum payout is UGX 2,000,000 per request' });
    }
    if (!['mtn', 'airtel'].includes(provider)) {
      return res.status(400).json({ ok: false, message: 'Provider must be mtn or airtel' });
    }
    if (!phone || !/^07\d{8}$/.test(phone.replace(/\D/g, '').replace(/^256/, ''))) {
      return res.status(400).json({ ok: false, message: 'Enter a valid Ugandan mobile number (07XXXXXXXXX)' });
    }
    const cleanPhone = phone.replace(/\D/g, '').replace(/^256/, '');

    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      const walletRes = await tx.query('SELECT balance FROM wallets WHERE userId = ? FOR UPDATE', [userId]);
      const wallet = walletRes.rows[0];
      if (!wallet || wallet.balance < amt) {
        throw new Error('Insufficient wallet balance for this payout');
      }

      await tx.query('UPDATE wallets SET balance = balance - ? WHERE userId = ?', [amt, userId]);
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note) VALUES (?, ?, ?, ?, ?)',
        [`tx_wd_${Date.now()}_${userId}`, userId, 'withdrawal', -amt, `Payout to ${provider.toUpperCase()} ${cleanPhone}`]
      );

      const reference = `PO-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
      const result = await paymentService.requestPayout({
        amount: amt,
        phone: cleanPhone,
        provider,
        reference,
        name: 'NAVIGO Driver Payout',
      });

      const status = result.status === 'failed' ? 'failed' : result.status;
      await tx.query(
        'INSERT INTO payouts (id, userId, amount, provider, phone, status, gatewayRef, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [reference, userId, amt, provider, cleanPhone, status, result.gatewayRef || null, result.error || null]
      );

      if (status === 'failed') {
        await tx.query('UPDATE wallets SET balance = balance + ? WHERE userId = ?', [amt, userId]);
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note) VALUES (?, ?, ?, ?, ?)',
          [`tx_refund_${Date.now()}_${userId}`, userId, 'refund', amt, `Refund — payout ${reference} failed: ${result.error}`]
        );
      }

      await tx.query('COMMIT');
      tx.release();

      if (status === 'failed') {
        return res.status(400).json({ ok: false, message: `Payout failed: ${result.error}. Your balance was not changed.` });
      }

      res.json({
        ok: true,
        payout: { id: reference, amount: amt, provider, phone: cleanPhone, status },
        message:
          status === 'processing'
            ? 'Payout sent — check your phone for the Mobile Money prompt.'
            : 'Payout received — it will be processed and sent to your Mobile Money shortly.',
      });
    } catch (e: any) {
      await tx.query('ROLLBACK');
      tx.release();
      if (e.message === 'Insufficient wallet balance for this payout') {
        return res.status(400).json({ ok: false, message: 'Insufficient wallet balance for this payout' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Payout error:', error);
    res.status(500).json({ ok: false, message: 'Payout request failed. Try again.' });
  }
});

router.get('/payouts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
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

router.post('/topup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentReference } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    if (!paymentReference) {
      return res.status(400).json({ ok: false, message: 'Payment reference is required for verification' });
    }

    const verification = await paymentService.verifyTransaction(paymentReference);
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

    if (verification.amount && verification.amount !== amount) {
      return res.status(400).json({
        ok: false,
        message: `Amount mismatch. Verified: ${verification.amount}, Requested: ${amount}`
      });
    }

    const transactionId = 'tx_topup_' + Date.now();
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
      res.json({ ok: true, message: 'Wallet top-up successful!' });
    } catch (e) {
      await tx.query('ROLLBACK');
      tx.release();
      throw e;
    }
  } catch (error) {
    console.error('Topup error:', error);
    res.status(500).json({ ok: false, message: 'Top-up request failed. Try again.' });
  }
});

export default router;
