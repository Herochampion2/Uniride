import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PickupSequenceService } from '../PickupSequenceService.js';
import db from '../db.js';
import { DriverLocation, Ride, RidePassenger, RideStatus } from '../models/Ride.js';
import { PricingService } from '../PricingService.js';
import { MatchingService } from '../MatchingService.js';

const router = Router();
const rideStatuses: RideStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const withPickupSequence = (ride: Ride) => ({
  ...ride,
  pickupSequence: PickupSequenceService.getPickupSequence(ride.passengers),
});

const asNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number') {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

// Haversine distance calculation (in km)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const normalizeExistingPassenger = (ride: Ride, passenger: any, index: number): RidePassenger => {
  const pricingConfig = PricingService.getConfig(ride.pricingConfig);
  const joinedAt =
    typeof passenger?.joinedAt === 'string'
      ? passenger.joinedAt
      : new Date(Date.now() - (index + 1) * 60000).toISOString();

  const baseFare = PricingService.calculateBaseFare({
    pricingConfig,
    explicitBaseFare:
      asNumber(passenger?.baseFare) ||
      asNumber(passenger?.finalFare),
  });

  return {
    id: passenger?.id || `legacy-${index}`,
    name: passenger?.name || 'Passenger',
    email: passenger?.email || `passenger${index}@example.com`,
    university: passenger?.university || '',
    phone: passenger?.phone || '',
    schedule: Array.isArray(passenger?.schedule) ? passenger.schedule : [],
    googleId: passenger?.googleId,
    joinedAt,
    distanceKm: asNumber(passenger?.distanceKm),
    baseFare,
    discountPercent: asNumber(passenger?.discountPercent) || 0,
    discountAmount: asNumber(passenger?.discountAmount) || 0,
    finalFare: asNumber(passenger?.finalFare) || baseFare,
  };
};

// GET all rides (with optional filters)
router.get('/', async (req, res) => {
  await db.read();
  const { origin, destination, date, originLat, originLng, destLat, destLng, radius } = req.query;
  let rides = db.data.rides;

  const radiusKm = radius ? parseFloat(radius as string) : 15; // Default 15km deviation radius

  // If coordinates provided, filter by proximity; otherwise use string matching fallback
  if (originLat && originLng && destLat && destLng) {
    const pLat = parseFloat(originLat as string);
    const pLng = parseFloat(originLng as string);
    const dLat = parseFloat(destLat as string);
    const dLng = parseFloat(destLng as string);

    if (!isNaN(pLat) && !isNaN(pLng) && !isNaN(dLat) && !isNaN(dLng)) {
      rides = rides.filter(r => {
        if (!r.originCoords || !r.destinationCoords) return false;

        // Calculate deviation: Extra distance for driver to pick up and drop off this passenger
        // Path: DriverOrigin -> PassengerOrigin -> PassengerDest -> DriverDest
        const d_rO_pO = haversineDistance(r.originCoords.lat, r.originCoords.lng, pLat, pLng);
        const d_pO_pD = haversineDistance(pLat, pLng, dLat, dLng);
        const d_pD_rD = haversineDistance(dLat, dLng, r.destinationCoords.lat, r.destinationCoords.lng);
        const d_rO_rD = haversineDistance(r.originCoords.lat, r.originCoords.lng, r.destinationCoords.lat, r.destinationCoords.lng);

        const totalDistWithPassenger = d_rO_pO + d_pO_pD + d_pD_rD;
        const deviation = totalDistWithPassenger - d_rO_rD;
        
        // **Directional Check**: Ensure passenger is "on the way"
        // 1. Passenger drop-off should be further from driver origin than passenger pickup is.
        const d_rO_pD = haversineDistance(r.originCoords.lat, r.originCoords.lng, dLat, dLng);
        const isForwardFromOrigin = d_rO_pD > d_rO_pO;

        // 2. Driver destination should be further from passenger pickup than passenger drop-off is.
        const d_pO_rD = haversineDistance(pLat, pLng, r.destinationCoords.lat, r.destinationCoords.lng);
        const isForwardToDestination = d_pO_rD > d_pD_rD;

        // Allow match only if deviation is acceptable AND the direction is logical
        return deviation <= radiusKm && isForwardFromOrigin && isForwardToDestination;
      });
    }
  } else if (origin || destination) {
    // Fallback to string matching if no coordinates provided
    if (origin) {
      rides = rides.filter(r =>
        r.origin.toLowerCase().includes((origin as string).toLowerCase())
      );
    }
    if (destination) {
      rides = rides.filter(r =>
        r.destination.toLowerCase().includes((destination as string).toLowerCase())
      );
    }
  }

  if (date) {
    rides = rides.filter(r => {
      const rideDate = new Date(r.departureTime).toISOString().split('T')[0];
      return rideDate === date;
    });
  }

  // If searching with coordinates, augment rides with passenger-specific fare
  if (originLat && originLng && destLat && destLng) {
    const pLat = parseFloat(originLat as string);
    const pLng = parseFloat(originLng as string);
    const dLat = parseFloat(destLat as string);
    const dLng = parseFloat(destLng as string);

    if (!isNaN(pLat) && !isNaN(pLng) && !isNaN(dLat) && !isNaN(dLng)) {
      const passengerDistance = haversineDistance(pLat, pLng, dLat, dLng);

      const augmentedRides = rides.map(ride => {
        const pricingConfig = PricingService.getConfig(ride.pricingConfig);
        const { finalFare } = PricingService.calculateFinalFare({
          distance: passengerDistance,
          vehicleType: pricingConfig.vehicleType,
          passengerCount: (ride.passengers || []).length + 1,
          origin: { lat: pLat, lng: pLng },
          destination: { lat: dLat, lng: dLng },
          pricingConfig,
        });

        return {
          ...ride,
          passengerFare: finalFare,
          passengerDistance: passengerDistance
        };
      }).filter(ride => ride.passengerFare > 0); // Only show rides where a valid fare is calculated

      const ridesWithPickupSequence = augmentedRides.map(withPickupSequence);
      return res.json(ridesWithPickupSequence);
    }
  }


  const ridesWithPickupSequence = rides.map(withPickupSequence);
  res.json(ridesWithPickupSequence);
});

