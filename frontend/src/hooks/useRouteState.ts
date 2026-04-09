/**
 * useRouteState.ts
 * ────────────────
 * Custom hook providing strict route state management for Leaflet map layer fixes.
 * Ensures state updates COMPLETELY OVERWRITE previous route data (no spreading).
 * This triggers proper effect dependencies and forces Leaflet layer recreation.
 */

import { useState, useCallback } from 'react';

export const useRouteState = () => {
  const [optimalWaypoints, setOptimalWaypointsRaw] = useState<[number, number][] | null>(null);
  const [confirmedRoute, setConfirmedRouteRaw] = useState<[number, number][] | null>(null);

  /**
   * CRITICAL: Completely replace optimal waypoints.
   * Never use spreading (...prev) — this breaks Leaflet layer key detection.
   */
  const setOptimalWaypoints = useCallback((waypoints: [number, number][] | null) => {
    setOptimalWaypointsRaw(waypoints);
  }, []);

  /**
   * CRITICAL: Completely replace confirmed route.
   * Never use spreading (...prev) — this breaks Leaflet layer key detection.
   */
  const setConfirmedRoute = useCallback((route: [number, number][] | null) => {
    setConfirmedRouteRaw(route);
  }, []);

  return {
    optimalWaypoints,
    setOptimalWaypoints,
    confirmedRoute,
    setConfirmedRoute,
  };
};
