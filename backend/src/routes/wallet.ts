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

// ─── Start a wallet top-up ────────────────────────────────
// Creates a tracked intent and, if a real payment gateway is configured,
// a hosted Flutterwave checkout link. Without gateway keys (dev/demo), it
// returns 'simulation' mode so local development keeps working end-to-end.
router.post('/topup/initiate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    const amt = parseInt(amount, 10);
    if (!amt || amt < 1000) {
      return res.status(400).json({ ok: false, message: 'Minimum top-up is UGX 1,000' });
    }
    if (amt > 5000000) {
      return res.status(400).json({ ok: false, message: 'Maximum top-up is UGX 5,000,000 per transaction' });
    }

    const user = await db.get('SELECT fullName, email, phone FROM users WHERE id = ?', [userId]);
    const reference = `topup_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    await db.run(
      'INSERT INTO topup_intents (id, userId, amount, status) VALUES (?, ?, ?, ?)',
      [reference, userId, amt, 'pending']
    );

    const publicUrl = process.env.PUBLIC_FRONTEND_URL || 'https://navigo-five.vercel.app';
    const result = await paymentService.initiateTopUp({
      amount: amt,
      reference,
      email: user?.email || `${user?.phone || userId}@navigo.app`,
      name: user?.fullName || 'NAVIGO Rider',
      phone: user?.phone,
      redirectUrl: `${publicUrl}/customer/payments?topup_ref=${reference}`,
    });

    if (result.mode === 'gateway' && !result.checkoutUrl) {
      return res.status(502).json({ ok: false, message: result.error || 'Could not start payment' });
    }

    res.json({
      ok: true,
      mode: result.mode,
      reference,
      checkoutUrl: result.checkoutUrl || null,
    });
  } catch (error) {
    console.error('Topup initiate error:', error);
    res.status(500).json({ ok: false, message: 'Could not start top-up. Try again.' });
  }
});

// ─── Verify + credit a wallet top-up ───────────────────────
router.post('/topup/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reference, transactionId } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    if (!reference) {
      return res.status(400).json({ ok: false, message: 'Missing top-up reference' });
    }

    const intent = await db.get(
      'SELECT * FROM topup_intents WHERE id = ? AND userId = ?',
      [reference, userId]
    );
    if (!intent) return res.status(404).json({ ok: false, message: 'Top-up not found' });
    if (intent.status === 'success') {
      return res.json({ ok: true, message: 'This top-up was already credited to your wallet.' });
    }

    // In gateway mode we must verify the real transaction with Flutterwave using
    // the numeric transaction_id it redirected back with. In simulation mode
    // (no gateway configured) the intent itself is the source of truth.
    const usingGateway = !!process.env.FLUTTERWAVE_SECRET_KEY;
    if (usingGateway) {
      if (!transactionId) {
        return res.status(400).json({ ok: false, message: 'Missing transaction id from payment provider' });
      }
      const verification = await paymentService.verifyTransaction(transactionId);
      if (verification.status !== 'success') {
        await db.run('UPDATE topup_intents SET status = ? WHERE id = ?', ['failed', reference]);
        return res.status(400).json({ ok: false, message: `Payment verification failed: ${verification.error || 'Transaction not successful'}` });
      }
      if (verification.tx_ref !== reference) {
        return res.status(400).json({ ok: false, message: 'Transaction reference mismatch' });
      }
      if (verification.amount && verification.amount !== intent.amount) {
        return res.status(400).json({ ok: false, message: 'Amount mismatch — payment not credited' });
      }
    }

    const transactionRowId = 'tx_topup_' + Date.now();
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      const claimRes = await tx.query(
        "UPDATE topup_intents SET status = 'success' WHERE id = ? AND status != 'success'",
        [reference]
      );
      if (claimRes.rowCount === 0) throw new Error('ALREADY_CREDITED');

      // Upsert: a wallet row may not exist yet for a brand-new user.
      await tx.query(
        `INSERT INTO wallets (userId, balance) VALUES (?, ?)
         ON CONFLICT(userId) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updatedAt = CURRENT_TIMESTAMP`,
        [userId, intent.amount]
      );
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, reference, note) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionRowId, userId, 'topup', intent.amount, reference, `Wallet top-up (Ref: ${reference})`]
      );

      await tx.query('COMMIT');
      tx.release();
      res.json({ ok: true, message: 'Wallet top-up successful!', amount: intent.amount });
    } catch (e: any) {
      await tx.query('ROLLBACK');
      tx.release();
      if (e.message === 'ALREADY_CREDITED') {
        return res.json({ ok: true, message: 'This top-up was already credited to your wallet.' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Topup verify error:', error);
    res.status(500).json({ ok: false, message: 'Top-up verification failed. Try again.' });
  }
});

export default router;