// GET ride by id
router.get('/:id', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  res.json(withPickupSequence(ride));
});

// POST create a new ride
router.post('/', async (req, res) => {
  await db.read();
  const driverId = req.body.driver?.id;
  if (!driverId) {
    return res.status(400).json({ error: 'Driver ID is required' });
  }

  // Check if driver has an active ride
  const activeRide = db.data.rides.find(r => r.driver.id === driverId && (r.status === 'PENDING' || r.status === 'ACTIVE'));
  if (activeRide) {
    return res.status(400).json({ error: 'Driver already has an active ride' });
  }

  const newRide: Ride = {
    ...req.body,
    id: uuidv4(),
    passengers: [],
    status: 'PENDING',
    tracking: {
      isLive: false,
    },
    pricingConfig: PricingService.getConfig(req.body?.pricingConfig),
  };
  db.data.rides.push(newRide);
  await db.write();
  res.status(201).json(newRide);
});

// POST book a ride (add passenger)
router.post('/:id/book', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find(r => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  if (ride.availableSeats <= 0) {
    return res.status(400).json({ error: 'No seats available' });
  }

  const bookingPayload = req.body || {};
  const distanceKm = asNumber(bookingPayload.distanceKm);
  const explicitBaseFare = asNumber(bookingPayload.baseFare);

  const passengerIdentity = {
    id: bookingPayload.id,
    name: bookingPayload.name,
    email: bookingPayload.email,
    university: bookingPayload.university || '',
    phone: bookingPayload.phone || '',
    schedule: Array.isArray(bookingPayload.schedule) ? bookingPayload.schedule : [],
    googleId: bookingPayload.googleId,
  };

  if (!passengerIdentity.id || !passengerIdentity.name || !passengerIdentity.email) {
    return res.status(400).json({ error: 'Passenger id, name, and email are required' });
  }
  if (passengerIdentity.id === ride.driver?.id) {
    return res.status(400).json({ error: 'Driver cannot book their own ride' });
  }

  ride.passengers = (ride.passengers || []).map((passenger, index) =>
    normalizeExistingPassenger(ride, passenger, index)
  );

  if (ride.passengers.some((passenger) => passenger.id === passengerIdentity.id)) {
    return res.status(400).json({ error: 'Passenger already booked on this ride' });
  }

  ride.pricingConfig = PricingService.getConfig(ride.pricingConfig);

  // Use new pricing calculation with distance and coordinates
  const distance = asNumber(bookingPayload.distanceKm) || ride.distance || 0;
  
  const pricingResult = PricingService.calculateFinalFare({
    distance,
    vehicleType: ride.pricingConfig.vehicleType,
    passengerCount: (ride.passengers || []).length + 1,
    origin: ride.originCoords,
    destination: ride.destinationCoords,
    pricingConfig: ride.pricingConfig,
  });

  const baseFare = pricingResult.baseFare;
  const finalFare = pricingResult.finalFare;

  const newPassenger: RidePassenger = {
    ...passengerIdentity,
    joinedAt: new Date().toISOString(),
    distanceKm: distance,
    baseFare,
    discountPercent: 0,
    discountAmount: 0,
    finalFare,
  };

  ride.passengers = PricingService.applyProgressiveDiscounts(
    [...ride.passengers, newPassenger],
    ride.pricingConfig
  );
  ride.availableSeats -= 1;
  await db.write();

  const bookedPassenger = ride.passengers.find((passenger) => passenger.id === newPassenger.id);
  res.json({
    message: 'Ride booked successfully',
    passenger: bookedPassenger,
    ride: withPickupSequence(ride),
  });
});

