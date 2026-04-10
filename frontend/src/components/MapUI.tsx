import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const landmarks = [
  { name: 'IIT Delhi', pos: [28.5450, 77.1926] as [number, number] },
  { name: 'Delhi Tech. University (DTU)', pos: [28.7499, 77.1165] as [number, number] },
  { name: 'Delhi University (North)', pos: [28.6881, 77.2065] as [number, number] },
  { name: 'NSUT Dwarka', pos: [28.6083, 77.0398] as [number, number] },
  { name: 'Jawaharlal Nehru University', pos: [28.5402, 77.1652] as [number, number] },
  { name: 'Jamia Millia Islamia (JMI)', pos: [28.5616, 77.2802] as [number, number] },
  { name: 'GGSIPU Dwarka', pos: [28.5949, 77.0195] as [number, number] },
  { name: 'Delhi University (South)', pos: [28.5835, 77.1664] as [number, number] }
];

const minorLandmarks = [
  { name: 'Maharaja Agrasen Institute of Tech (MAIT)', pos: [28.7196, 77.0661] as [number, number] },
  { name: 'Maharaja Surajmal Institute of Tech (MSIT)', pos: [28.6210, 77.0926] as [number, number] }
];

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090];

export interface MapWaypoint {
  id: string;
  lat: number;
  lng: number;
  type: 'driver' | 'pickup' | 'dropoff';
  name?: string;
  passengerId?: string;
}

const MapUI: React.FC<{
  userLocation?: [number, number];
  zoom?: number;
  waypoints?: MapWaypoint[];
  originMarker?: { name: string; pos: [number, number] };
  destinationMarker?: { name: string; pos: [number, number] };
  onWaypointAdd?: (lat: number, lng: number) => void;
  onWaypointRemove?: (waypointId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showRoute?: boolean;
}> = ({
  userLocation,
  zoom = 11,
  waypoints = [],
  onWaypointAdd,
  onWaypointRemove,
  onMapClick,
  showRoute = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userLocationMarker = useRef<L.Marker | null>(null);
  const waypointMarkers = useRef<Map<string, L.Marker>>(new Map());
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const [routeData, setRouteData] = useState<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(DEFAULT_CENTER, 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors & CARTO'
    }).addTo(mapInstance.current);

    if (onMapClick) {
      mapInstance.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Add landmarks
    const customIcon = L.divIcon({
      className: 'custom-uniride-marker',
      html: `<div style="background-color: var(--primary); width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--accent); box-shadow: 0 4px 10px rgba(0,0,0,0.15);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });

    landmarks.forEach(lm => {
      L.marker(lm.pos, { icon: customIcon })
        .addTo(mapInstance.current!)
        .bindPopup(`<div style="font-weight: 700; color: var(--accent); font-family: 'Inter', sans-serif;">${lm.name}</div><div style="font-size: 0.8rem; color: var(--text-muted); font-family: 'Inter', sans-serif;"><span class="uniride-brand">UniRide</span> Hotspot</div>`);
    });

    const minorIcon = L.divIcon({
      className: 'custom-uniride-marker-minor',
      html: `<div style="background-color: var(--white); width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--text-muted); box-shadow: 0 2px 5px rgba(0,0,0,0.1);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -7]
    });

    minorLandmarks.forEach(lm => {
      L.marker(lm.pos, { icon: minorIcon })
        .addTo(mapInstance.current!)
        .bindPopup(`<div style="font-weight: 600; color: var(--text-muted); font-size: 0.85rem; font-family: 'Inter', sans-serif;">${lm.name}</div>`);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        userLocationMarker.current = null;
        waypointMarkers.current.clear();
      }
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!mapInstance.current || !userLocation) return;

    mapInstance.current.flyTo(userLocation, zoom, { animate: true, duration: 1.5 });

    if (!userLocationMarker.current) {
      const pulseIcon = L.divIcon({
        className: 'custom-uniride-user-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: var(--accent); opacity: 0.2; animation: uniride-pulse 1.5s infinite ease-out;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #60a5fa); border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.25);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });

      userLocationMarker.current = L.marker(userLocation, { icon: pulseIcon })
        .addTo(mapInstance.current)
        .bindPopup(`<span style="font-family: Inter, sans-serif; font-weight: 600; color: var(--accent);">📍 You are here</span>`);
    } else {
      userLocationMarker.current.setLatLng(userLocation);
    }
  }, [userLocation, zoom]);

  // Create waypoint icon based on type
  const createWaypointIcon = (type: string) => {
    const icons = {
      driver: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white;">🚗</div>`,
      pickup: `<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white;">📍</div>`,
      dropoff: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white;">🏁</div>`
    };

    return L.divIcon({
      className: 'custom-waypoint-marker',
      html: icons[type as keyof typeof icons] || icons.pickup,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -11]
    });
  };

  // Update waypoints
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove old markers
    waypointMarkers.current.forEach(marker => {
      marker.remove();
    });
    waypointMarkers.current.clear();

    // Add new markers
    waypoints.forEach((waypoint, index) => {
      const icon = createWaypointIcon(waypoint.type);
      const marker = L.marker([waypoint.lat, waypoint.lng], { icon })
        .addTo(mapInstance.current!)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif;">
            <strong>${waypoint.type.toUpperCase()}</strong><br/>
            ${waypoint.name || `Point ${index + 1}`}<br/>
            <button onclick="window.removeWaypoint('${waypoint.id}')" style="margin-top: 5px; padding: 2px 8px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer;">Remove</button>
          </div>
        `);

      waypointMarkers.current.set(waypoint.id, marker);
    });

    // Expose remove function globally for popup buttons
    (window as any).removeWaypoint = (id: string) => {
      onWaypointRemove?.(id);
    };

    // Fit bounds to show all waypoints
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
      if (userLocation) {
        bounds.extend(userLocation);
      }
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [waypoints, onWaypointRemove]);

  // Calculate and draw route
  useEffect(() => {
    if (!mapInstance.current || !showRoute || waypoints.length < 2) {
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      setRouteData(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const routeWaypoints = waypoints.map(w => ({
          lat: w.lat,
          lng: w.lng,
          name: w.name
        }));

        const response = await fetch('http://localhost:3000/api/routing/calculate-route', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ waypoints: routeWaypoints }),
        });

        if (!response.ok) {
          console.warn('Route calculation failed');
          return;
        }

        const routeResult = await response.json();
        setRouteData(routeResult);

        if (routeLayerRef.current) {
          routeLayerRef.current.remove();
        }

        routeLayerRef.current = L.geoJSON(routeResult.geometry, {
          style: {
            color: '#0ea5e9',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }
        }).addTo(mapInstance.current!);

      } catch (error) {
        console.warn('Failed to fetch route:', error);
      }
    };

    // Debounce route calculation
    const timeoutId = setTimeout(fetchRoute, 500);
    return () => clearTimeout(timeoutId);
  }, [waypoints, showRoute]);

  return (
    <div
      ref={mapRef}
      style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
    />
  );
};

export default MapUI;
