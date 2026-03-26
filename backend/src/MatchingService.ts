import { Route } from './models/Route';

export class MatchingService {
  static findMatches(allRoutes: Route[], newRoute: Route): Route[] {
    const matches: Route[] = [];

    for (const existingRoute of allRoutes) {
      if (existingRoute.id === newRoute.id) {
        continue;
      }

      // 1. Time similarity (within 30 minutes)
      const timeDiff = Math.abs(
        this.timeToMinutes(existingRoute.time) - this.timeToMinutes(newRoute.time)
      );
      if (timeDiff > 30) {
        continue;
      }

      // 2. Day similarity (at least one common day)
      const commonDays = existingRoute.days.filter((day) =>
        newRoute.days.includes(day)
      );
      if (commonDays.length === 0) {
        continue;
      }

      // For now, we'll consider origin and destination as simple strings.
      // A more advanced implementation would use geolocation and radius-based search.
      if (
        existingRoute.origin.toLowerCase() === newRoute.origin.toLowerCase() &&
        existingRoute.destination.toLowerCase() === newRoute.destination.toLowerCase()
      ) {
        matches.push(existingRoute);
      }
    }

    return matches;
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