// PATCH ride status
router.patch('/:id/status', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  const { status } = req.body as { status?: RideStatus };
  if (!status || !rideStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  ride.status = status;
  ride.tracking = ride.tracking || { isLive: false };
  ride.tracking.isLive = status === 'ACTIVE';
  ride.tracking.lastUpdatedAt = new Date().toISOString();

  await db.write();
  res.json({ message: 'Ride status updated', ride });
});

// GET ride tracking
router.get('/:id/tracking', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  res.json({
    rideId: ride.id,
    status: ride.status || 'PENDING',
    tracking: ride.tracking,
    driver: ride.driver,
    origin: ride.origin,
    destination: ride.destination,
    departureTime: ride.departureTime,
  });
});

// GET passenger route requests matched for a live driver ride
router.get('/:id/pursuers', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  const routes = db.data.routes || [];
  console.log(`[rides/:id/pursuers] rideId=${ride.id} routesCount=${routes.length}`);
  if (routes.length === 0) {
    console.log('[rides/:id/pursuers] no passenger route requests found in database');
  }

  const matches = MatchingService.findPassengerRequestsForDriverRide(ride, routes);
  console.log(`[rides/:id/pursuers] returning ${matches.length} matches`);
  res.json(matches);
});

// POST update live driver location
router.post('/:id/tracking', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find((r) => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  const {
    driverId,
    lat,
    lng,
    heading = null,
    speed = null,
    accuracy = null,
    timestamp,
  } = req.body as {
    driverId?: string;
    lat?: number;
    lng?: number;
    heading?: number | null;
    speed?: number | null;
    accuracy?: number | null;
    timestamp?: string;
  };

  if (!driverId || driverId !== ride.driver?.id) {
    return res.status(403).json({ error: 'Only the driver can update location' });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'Valid lat/lng are required' });
  }

  const driverLocation: DriverLocation = {
    lat,
    lng,
    heading,
    speed,
    accuracy,
    timestamp: timestamp || new Date().toISOString(),
  };

  ride.tracking = ride.tracking || { isLive: false };
  ride.tracking.driverLocation = driverLocation;
  ride.tracking.lastUpdatedAt = new Date().toISOString();

  if (ride.status !== 'ACTIVE') {
    ride.status = 'ACTIVE';
  }
  ride.tracking.isLive = true;

  await db.write();
  res.json({ message: 'Location updated', tracking: ride.tracking, status: ride.status });
});

// POST cancel ride by driver
router.post('/:id/cancel/driver', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find(r => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  if (ride.driver.id !== req.body.driverId) {
    return res.status(403).json({ error: 'Only the driver can cancel the ride' });
  }
  if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Ride is already completed or cancelled' });
  }

  ride.status = 'CANCELLED';
  // Notify passengers (in a real app, send notifications)
  // For now, just mark them as cancelled
  ride.passengers.forEach(passenger => {
    // Reset passenger state - in a real app, update user records
  });

  await db.write();
  res.json({ message: 'Ride cancelled by driver', ride });
});

// POST cancel booking by passenger
router.post('/:id/cancel/passenger', async (req, res) => {
  await db.read();
  const ride = db.data.rides.find(r => r.id === req.params.id);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  const passengerId = req.body.passengerId;
  if (!passengerId) {
    return res.status(400).json({ error: 'Passenger ID is required' });
  }

  const passengerIndex = ride.passengers.findIndex(p => p.id === passengerId);
  if (passengerIndex === -1) {
    return res.status(404).json({ error: 'Passenger not found on this ride' });
  }

  if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Ride is already completed or cancelled' });
  }

  // Remove passenger and increment available seats
  ride.passengers.splice(passengerIndex, 1);
  ride.availableSeats += 1;

  await db.write();
  res.json({ message: 'Booking cancelled by passenger', ride });
});

// DELETE a ride
router.delete('/:id', async (req, res) => {
  await db.read();
  const idx = db.data.rides.findIndex(r => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  db.data.rides.splice(idx, 1);
  await db.write();
  res.json({ message: 'Ride deleted' });
});

export default router;
