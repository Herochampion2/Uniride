import axios from 'axios';

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteSegment {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON geometry
}

export interface RouteResult {
  totalDistance: number; // in km
  totalDuration: number; // in seconds
  segments: RouteSegment[];
  geometry: any; // Full route GeoJSON
}

export interface PursuerCandidate {
  id: string;
  name?: string;
  pickup: RoutePoint;
  dropoff: RoutePoint;
}

export interface PursuerDeviationResult {
  id: string;
  name?: string;
  deviationKm: number;
  valid: boolean;
}

export class RoutingService {
  private static readonly OSRM_BASE_URL = 'https://router.project-osrm.org';

  /**
   * Calculate route for multiple waypoints using OSRM
   * @param waypoints Array of route points (start, stops, end)
   * @returns Route result with distance, duration, and geometry
   */
  static async calculateRoute(waypoints: RoutePoint[]): Promise<RouteResult | null> {
    if (waypoints.length < 2) {
      throw new Error('At least 2 waypoints required for routing');
    }

    try {
      // Convert waypoints to OSRM format: lng,lat;lng,lat;...
      const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');

      const url = `${this.OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;

      const response = await axios.get(url);

      if (response.data.code !== 'Ok' || !response.data.routes?.length) {
        console.warn('OSRM routing failed:', response.data);
        return null;
      }

      const route = response.data.routes[0];
      const legs = route.legs || [];

      // Convert meters to km, seconds to minutes for display
      const totalDistance = route.distance / 1000; // km
      const totalDuration = route.duration; // seconds

      const segments: RouteSegment[] = legs.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        geometry: leg.geometry
      }));

      return {
        totalDistance,
        totalDuration,
        segments,
        geometry: route.geometry
      };
    } catch (error) {
      console.error('OSRM routing error:', error);
      return null;
    }
  }

  /**
   * Calculate distance matrix between multiple points
   * @param origins Array of origin points
   * @param destinations Array of destination points
   * @returns Distance matrix in km
   */
  static async calculateDistanceMatrix(
    origins: RoutePoint[],
    destinations: RoutePoint[]
  ): Promise<number[][] | null> {
    try {
      const originCoords = origins.map(o => `${o.lng},${o.lat}`).join(';');
      const destCoords = destinations.map(d => `${d.lng},${d.lat}`).join(';');

      const url = `${this.OSRM_BASE_URL}/table/v1/driving/${originCoords};${destCoords}?annotations=distance`;

      const response = await axios.get(url);

      if (response.data.code !== 'Ok') {
        console.warn('OSRM distance matrix failed:', response.data);
        return null;
      }

      // Convert meters to km
      return response.data.distances.map((row: number[]) =>
        row.map(distance => distance / 1000)
      );
    } catch (error) {
      console.error('OSRM distance matrix error:', error);
      return null;
    }
  }

  /**
   * Optimize route order for multiple stops (Traveling Salesman approximation)
   * @param start Starting point
   * @param stops Array of stops to visit
   * @param end Ending point (optional, defaults to start)
   * @returns Optimized waypoint order
   */
  static async optimizeRoute(
    start: RoutePoint,
    stops: RoutePoint[],
    end?: RoutePoint
  ): Promise<RoutePoint[]> {
    if (stops.length <= 1) {
      return [start, ...stops, ...(end ? [end] : [])];
    }

    // For simplicity, use nearest neighbor heuristic
    // In production, you'd want a more sophisticated TSP solver
    const optimizedStops = [start];
    const remainingStops = [...stops];

    while (remainingStops.length > 0) {
      const lastPoint = optimizedStops[optimizedStops.length - 1];
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      remainingStops.forEach((stop, index) => {
        const distance = this.haversineDistance(
          lastPoint.lat, lastPoint.lng,
          stop.lat, stop.lng
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      optimizedStops.push(remainingStops.splice(nearestIndex, 1)[0]);
    }

    if (end) {
      optimizedStops.push(end);
    }

    return optimizedStops;
  }

  /**
   * Calculate route distance in kilometers using OSRM.
   */
  static async calculateRouteDistanceKm(waypoints: RoutePoint[]): Promise<number | null> {
    const route = await this.calculateRoute(waypoints);
    return route ? route.totalDistance : null;
  }

  /**
   * Calculate deviation in km for a pursuer route relative to the original route.
   */
  static async calculatePursuerDeviationKm(
    driverStart: RoutePoint,
    driverEnd: RoutePoint,
    pickup: RoutePoint,
    dropoff: RoutePoint
  ): Promise<number | null> {
    const originalDistance = await this.calculateRouteDistanceKm([driverStart, driverEnd]);
    if (originalDistance === null) return null;

    const divertedDistance = await this.calculateRouteDistanceKm([
      driverStart,
      pickup,
      dropoff,
      driverEnd,
    ]);

    if (divertedDistance === null) return null;
    return divertedDistance - originalDistance;
  }

  /**
   * Filter pursuers by maximum deviation threshold using OSRM distances.
   */
  static async filterNearbyPursuers(params: {
    driverStart: RoutePoint;
    driverEnd: RoutePoint;
    pursuers: PursuerCandidate[];
    maxDeviationKm?: number;
  }): Promise<PursuerDeviationResult[] | null> {
    const { driverStart, driverEnd, pursuers, maxDeviationKm = 5 } = params;

    const originalDistance = await this.calculateRouteDistanceKm([driverStart, driverEnd]);
    if (originalDistance === null) {
      return null;
    }

    const results: PursuerDeviationResult[] = [];
    for (const pursuer of pursuers) {
      const divertedDistance = await this.calculateRouteDistanceKm([
        driverStart,
        pursuer.pickup,
        pursuer.dropoff,
        driverEnd,
      ]);
      if (divertedDistance === null) {
        results.push({
          id: pursuer.id,
          name: pursuer.name,
          deviationKm: Infinity,
          valid: false,
        });
        continue;
      }
      const deviationKm = divertedDistance - originalDistance;
      results.push({
        id: pursuer.id,
        name: pursuer.name,
        deviationKm,
        valid: deviationKm <= maxDeviationKm,
      });
    }

    return results;
  }

  /**
   * Calculate distance between two points using Haversine formula (fallback)
   */
  private static haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}