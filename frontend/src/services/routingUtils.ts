/**
 * routingUtils.ts
 * ----------------
 * Utility functions for the UniRide Offer Ride map:
 *   - haversineDistance: straight-line distance between two lat/lon points (km).
 *   - dijkstraWaypointOrder: finds the minimum-cost ordering of pursuer pickup/drop
 *     stops between the driver's current position and final destination.
 *
 * The Dijkstra implementation runs on the small waypoint graph (driver pos, each
 * pursuer's from/to, driver dest). Actual road geometry is fetched from OSRM.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

export interface PursuerStop {
  id: string;
  name: string;
  fromPos: [number, number]; // [lat, lon]
  toPos: [number, number];
  fromName: string;
  toName: string;
}

/** Haversine great-circle distance in km */
export function haversineDistance(a: LatLon, b: LatLon): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const sq =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(sq), Math.sqrt(1 - sq));
}

/**
 * Returns whether a point lies within `thresholdKm` of the straight line
 * segment from `lineStart` to `lineEnd`. Used to filter pursuers near the route.
 */
export function isNearRouteSegment(
  point: LatLon,
  lineStart: LatLon,
  lineEnd: LatLon,
  thresholdKm = 8
): boolean {
  // Parametric closest point on segment
  const dx = lineEnd.lat - lineStart.lat;
  const dy = lineEnd.lon - lineStart.lon;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistance(point, lineStart) <= thresholdKm;

  let t =
    ((point.lat - lineStart.lat) * dx + (point.lon - lineStart.lon) * dy) /
    lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest: LatLon = {
    lat: lineStart.lat + t * dx,
    lon: lineStart.lon + t * dy,
  };
  return haversineDistance(point, closest) <= thresholdKm;
}

interface WaypointNode {
  id: string;
  pos: [number, number];
}

/**
 * Dijkstra-inspired optimal waypoint ordering.
 *
 * Given:
 *   - driverPos: driver's current location
 *   - pursuers: array of selected pursuers (each contributing a pickup + drop)
 *   - driverDest: driver's final destination
 *
 * Returns an ordered array of [lat, lon] waypoints representing the minimum-cost
 * path from driver → [pursuer pickups & drops in optimal order] → driver destination.
 * Cost metric: total Haversine distance between consecutive waypoints.
 *
 * For small N (≤ 3 pursuers = 6 intermediate stops) this brute-forces all
 * permutations and picks the shortest, which is exact and fast.
 * For larger N it falls back to a greedy nearest-neighbour from Dijkstra distances.
 */
export function dijkstraWaypointOrder(
  driverPos: [number, number],
  pursuers: PursuerStop[],
  driverDest: [number, number]
): [number, number][] {
  if (pursuers.length === 0) {
    return [driverPos, driverDest];
  }

  // Build node list: each pursuer contributes a pickup + a drop node.
  // The constraint is: for each pursuer, pickup must come before drop.
  const stops: { pickup: WaypointNode; drop: WaypointNode }[] = pursuers.map(
    (p) => ({
      pickup: { id: `${p.id}_from`, pos: p.fromPos },
      drop: { id: `${p.id}_to`, pos: p.toPos },
    })
  );

  const toLatLon = (pos: [number, number]): LatLon => ({
    lat: pos[0],
    lon: pos[1],
  });
  const dist = (a: [number, number], b: [number, number]) =>
    haversineDistance(toLatLon(a), toLatLon(b));

  if (pursuers.length <= 3) {
    // Brute-force all valid permutations (pickup before matching drop)
    const indices = pursuers.map((_, i) => i);
    const bestResult = { cost: Infinity, path: [] as [number, number][] };

    const permute = (
      arr: number[],
      chosen: { idx: number; isPickup: boolean }[],
      pickedUp: Set<number>
    ) => {
      if (chosen.length === arr.length * 2) {
        // Build path
        let cost = 0;
        let prev = driverPos;
        const path: [number, number][] = [driverPos];
        for (const step of chosen) {
          const pos = step.isPickup
            ? stops[step.idx].pickup.pos
            : stops[step.idx].drop.pos;
          cost += dist(prev, pos);
          prev = pos;
          path.push(pos);
        }
        cost += dist(prev, driverDest);
        path.push(driverDest);
        if (cost < bestResult.cost) {
          bestResult.cost = cost;
          bestResult.path = path;
        }
        return;
      }
      for (const idx of arr) {
        // Try pickup if not picked up yet
        if (!pickedUp.has(idx) && !chosen.find((c) => !c.isPickup && c.idx === idx)) {
          pickedUp.add(idx);
          chosen.push({ idx, isPickup: true });
          permute(arr, chosen, pickedUp);
          chosen.pop();
          pickedUp.delete(idx);
        }
        // Try drop if already picked up but not dropped
        if (
          pickedUp.has(idx) &&
          !chosen.find((c) => !c.isPickup && c.idx === idx)
        ) {
          chosen.push({ idx, isPickup: false });
          permute(arr, chosen, pickedUp);
          chosen.pop();
        }
      }
    };

    permute(indices, [], new Set());
    return bestResult.path;
  }

  // Greedy nearest-neighbour for larger sets (Dijkstra-distance guided)
  // Build distance matrix between all nodes
  const allNodes: [number, number][] = [
    driverPos,
    ...stops.flatMap((s) => [s.pickup.pos, s.drop.pos]),
    driverDest,
  ];

  const n = allNodes.length;
  const distMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => dist(allNodes[i], allNodes[j]))
  );

  // Dijkstra shortest distances from source node 0 (driver pos)
  const shortestFromDriver = dijkstraShortestPaths(distMatrix, 0);

  // Greedy: build path honouring pickup-before-drop constraint
  const visited = new Set<number>([0]);
  const path: [number, number][] = [driverPos];
  const droppedOff = new Set<number>();

  let current = 0;
  while (path.length < n - 1) {
    let best = Infinity;
    let bestNext = -1;

    for (let j = 1; j < n - 1; j++) {
      if (visited.has(j)) continue;
      const stopIdx = Math.floor((j - 1) / 2);
      const isPickup = (j - 1) % 2 === 0;
      // Can only visit drop if pickup was already visited
      if (!isPickup && !visited.has(j - 1)) continue;
      const d = distMatrix[current][j];
      if (d < best) {
        best = d;
        bestNext = j;
      }
    }

    if (bestNext === -1) break;
    visited.add(bestNext);
    path.push(allNodes[bestNext]);
    current = bestNext;
  }
  path.push(driverDest);
  return path;
}

/** Standard Dijkstra on an adjacency/distance matrix, returns shortest distances from src */
function dijkstraShortestPaths(matrix: number[][], src: number): number[] {
  const n = matrix.length;
  const dist = Array(n).fill(Infinity);
  const visited = new Set<number>();
  dist[src] = 0;

  for (let iter = 0; iter < n; iter++) {
    // Pick unvisited node with min dist
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;
    visited.add(u);

    for (let v = 0; v < n; v++) {
      if (visited.has(v)) continue;
      const alt = dist[u] + matrix[u][v];
      if (alt < dist[v]) dist[v] = alt;
    }
  }

  return dist;
}
