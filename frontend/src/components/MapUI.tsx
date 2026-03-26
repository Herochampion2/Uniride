import React, { useEffect, useRef } from 'react';
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

const MapUI: React.FC<{
  userLocation?: [number, number];
  zoom?: number;
  originMarker?: { pos: [number, number]; name: string };
  destinationMarker?: { pos: [number, number]; name: string };
  onMapClick?: (lat: number, lng: number) => void;
}> = ({ userLocation, zoom = 11, originMarker, destinationMarker, onMapClick }) => { 
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userLocationMarker = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstance.current) {
      return;
    }

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

    // Create a nice custom dot icon matching the theme
    const customIcon = L.divIcon({
      className: 'custom-uniride-marker',
      html: `<div style="background-color: var(--primary); width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--accent); box-shadow: 0 4px 10px rgba(0,0,0,0.15);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });

    // Add landmarks without clustering
    landmarks.forEach(lm => {
      L.marker(lm.pos, { icon: customIcon })
        .addTo(mapInstance.current!)
        .bindPopup(`<div style="font-weight: 700; color: var(--accent); font-family: 'Inter', sans-serif;">${lm.name}</div><div style="font-size: 0.8rem; color: var(--text-muted); font-family: 'Inter', sans-serif;"><span class="uniride-brand">UniRide</span> Hotspot</div>`);
    });

    // Create a smaller, more subtle icon for minor landmarks
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
      }
    };
  }, []);

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

  useEffect(() => {
    if (!mapInstance.current) return;

    // Origin Marker
    if (originMarker) {
      if (!originMarkerRef.current) {
        const icon = L.divIcon({
          className: 'custom-uniride-marker',
          html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -10]
        });
        originMarkerRef.current = L.marker(originMarker.pos, { icon })
          .addTo(mapInstance.current)
          .bindPopup(`<span style="font-family: Inter, sans-serif;"><strong>From:</strong> ${originMarker.name}</span>`);
      } else {
        originMarkerRef.current.setLatLng(originMarker.pos);
        originMarkerRef.current.setPopupContent(`<span style="font-family: Inter, sans-serif;"><strong>From:</strong> ${originMarker.name}</span>`);
      }
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    // Destination Marker
    if (destinationMarker) {
      if (!destinationMarkerRef.current) {
        const icon = L.divIcon({
          className: 'custom-uniride-marker',
          html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -10]
        });
        destinationMarkerRef.current = L.marker(destinationMarker.pos, { icon })
          .addTo(mapInstance.current)
          .bindPopup(`<span style="font-family: Inter, sans-serif;"><strong>To:</strong> ${destinationMarker.name}</span>`);
      } else {
        destinationMarkerRef.current.setLatLng(destinationMarker.pos);
        destinationMarkerRef.current.setPopupContent(`<span style="font-family: Inter, sans-serif;"><strong>To:</strong> ${destinationMarker.name}</span>`);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Auto fit bounds if both are present
    if (originMarker && destinationMarker && mapInstance.current) {
      const bounds = L.latLngBounds([originMarker.pos, destinationMarker.pos]);
      if (userLocation) {
        bounds.extend(userLocation);
      }
      mapInstance.current.flyToBounds(bounds, { padding: [40, 40], duration: 1.5 });

      // Fetch and draw route using OSRM API
      const fetchRoute = async () => {
        try {
          const [lat1, lon1] = originMarker.pos;
          const [lat2, lon2] = destinationMarker.pos;
          const mapRefCtx = mapInstance.current;
          if (!mapRefCtx) return;

          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`);
          
          if (!res.ok) {
            console.warn(`OSRM API error: ${res.status} ${res.statusText}. Skipping route display.`);
            return;
          }

          const contentType = res.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            console.warn('OSRM API returned non-JSON response. Skipping route display.');
            return;
          }

          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const geometry = data.routes[0].geometry;
            
            if (routeLayerRef.current) {
              routeLayerRef.current.remove();
            }
            
            routeLayerRef.current = L.geoJSON(geometry, {
              style: {
                color: '#0ea5e9', // Matching webpage primary blue accent
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }
            }).addTo(mapRefCtx);
          }
        } catch (e) {
          console.warn("Failed to fetch route from OSRM:", e);
          // Silently fail - route display is optional
        }
      };
      
      // Add a small delay to prevent immediate rate limiting on rapid calls
      const timeoutId = setTimeout(fetchRoute, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
    }
  }, [originMarker, destinationMarker]);

  return (
    <div 
      ref={mapRef} 
      style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} 
    />
  );
};

export default MapUI;
