import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/:id', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  return res.json({
    rideId: ride.id,
    driver: ride.driver,
    origin: ride.origin,
    destination: ride.destination,
    departureTime: ride.departureTime,
    status: ride.status || 'PENDING',
    availableSeats: ride.availableSeats,
    passengers: ride.passengers || [],
    tracking: ride.tracking || { isLive: false },
  });
});

export default router;
