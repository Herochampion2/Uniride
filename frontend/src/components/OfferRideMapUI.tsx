/**
 * OfferRideMapUI.tsx
 * ——————————————————
 * Extended Leaflet map for the Offer Ride post-submission dashboard.
 * Shares the same tile layer and landmark markers as MapUI.tsx but adds:
 *  - Pursuer ping markers (animated amber pulses) clickable along the route
 *  - Optimal multi-stop OSRM route layer (purple) when a pursuer is selected
 *  - Same pistachio/dark-grey/white theme
 */
import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PursuerStop, isNearRouteSegment, haversineDistance } from '../services/routingUtils';

const landmarks = [
  { name: 'IIT Delhi', pos: [28.5450, 77.1926] as [number, number] },
  { name: 'Delhi Tech. University (DTU)', pos: [28.7499, 77.1165] as [number, number] },
  { name: 'Delhi University (North)', pos: [28.6881, 77.2065] as [number, number] },
  { name: 'NSUT Dwarka', pos: [28.6083, 77.0398] as [number, number] },
  { name: 'Jawaharlal Nehru University', pos: [28.5402, 77.1652] as [number, number] },
  { name: 'Jamia Millia Islamia (JMI)', pos: [28.5616, 77.2802] as [number, number] },
  { name: 'GGSIPU Dwarka', pos: [28.5949, 77.0195] as [number, number] },
  { name: 'Delhi University (South)', pos: [28.5835, 77.1664] as [number, number] },
  { name: 'MAIT', pos: [28.7196, 77.0661] as [number, number] },
  { name: 'MSIT', pos: [28.6210, 77.0926] as [number, number] },
];

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090];

// ── Utility: Generate unique route key to force Leaflet layer recreation ──
const generateRouteKey = (waypoints: [number, number][] | null): string => {
  if (!waypoints || waypoints.length === 0) return 'empty';
  // Create hash from first and last coordinate + length
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  return `${first[0]}-${first[1]}-${last[0]}-${last[1]}-${waypoints.length}`;
};

// ── Theme colours (matching index.css vars)
const PISTACHIO  = '#b2d3c2';
const DARK_GREY  = '#41424c';
const ROUTE_BLUE = '#0ea5e9'; // driver route
const OPT_PURPLE = '#7c3aed'; // optimal re-route when pursuer selected
const AMBER      = '#f59e0b'; // pursuer ping (unselected)
const DRIVER_BLUE = '#2563eb'; // driver color
const PASSENGER_PURPLE = '#a855f7'; // passenger color (more distinct)
const CONSTRAINT_RADIUS_KM = 8; // max distance from route to show passengers

export interface OfferRideMapUIProps {
  /** Driver's posted origin */
  originPos?: [number, number];
  originName?: string;
  /** Driver's posted destination */
  destinationPos?: [number, number];
  destinationName?: string;
  /** Driver's current GPS position */
  driverPos?: [number, number];
  /** Pursuers to show as pings on the map */
  pursuerPings: PursuerStop[];
  /** Currently selected pursuer (highlights their route) */
  selectedPursuerId?: string | null;
  /** Called when a pursuer ping is clicked */
  onPursuerClick?: (id: string) => void;
  /** Optimal waypoints from Dijkstra — when set, draws the purple re-route */
  optimalWaypoints?: [number, number][] | null;
  /** Confirmed route after driver accepts a pursuer (solid blue) */
  confirmedRoute?: [number, number][] | null;
  /** Turn-by-turn navigation instruction */
  navigationInstruction?: string;
  /** Confirmed pickup location name */
  confirmedPickupName?: string;
  /** Confirmed destination name */
  confirmedDestinationName?: string;
}

