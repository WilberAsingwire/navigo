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
    await db.run('BEGIN');
    try {
      // Deduct from rider
      const riderWallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [riderId]);
      if (!riderWallet || riderWallet.balance < fare) {
        throw new Error('Insufficient wallet balance');
      }

      await db.run(
        'UPDATE wallets SET balance = balance - ? WHERE userId = ?',
        [fare, riderId]
      );

      // Credit driver
      await db.run(
        'UPDATE wallets SET balance = balance + ? WHERE userId = ?',
        [driverShare, driverId]
      );

      // Record rider transaction
      await db.run(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
        [`tx_pay_${Date.now()}_${riderId}`, riderId, 'ride_payment', -fare, `Payment for ride ${rideId}`, rideId]
      );

      // Record driver transaction
      await db.run(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
        [`tx_earn_${Date.now()}_${driverId}`, driverId, 'payout', driverShare, `Earnings from ride ${rideId}`, rideId]
      );

      // Mark ride as settled
      await db.run('UPDATE rides SET settled = true WHERE id = ?', [rideId]);

      await db.run('COMMIT');
      console.log(`✅ Successfully settled ride ${rideId}: UGX ${fare} (Driver: ${driverShare}, Navigo: ${navigoShare})`);
      return { success: true, message: 'Wallet settlement completed' };
    } catch (e: any) {
      await db.run('ROLLBACK');
      throw e;
    }
  } catch (error: any) {
    console.error(`❌ Settlement Error for ride ${rideId}:`, error.message);
    return { success: false, message: error.message };
  }
};
