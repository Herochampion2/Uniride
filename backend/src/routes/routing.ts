import { Router } from 'express';
import { RoutingService, RoutePoint } from '../RoutingService.js';
import { PricingService } from '../PricingService.js';

const router = Router();

/**
 * POST /api/routing/calculate-route
 * Calculate optimized route for multiple waypoints
 */
router.post('/calculate-route', async (req, res) => {
  try {
    const { waypoints }: { waypoints: RoutePoint[] } = req.body;

    if (!waypoints || waypoints.length < 2) {
      return res.status(400).json({
        error: 'At least 2 waypoints required'
      });
    }

    const route = await RoutingService.calculateRoute(waypoints);

    if (!route) {
      return res.status(500).json({
        error: 'Failed to calculate route'
      });
    }

    res.json(route);
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/routing/distance-matrix
 * Calculate distance matrix between multiple points
 */
router.post('/distance-matrix', async (req, res) => {
  try {
    const { origins, destinations }: { origins: RoutePoint[], destinations: RoutePoint[] } = req.body;

    if (!origins?.length || !destinations?.length) {
      return res.status(400).json({
        error: 'Origins and destinations required'
      });
    }

    const matrix = await RoutingService.calculateDistanceMatrix(origins, destinations);

    if (!matrix) {
      return res.status(500).json({
        error: 'Failed to calculate distance matrix'
      });
    }

    res.json({ distances: matrix });
  } catch (error) {
    console.error('Distance matrix error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/pricing/calculate-ride-pricing
 * Calculate pricing for a ride with multiple passengers
 */
router.post('/calculate-ride-pricing', async (req, res) => {
  try {
    const {
      driverLocation,
      passengerStops,
      vehicleType = '4-wheeler',
      useFuelSharing = false,
      fuelRatePerKm = 2,
      ratePerKm = 4,
      minimumFare = 10
    } = req.body;

    if (!driverLocation || !passengerStops?.length) {
      return res.status(400).json({
        error: 'Driver location and passenger stops required'
      });
    }

    const pricing = PricingService.calculateRidePricing({
      driverLocation,
      passengerStops,
      vehicleType,
      useFuelSharing,
      fuelRatePerKm,
      ratePerKm,
      minimumFare
    });

    res.json(pricing);
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/pricing/fuel-sharing
 * Calculate fuel-sharing fare
 */
router.post('/fuel-sharing', (req, res) => {
  try {
    const {
      totalDistance,
      fuelRatePerKm,
      numberOfPeople,
      minimumFare = 10
    } = req.body;

    if (!totalDistance || !fuelRatePerKm || !numberOfPeople) {
      return res.status(400).json({
        error: 'totalDistance, fuelRatePerKm, and numberOfPeople required'
      });
    }

    const pricing = PricingService.calculateFuelSharingFare({
      totalDistance,
      fuelRatePerKm,
      numberOfPeople,
      minimumFare
    });

    res.json(pricing);
  } catch (error) {
    console.error('Fuel sharing pricing error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/pricing/distance-based
 * Calculate distance-based fare
 */
router.post('/distance-based', (req, res) => {
  try {
    const {
      passengerDistance,
      ratePerKm,
      minimumFare = 10
    } = req.body;

    if (passengerDistance === undefined || !ratePerKm) {
      return res.status(400).json({
        error: 'passengerDistance and ratePerKm required'
      });
    }

    const fare = PricingService.calculateDistanceBasedFare({
      passengerDistance,
      ratePerKm,
      minimumFare
    });

    res.json({ fare });
  } catch (error) {
    console.error('Distance-based pricing error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/routing/filter-pursuers
 * Filter pursuers by maximum route deviation from the original driver route.
 */
router.post('/filter-pursuers', async (req, res) => {
  try {
    const { driverStart, driverEnd, pursuers, maxDeviationKm = 5 } = req.body;

    if (!driverStart || !driverEnd || !Array.isArray(pursuers)) {
      return res.status(400).json({
        error: 'driverStart, driverEnd, and pursuers are required'
      });
    }

    const filtered = await RoutingService.filterNearbyPursuers({
      driverStart,
      driverEnd,
      pursuers,
      maxDeviationKm,
    });

    if (filtered === null) {
      return res.status(500).json({
        error: 'Failed to calculate pursuer deviation'
      });
    }

    res.json({ results: filtered });
  } catch (error) {
    console.error('Pursuer filter error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;