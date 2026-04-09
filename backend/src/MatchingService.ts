import { Ride } from './models/Ride';

/**
 * Passenger request interface for matching
 */
export interface PassengerRequest {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  seatsNeeded: number;
}

/**
 * Match result interface with scoring information
 */
export interface MatchResult {
  ride: Ride;
  pickupDistance: number; // Distance from driver's current location to passenger pickup
  detourPercentage: number; // Percentage of detour compared to original route
  score: number; // Match quality score for sorting
}

export class MatchingService {
  /**
   * Maximum pickup distance in kilometers (3km radius)
   */
  private static readonly MAX_PICKUP_DISTANCE_KM = 3;

  /**
   * Maximum allowed detour percentage (120% = 20% detour tolerance)
   */
  private static readonly MAX_DETOUR_PERCENTAGE = 1.2;

  /**
   * Find matching rides for a passenger request using Uber-style logic
   *
   * Algorithm:
   * 1. Filter rides by availability (status & seat requirements)
   * 2. Calculate pickup proximity using Haversine formula
   * 3. Validate route alignment with detour tolerance
   * 4. Sort by pickup distance (closest first)
   *
   * @param allRides - Array of all active rides from LowDB
   * @param request - Passenger's pickup/dropoff coordinates and seat needs
   * @returns Sorted array of matching rides
   */
  static findMatches(allRides: Ride[], request: PassengerRequest): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const ride of allRides) {
      // ============================================
      // FILTER 1: Availability Check
      // ============================================
      // Only consider PENDING or IN_PROGRESS rides with sufficient seats
      const status = ride.status as string;
      if (status !== 'pending' && status !== 'in_progress' && status !== 'ongoing') {
        continue;
      }

      if (ride.availableSeats < request.seatsNeeded) {
        continue;
      }

      // Ensure ride has coordinate data
      if (!ride.originCoords || !ride.destinationCoords) {
        continue;
      }

      // ============================================
      // FILTER 2: Pickup Proximity (Haversine)
      // ============================================
      // Get driver's current location (live tracking or origin)
      const driverLat = ride.tracking?.driverLocation?.lat ?? ride.originCoords.lat;
      const driverLng = ride.tracking?.driverLocation?.lng ?? ride.originCoords.lng;

      const pickupDistance = this.haversineDistance(
        driverLat,
        driverLng,
        request.pickupLat,
        request.pickupLng
      );

      // Driver must be within 3km of passenger's pickup
      if (pickupDistance > this.MAX_PICKUP_DISTANCE_KM) {
        continue;
      }

      // ============================================
      // FILTER 3: Route Alignment Check
      // ============================================
      // Calculate detour to determine if driver is heading in the right direction
      const detourPercentage = this.calculateDetourPercentage(
        driverLat,
        driverLng,
        request.pickupLat,
        request.pickupLng,
        request.dropoffLat,
        request.dropoffLng,
        ride.destinationCoords.lat,
        ride.destinationCoords.lng
      );

      // Route detour must not exceed MAX_DETOUR_PERCENTAGE (120%)
      if (detourPercentage > this.MAX_DETOUR_PERCENTAGE) {
        continue;
      }

      // ============================================
      // Match Found: Calculate Score
      // ============================================
      // Score prioritizes: pickup distance first, then detour
      // Lower score = better match
      const score = pickupDistance * 2 + (detourPercentage - 1) * 100;

      matches.push({
        ride,
        pickupDistance,
        detourPercentage,
        score,
      });
    }

    // Sort by score (closest pickup distance, then smallest detour)
    matches.sort((a, b) => a.score - b.score);

    return matches;
  }

  /**
   * Haversine Formula: Calculate great-circle distance between two points
   * on Earth given their latitude/longitude
   *
   * Formula:
   * a = sin²(Δφ/2) + cos φ₁ ⋅ cos φ₂ ⋅ sin²(Δλ/2)
   * c = 2 ⋅ atan2(√a, √(1−a))
   * d = R ⋅ c
   *
   * where φ is latitude, λ is longitude, R is Earth's radius (6371 km)
   *
   * @param lat1 - Latitude of point 1
   * @param lng1 - Longitude of point 1
   * @param lat2 - Latitude of point 2
   * @param lng2 - Longitude of point 2
   * @returns Distance in kilometers
   */
  private static haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers

    // Convert degrees to radians
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    // Haversine formula
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Calculate detour percentage for route alignment
   *
   * This function determines if the driver is heading in a similar direction
   * as the passenger's route. It uses the concept of "detour cost"—the ratio
   * of the actual path length to the ideal path length.
   *
   * Path Calculation:
   * - Original Route: Driver's origin → Driver's destination
   * - Hypothetical Route: Driver's origin → Passenger pickup → Passenger dropoff → Driver's destination
   *
   * Detour Percentage = Hypothetical Route Distance / Original Route Distance
   *
   * Example:
   * - Original: 10 km
   * - With passenger: 12 km
   * - Detour = 12/10 = 1.2 (20% detour, acceptable)
   * - Detour = 14/10 = 1.4 (40% detour, rejected)
   *
   * @param driverLat - Driver's current/starting latitude
   * @param driverLng - Driver's current/starting longitude
   * @param passengerPickupLat - Passenger's pickup latitude
   * @param passengerPickupLng - Passenger's pickup longitude
   * @param passengerDropoffLat - Passenger's dropoff latitude
   * @param passengerDropoffLng - Passenger's dropoff longitude
   * @param driverDestinationLat - Driver's destination latitude
   * @param driverDestinationLng - Driver's destination longitude
   * @returns Detour percentage (1.0 = no detour, 1.2 = 20% detour)
   */
  private static calculateDetourPercentage(
    driverLat: number,
    driverLng: number,
    passengerPickupLat: number,
    passengerPickupLng: number,
    passengerDropoffLat: number,
    passengerDropoffLng: number,
    driverDestinationLat: number,
    driverDestinationLng: number
  ): number {
    // Original route: Driver start → Driver destination
    const originalDistance = this.haversineDistance(
      driverLat,
      driverLng,
      driverDestinationLat,
      driverDestinationLng
    );

    // If original distance is negligible, reject to avoid division by zero
    if (originalDistance < 0.1) {
      return this.MAX_DETOUR_PERCENTAGE + 1;
    }

    // Hypothetical route with passenger:
    // Driver start → Passenger pickup → Passenger dropoff → Driver destination
    const distanceToPickup = this.haversineDistance(
      driverLat,
      driverLng,
      passengerPickupLat,
      passengerPickupLng
    );

    const distancePickupToDropoff = this.haversineDistance(
      passengerPickupLat,
      passengerPickupLng,
      passengerDropoffLat,
      passengerDropoffLng
    );

    const distanceDropoffToDestination = this.haversineDistance(
      passengerDropoffLat,
      passengerDropoffLng,
      driverDestinationLat,
      driverDestinationLng
    );

    const hypotheticalDistance =
      distanceToPickup + distancePickupToDropoff + distanceDropoffToDestination;

    // Calculate detour as a ratio
    const detourPercentage = hypotheticalDistance / originalDistance;

    return detourPercentage;
  }
}
