import express, { Request, Response } from 'express';
import { getDB } from '../config/database';

const router = express.Router();

// Define types
interface Driver {
  name: string;
  rating: number;
  vehicle: string;
  plate: string;
  phone: string;
}

interface Ride {
  id: string;
  pickup: any;
  destination: any;
  rideType: string;
  paymentMethod: string;
  fare: any;
  status: string;
  driverId: string | null;
  requestedAt: Date;
  estimatedPickupTime: string;
}

router.post('/request', async (req: Request, res: Response) => {
  try {
    const { pickup, destination, rideType, paymentMethod, fare } = req.body;
    const db = getDB();

    const rideId = Date.now().toString();
    const newRide: any = {
      id: rideId,
      pickup,
      destination,
      rideType,
      paymentMethod,
      fare,
      status: 'searching',
      driverId: null,
      requestedAt: new Date().toISOString(),
      estimatedPickupTime: '3 minutes'
    };

    await db.run(
      'INSERT INTO rides (id, pickup, destination, rideType, paymentMethod, fare, status, driverId, requestedAt, estimatedPickupTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newRide.id,
        JSON.stringify(newRide.pickup),
        JSON.stringify(newRide.destination),
        newRide.rideType,
        newRide.paymentMethod,
        newRide.fare,
        newRide.status,
        newRide.driverId,
        newRide.requestedAt,
        newRide.estimatedPickupTime
      ]
    );

    // REAL MATCHING LOGIC
    // Instead of a hardcoded driver, find an actual available driver in the DB
    setTimeout(async () => {
      try {
        // Find a random approved, online, and available driver
        const availableDrivers = await db.all(
          'SELECT id, name FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ? AND isOnline = TRUE AND isAvailable = TRUE ORDER BY RANDOM() LIMIT 1',
          ['driver', 'motorist', 'approved']
        );

        if (availableDrivers && availableDrivers.length > 0) {
          const matchedDriver = availableDrivers[0];
          const driverId = matchedDriver.id;

          await db.run('UPDATE rides SET status = ?, driverId = ? WHERE id = ?', ['accepted', driverId, rideId]);
          // Mark driver as unavailable so they don't get multiple rides at once
          await db.run('UPDATE users SET isAvailable = 0 WHERE id = ?', [driverId]);

          console.log(`✅ REAL MATCH: Ride ${rideId} accepted by ${matchedDriver.name} (${driverId})`);
        } else {
          console.log(`❌ No available drivers found for ride ${rideId}. Ride remains in searching state.`);
        }
      } catch (e) {
        console.error('Error in real matching logic:', e);
      }
    }, 3000);

    res.status(201).json({
      message: 'Ride requested! Finding drivers...',
      ride: newRide
    });
  } catch (error) {
    console.error('Ride request error:', error);
    res.status(500).json({ message: 'Error requesting ride' });
  }
});

router.get('/estimate-fare', (req: Request, res: Response) => {
  const { distance, rideType } = req.query;
  const dist = parseFloat(distance as string) || 5;

  const fareRates: Record<string, { base: number; perKm: number }> = {
    boda: { base: 2000, perKm: 800 },
    economy: { base: 4000, perKm: 1200 },
    comfort: { base: 7000, perKm: 1800 },
    xl: { base: 10000, perKm: 2200 }
  };

  const rate = fareRates[rideType as string] || fareRates.economy;
  const total = rate.base + (dist * rate.perKm);

  res.json({
    distance: dist,
    estimatedFare: Math.round(total),
    currency: 'UGX',
    formattedTotal: `UGX ${Math.round(total).toLocaleString()}`
  });
});

router.get('/history', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const rides = await db.all('SELECT * FROM rides WHERE status = ?', ['completed']);

    const formattedRides = rides.map((r: any) => ({
      ...r,
      pickup: JSON.parse(r.pickup),
      destination: JSON.parse(r.destination)
    }));

    res.json({ rides: formattedRides });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ride history' });
  }
});

export default router;
