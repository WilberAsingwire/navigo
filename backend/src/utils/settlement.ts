import { getDB } from '../config/database';

export const settleRidePayment = async (rideId: string) => {
  const db = getDB();

  try {
    // 1. Get ride details
    const ride = await db.get(
      'SELECT * FROM rides WHERE id = ?',
      [rideId]
    );

    if (!ride) {
      console.error(`Ride ${rideId} not found for settlement`);
      return { success: false, message: 'Ride not found' };
    }

    if (ride.settled) {
      return { success: true, message: 'Ride already settled' };
    }

    // Only process wallet payments; cash is handled physically by users
    if (ride.paymentMethod !== 'wallet') {
      await db.run('UPDATE rides SET settled = true WHERE id = ?', [rideId]);
      return { success: true, message: 'Ride marked as settled (Cash)' };
    }

    const riderId = ride.userId;
    const driverId = ride.driverId;
    const fare = ride.fareFinal;
    const commissionRate = 0.10; // 10% commission for Navigo
    const driverShare = Math.round(fare * (1 - commissionRate));
    const navigoShare = fare - driverShare;

    if (!driverId) {
      console.error(`Ride ${rideId} has no driver assigned for settlement`);
      return { success: false, message: 'No driver assigned to ride' };
    }

    // 2. Atomic Wallet Transfer
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');

      // Double-settlement guard: Check and set settled = true atomically
      const settledRes = await tx.query('UPDATE rides SET settled = TRUE WHERE id = ? AND settled = FALSE', [rideId]);
      if (settledRes.rowCount === 0) {
        throw new Error('Ride already settled or not found');
      }

      // Deduct from rider
      const riderWalletRes = await tx.query('SELECT balance FROM wallets WHERE userId = ? FOR UPDATE', [riderId]);
      const riderWallet = riderWalletRes.rows[0];
      if (!riderWallet || riderWallet.balance < fare) {
        throw new Error('Insufficient wallet balance');
      }

      await tx.query(
        'UPDATE wallets SET balance = balance - ? WHERE userId = ?',
        [fare, riderId]
      );

      // Credit driver (UPSERT to handle missing wallet row)
      await tx.query(
        `INSERT INTO wallets (userId, balance) VALUES (?, ?)
         ON CONFLICT(userId) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance`,
        [driverId, driverShare]
      );

      // Record rider transaction
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
        [`tx_pay_${Date.now()}_${riderId}`, riderId, 'ride_payment', -fare, `Payment for ride ${rideId}`, rideId]
      );

      // Record driver transaction
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
        [`tx_earn_${Date.now()}_${driverId}`, driverId, 'payout', driverShare, `Earnings from ride ${rideId}`, rideId]
      );

      await tx.query('COMMIT');
      tx.release();
      console.log(`✅ Successfully settled ride ${rideId}: UGX ${fare} (Driver: ${driverShare}, Navigo: ${navigoShare})`);
      return { success: true, message: 'Wallet settlement completed' };
    } catch (e: any) {
      await tx.query('ROLLBACK');
      tx.release();
      throw e;
    }
  } catch (error: any) {
    console.error(`❌ Settlement Error for ride ${rideId}:`, error.message);
    return { success: false, message: error.message };
  }
};