const OfferRideMapUI: React.FC<OfferRideMapUIProps> = ({
  originPos,
  originName,
  destinationPos,
  destinationName,
  driverPos,
  pursuerPings,
  selectedPursuerId,
  onPursuerClick,
  optimalWaypoints,
  confirmedRoute,
  navigationInstruction,
  confirmedPickupName,
  confirmedDestinationName,
}) => {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<L.Map | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const originMarker = useRef<L.Marker | null>(null);
  const destMarker   = useRef<L.Marker | null>(null);
  const routeLayer   = useRef<L.GeoJSON | null>(null);
  const optLayer     = useRef<L.GeoJSON | null>(null);
  const confirmedLayer = useRef<L.GeoJSON | null>(null);
  // pursuer id → marker
  const pursuerMarkers = useRef<Map<string, L.Marker>>(new Map());

  // Filter pursuers that are within the constraint radius from the route
  const filteredPursuerPings = useMemo(() => {
    if (!originPos || !destinationPos) {
      // If no route defined, show all pursuers
      return pursuerPings;
    }

    return pursuerPings.filter(pursuer => {
      // Check if pursuer pickup location is near the route
      const isNearPickup = isNearRouteSegment(
        { lat: pursuer.fromPos[0], lon: pursuer.fromPos[1] },
        { lat: originPos[0], lon: originPos[1] },
        { lat: destinationPos[0], lon: destinationPos[1] },
        CONSTRAINT_RADIUS_KM
      );

      // Also check distance from driver position if available
      if (driverPos && !isNearPickup) {
        const distFromDriver = haversineDistance(
          { lat: pursuer.fromPos[0], lon: pursuer.fromPos[1] },
          { lat: driverPos[0], lon: driverPos[1] }
        );
        return distFromDriver <= CONSTRAINT_RADIUS_KM;
      }

      return isNearPickup;
    });
  }, [pursuerPings, originPos, destinationPos, driverPos]);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, { zoomControl: false })
      .setView(DEFAULT_CENTER, 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &amp; CARTO',
    }).addTo(mapInstance.current);

    // Landmark dots (subtle)
    const landmarkIcon = L.divIcon({
      className: '',
      html: `<div style="background:${PISTACHIO};width:10px;height:10px;border-radius:50%;border:2px solid ${DARK_GREY};opacity:0.7;"></div>`,
      iconSize: [10, 10], iconAnchor: [5, 5], popupAnchor: [0, -8],
    });
    landmarks.forEach(lm => {
      L.marker(lm.pos, { icon: landmarkIcon })
        .addTo(mapInstance.current!)
        .bindPopup(`<div style="font-weight:700;color:${DARK_GREY};font-family:Inter,sans-serif;font-size:0.85rem;">${lm.name}</div><div style="font-size:0.75rem;color:#5a5b66;">UniRide Hotspot</div>`);
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // ── Driver marker ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !driverPos) return;

    const pulseIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${DRIVER_BLUE};opacity:0.18;animation:uniride-pulse 1.5s infinite ease-out;"></div>
          <div style="position:relative;width:14px;height:14px;border-radius:50%;background:${DRIVER_BLUE};border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.25);"></div>
        </div>`,
      iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
    });

    if (!driverMarker.current) {
      driverMarker.current = L.marker(driverPos, { icon: pulseIcon })
        .addTo(mapInstance.current)
        .bindPopup(`<span style="font-family:Inter,sans-serif;font-weight:700;color:${DRIVER_BLUE};">📍 You (Driver)</span>`);
    } else {
      driverMarker.current.setLatLng(driverPos);
    }
  }, [driverPos]);

  // ── Origin / Destination markers + base route ──────────────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Origin
    if (originPos) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.18);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10],
      });
      if (!originMarker.current) {
        originMarker.current = L.marker(originPos, { icon })
          .addTo(map)
          .bindPopup(`<span style="font-family:Inter,sans-serif;"><strong>From:</strong> ${originName ?? ''}</span>`);
      } else {
        originMarker.current.setLatLng(originPos);
      }
    }

    // Destination
    if (destinationPos) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.18);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10],
      });
      if (!destMarker.current) {
        destMarker.current = L.marker(destinationPos, { icon })
          .addTo(map)
          .bindPopup(`<span style="font-family:Inter,sans-serif;"><strong>To:</strong> ${destinationName ?? ''}</span>`);
      } else {
        destMarker.current.setLatLng(destinationPos);
      }
    }

    // Fit bounds and draw base route (only if no confirmed route)
    if (originPos && destinationPos && !confirmedRoute) {
      const bounds = L.latLngBounds([originPos, destinationPos]);
      if (driverPos) bounds.extend(driverPos);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });

      (async () => {
        try {
          const [lat1, lon1] = originPos;
          const [lat2, lon2] = destinationPos;
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          if (data.routes?.length && mapInstance.current) {
            if (routeLayer.current) routeLayer.current.remove();
            routeLayer.current = L.geoJSON(data.routes[0].geometry, {
              style: { color: ROUTE_BLUE, weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round' },
            }).addTo(mapInstance.current);
          }
        } catch {/* silent */ }
      })();
    } else if (confirmedRoute) {
      // Remove base route when confirmed route is active
      if (routeLayer.current) {
        routeLayer.current.remove();
        routeLayer.current = null;
      }
    }
  }, [originPos, destinationPos, originName, destinationName, confirmedRoute]);

  // ── Pursuer ping markers ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const currentIds = new Set(filteredPursuerPings.map(p => p.id));

    // Remove stale markers
    pursuerMarkers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        pursuerMarkers.current.delete(id);
      }
    });

    // Add / update
    filteredPursuerPings.forEach(p => {
      const isSelected = p.id === selectedPursuerId;
      const ringColor  = isSelected ? OPT_PURPLE : PASSENGER_PURPLE;
      const size       = isSelected ? 22 : 18;
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:${size + 10}px;height:${size + 10}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${ringColor};opacity:0.22;animation:uniride-pulse 1.8s infinite ease-out;"></div>
            <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${ringColor};border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
          </div>`,
        iconSize: [size + 10, size + 10],
        iconAnchor: [(size + 10) / 2, (size + 10) / 2],
        popupAnchor: [0, -(size + 10) / 2],
      });

      if (!pursuerMarkers.current.has(p.id)) {
        const marker = L.marker(p.fromPos, { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:Inter,sans-serif;min-width:160px;">
              <div style="font-weight:700;color:${DARK_GREY};margin-bottom:4px;">👤 ${p.name}</div>
              <div style="font-size:0.8rem;color:#5a5b66;"><b>From:</b> ${p.fromName}</div>
              <div style="font-size:0.8rem;color:#5a5b66;"><b>To:</b> ${p.toName}</div>
              <div style="margin-top:8px;font-size:0.78rem;color:${PASSENGER_PURPLE};font-weight:600;">Tap card for optimal route</div>
            </div>`
          );
        marker.on('click', () => onPursuerClick?.(p.id));
        pursuerMarkers.current.set(p.id, marker);
      } else {
        // Update icon to reflect selection state
        pursuerMarkers.current.get(p.id)!.setIcon(icon);
      }
    });
  }, [filteredPursuerPings, selectedPursuerId, onPursuerClick]);

  // ── Optimal re-route (purple) when waypoints change ────────────────────────
  // CRITICAL: Use route key in dependencies to force complete layer destruction
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Completely destroy old layer BEFORE creating new one
    if (optLayer.current) {
      optLayer.current.remove();
      optLayer.current = null; // Critical: null out immediately
    }

    if (!optimalWaypoints || optimalWaypoints.length < 2) return;

    // Build OSRM multi-stop coordinate string
    const coords = optimalWaypoints
      .map(([lat, lon]) => `${lon},${lat}`)
      .join(';');

    (async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.length && mapInstance.current) {
          optLayer.current = L.geoJSON(data.routes[0].geometry, {
            style: {
              color: OPT_PURPLE,
              weight: 6,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: '12, 6',
            },
          }).addTo(mapInstance.current);

          // Fit all waypoints
          const bounds = L.latLngBounds(optimalWaypoints.map(([lat, lon]) => [lat, lon]));
          mapInstance.current.flyToBounds(bounds, { padding: [60, 60], duration: 1.4 });
        }
      } catch {/* silent */ }
    })();
  }, [generateRouteKey(optimalWaypoints ?? null)]);

  // ── Confirmed active navigation route (solid blue) ────────────────────────
  // CRITICAL: Use route key in dependencies to force complete layer destruction
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Completely destroy old layer BEFORE creating new one
    if (confirmedLayer.current) {
      confirmedLayer.current.remove();
      confirmedLayer.current = null; // Critical: null out immediately
    }

    if (!confirmedRoute || confirmedRoute.length < 2) return;

    // Build OSRM multi-stop coordinate string
    const coords = confirmedRoute
      .map(([lat, lon]) => `${lon},${lat}`)
      .join(';');

    (async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.length && mapInstance.current) {
          confirmedLayer.current = L.geoJSON(data.routes[0].geometry, {
            style: {
              color: OPT_PURPLE,
              weight: 8,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }).addTo(mapInstance.current);

          // Fit all waypoints
          const bounds = L.latLngBounds(confirmedRoute.map(([lat, lon]) => [lat, lon]));
          mapInstance.current.flyToBounds(bounds, { padding: [80, 80], duration: 1.8 });
        }
      } catch {/* silent */ }
    })();
  }, [generateRouteKey(confirmedRoute ?? null)]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      
      {/* Navigation instruction overlay */}
      {navigationInstruction && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          zIndex: 10,
          background: 'white',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          border: '2px solid #10b981',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: DARK_GREY, fontSize: '1rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', animation: 'uniride-pulse 1.5s infinite' }} />
            📍 {navigationInstruction}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferRideMapUI;
