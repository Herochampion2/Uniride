import { MapWaypoint } from '../components/MapUI';

export interface RouteResult {
  totalDistance: number;
  totalDuration: number;
  segments: any[];
  geometry: any;
}

export interface PricingResult {
  totalDistance: number;
  passengerFares: Array<{
    passengerId: string;
    distance: number;
    fare: number;
  }>;
  totalCost: number;
  driverContribution: number;
}

export interface FuelSharingResult {
  fuelCost: number;
  passengerFare: number;
  totalCost: number;
  driverContribution: number;
}

export interface PursuerFilterCandidate {
  id: string;
  name?: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
}

export interface PursuerDeviationResult {
  id: string;
  name?: string;
  deviationKm: number;
  valid: boolean;
}

class RoutingService {
  private static readonly API_BASE = '/api';

  /**
   * Calculate route for multiple waypoints
   */
  static async calculateRoute(waypoints: MapWaypoint[]): Promise<RouteResult | null> {
    try {
      const response = await fetch(`${this.API_BASE}/routing/calculate-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waypoints: waypoints.map(w => ({
            lat: w.lat,
            lng: w.lng,
            name: w.name
          }))
        }),
      });

      if (!response.ok) {
        console.error('Route calculation failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Route calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate pricing for a ride with multiple passengers
   */
  static async calculateRidePricing(params: {
    driverLocation: { lat: number; lng: number };
    passengerStops: Array<{
      pickup: { lat: number; lng: number };
      dropoff: { lat: number; lng: number };
      passengerId: string;
    }>;
    vehicleType?: '2-wheeler' | '4-wheeler';
    useFuelSharing?: boolean;
    fuelRatePerKm?: number;
    ratePerKm?: number;
    minimumFare?: number;
  }): Promise<PricingResult | null> {
    try {
      const response = await fetch(`${this.API_BASE}/routing/calculate-ride-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error('Pricing calculation failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Pricing calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate fuel-sharing pricing
   */
  static async calculateFuelSharing(params: {
    totalDistance: number;
    fuelRatePerKm: number;
    numberOfPeople: number;
    minimumFare?: number;
  }): Promise<FuelSharingResult | null> {
    try {
      const response = await fetch(`${this.API_BASE}/routing/fuel-sharing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error('Fuel sharing calculation failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Fuel sharing calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate distance-based pricing
   */
  static async calculateDistanceBased(params: {
    passengerDistance: number;
    ratePerKm: number;
    minimumFare?: number;
  }): Promise<{ fare: number } | null> {
    try {
      const response = await fetch(`${this.API_BASE}/routing/distance-based`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error('Distance-based calculation failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Distance-based calculation error:', error);
      return null;
    }
  }

  /**
   * Filter pursuers based on maximum deviation from the original driver route.
   */
  static async filterNearbyPursuers(params: {
    driverStart: { lat: number; lng: number };
    driverEnd: { lat: number; lng: number };
    pursuers: PursuerFilterCandidate[];
    maxDeviationKm?: number;
  }): Promise<{ results: PursuerDeviationResult[] } | null> {
    try {
      const response = await fetch(`${this.API_BASE}/routing/filter-pursuers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error('Pursuer filtering failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Pursuer filtering error:', error);
      return null;
    }
  }
}

export default RoutingService;