import express, { Request, Response } from 'express';

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
  driver: Driver | null;  // ← FIX: Allow null OR Driver object
  requestedAt: Date;
  estimatedPickupTime: string;
}

// Temporary in-memory store
const rides: Ride[] = [];

router.post('/request', (req: Request, res: Response) => {
  try {
    const { pickup, destination, rideType, paymentMethod, fare } = req.body;
    
    const newRide: Ride = {
      id: Date.now().toString(),
      pickup,
      destination,
      rideType,
      paymentMethod,
      fare,
      status: 'searching',
      driver: null,
      requestedAt: new Date(),
      estimatedPickupTime: '3 minutes'
    };

    rides.push(newRide);

    // Simulate finding a driver after 3 seconds
    setTimeout(() => {
      newRide.status = 'accepted';
      newRide.driver = {
        name: 'John K.',
        rating: 4.8,
        vehicle: 'Toyota Prius',
        plate: 'UBA 123A',
        phone: '+256772000000'
      };
    }, 3000);

    res.status(201).json({ 
      message: 'Ride requested! Finding drivers...', 
      ride: newRide
    });
  } catch (error) {
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

router.get('/history', (_req: Request, res: Response) => {
  res.json({ rides: rides.filter(r => r.status === 'completed') });
});

export default router;