import { getDB } from '../config/database';
import { driverShare as calcDriverShare, COMMISSION_RATE } from './fare';

/**
 * Settle a completed ride.
 *
 * THE MODEL (every ride):
 *   Driver earnings = 90% of fareFinal  (100% of any tip, on top)
 *   NAVIGO revenue  = 10% of fareFinal  (flat; never applied to tips)
 *
 * Payment rails:
 *   CASHLESS (wallet) — settles live on the wallets:
 *       rider wallet   − fareFinal      (kind 'ride_payment')
 *       driver wallet  + 90% of fare    (kind 'payout', payoutable)
 *       NAVIGO         + 10% of fare    (kind 'commission', accrues revenue)
 *   CASH — the driver collects the fare physically, so no wallet moves.
 *       We still record the driver's 90% earnings (kind 'cash_trip', NOT
 *       added to the payoutable balance — the driver already holds the cash)
 *       and accrue NAVIGO's 10% (kind 'commission').
 */
export const settleRidePayment = async (rideId: string) => {
  const db = getDB();

  try {
    // 1. Get ride details
    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);

    if (!ride) {
      console.error(`Ride ${rideId} not found for settlement`);
      return { success: true, message: 'Ride already settled' };
    }

    if (!ride.driverId) {
      console.error(`Ride ${rideId} has no driver assigned for settlement`);
      return { success: false, message: 'No driver assigned to ride' };
    }

    const riderId = ride.userId;
    const driverId = ride.driverId;
    const fare = ride.fareFinal;
    const fareDriverShare = calcDriverShare(fare);
    const commission = fare - fareDriverShare;
    const tip = ride.tip || 0;

    // ── CASH ride: record earnings + accrue commission, no wallet movement ──
    if (ride.paymentMethod !== 'wallet') {
      const tx = await db.getTransactionClient();
      try {
        await tx.query('BEGIN');
        const settledRes = await tx.query(
          'UPDATE rides SET settled = TRUE WHERE id = ? AND settled = FALSE',
          [rideId]
        );
        if (settledRes.rowCount === 0) throw new Error('Ride already settled or not found');

        // Cash tip: paid directly in cash to driver, so don't touch wallet balance; record a ledger entry only.
        if (tip > 0) {
          await tx.query(
            'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
            [`tx_cash_tip_${Date.now()}_${driverId}`, driverId, 'cash_tip', tip, `Cash tip for ride ${rideId}`, rideId]
          );
        }
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_cash_${Date.now()}_${driverId}`, driverId, 'cash_trip', fareDriverShare, `Cash earnings for ride ${rideId} (90%)`, rideId]
        );
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_comm_${Date.now()}_${rideId}`, null, 'commission', commission, `Commission on cash ride ${rideId}`, rideId]
        );

        await tx.query('COMMIT');
        tx.release();
        return { success: true, message: 'Cash ride settled (earnings recorded)' };
      } catch (e: any) {
        await tx.query('ROLLBACK');
        tx.release();
        throw e;
      }
    }

    // ── CASHLESS (wallet) ride: full live settlement ──
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      // Double-settlement guard: atomically claim the ride.
      const settledRes = await tx.query(
        'UPDATE rides SET settled = TRUE WHERE id = ? AND settled = FALSE',
        [rideId]
      );
      if (settledRes.rowCount === 0) throw new Error('Ride already settled or not found');

      // 1. Debit the rider the full fare (locked row).
      const riderWalletRes = await tx.query('SELECT balance FROM wallets WHERE userId = ? FOR UPDATE', [riderId]);
      const riderWallet = riderWalletRes.rows[0];
      if (!riderWallet || riderWallet.balance < fare) {
        throw new Error('Insufficient wallet balance');
      }
      await tx.query('UPDATE wallets SET balance = balance - ? WHERE userId = ?', [fare, riderId]);

      // 2. Credit the driver 90% of the fare + 100% of the tip (upsert wallet row).
      const driverCredit = fareDriverShare + tip;
      if (driverCredit > 0) {
        await tx.query(
          `INSERT INTO wallets (userId, balance) VALUES (?, ?)
           ON CONFLICT(userId) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance`,
          [driverId, driverCredit]
        );
      }

      // 3. Ledger entries (rider payment, driver earnings, tip, NAVIGO commission).
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
        [`tx_pay_${Date.now()}_${riderId}`, riderId, 'ride_payment', -fare, `Payment for ride ${rideId}`, rideId]
      );

      if (fareDriverShare > 0) {
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_earn_${Date.now()}_${driverId}`, driverId, 'payout', fareDriverShare, `Earnings from ride ${rideId} (90%)`, rideId]
        );
      }
      if (tip > 0) {
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_tip_${Date.now()}_${driverId}`, driverId, 'tip', tip, `Tip for ride ${rideId} (100% to driver)`, rideId]
        );
      }
      if (commission > 0) {
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_comm_${Date.now()}_${rideId}`, null, 'commission', commission, `Commission on ride ${rideId} (${Math.round(COMMISSION_RATE * 100)}%)`, rideId]
        );
      }

      await tx.query('COMMIT');
      tx.release();
      console.log(`✅ Settled ride ${rideId}: UGX ${fare} → driver ${fareDriverShare}${tip ? ` + tip` : ''}, NAVIGO ${commission}`);
      return { success: true, message: 'Wallet settlement completed' };
    } catch (e: any) {
      await tx.query('ROLLBACK');
      tx.release();
      throw e;
    }
  } catch (error) {
    console.error('Settlement error:', error);
    return { success: false, message: 'Settlement failed' };
  }
};
