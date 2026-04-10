import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Navigation, Play, Square, Clock, User as UserIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { RideService } from '../services/RideService';
import '../styles/feature-pages.css';

interface JourneyData {
  rideId: string;
  driver?: { id: string; name: string };
  origin: string;
  destination: string;
  departureTime: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'scheduled' | 'ongoing' | 'cancelled';
  availableSeats?: number;
  passengers?: any[];
  tracking?: {
    isLive: boolean;
    lastUpdatedAt?: string;
    driverLocation?: DriverLocation;
  };
}

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090];

const driverIcon = L.icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'N/A';
  }
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const JourneyTrackerPage: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const { rideId } = useParams<{ rideId: string }>();
  const location = useLocation();
  const journeyFromState = (location.state as { ride?: JourneyData } | null)?.ride ?? null;

  const watchIdRef = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  const [journey, setJourney] = useState<JourneyData | null>(journeyFromState);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(journeyFromState?.tracking?.driverLocation ?? null);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');

  const isDriver = journey?.driver?.id === userId;

  const mapCenter = useMemo<[number, number]>(() => {
    if (driverLocation) {
      return [driverLocation.lat, driverLocation.lng];
    }
    return DEFAULT_CENTER;
  }, [driverLocation]);

  const refreshJourney = async () => {
    if (!rideId) {
      return;
    }

    try {
      const data = await RideService.getJourney(rideId);
      setJourney(data);
      setDriverLocation(data.tracking?.driverLocation ?? null);
      setError('');
    } catch (err) {
      console.error('Error loading journey:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unable to load journey details right now.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshJourney();
    if (!rideId) {
      return;
    }
    const poller = window.setInterval(() => {
      void refreshJourney();
    }, 5000);
    return () => window.clearInterval(poller);
  }, [rideId]);

  const startSharing = async () => {
    if (!rideId) {
      return;
    }
    if (!isDriver) {
      setError('Only the driver can start location sharing.');
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation is not available on this device/browser.');
      return;
    }

    setError('');
    await RideService.updateRideStatus(rideId, 'ACTIVE');
    setIsSharing(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latestLocation: DriverLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        };

        setDriverLocation(latestLocation);

        try {
          await RideService.updateRideTracking(rideId, {
            driverId: userId,
            lat: latestLocation.lat,
            lng: latestLocation.lng,
            heading: latestLocation.heading,
            speed: latestLocation.speed,
            accuracy: latestLocation.accuracy,
            timestamp: latestLocation.timestamp,
          });
          await refreshJourney();
        } catch (err) {
          console.error('Failed to update location:', err);
        }
      },
      () => {
        setError('Failed to read your current location. Please allow location permissions.');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const stopSharing = async () => {
    if (!rideId) {
      return;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await RideService.updateRideStatus(rideId, 'COMPLETED');
    await refreshJourney();
    setIsSharing(false);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapCenter]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (!driverLocation) {
      driverMarkerRef.current?.remove();
      driverMarkerRef.current = null;
      map.setView(DEFAULT_CENTER, 13);
      return;
    }

    const position: [number, number] = [driverLocation.lat, driverLocation.lng];

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(position, { icon: driverIcon }).addTo(map);
    } else {
      driverMarkerRef.current.setLatLng(position);
    }

    driverMarkerRef.current.bindPopup(`Driver location<br/>Updated: ${formatDateTime(driverLocation.timestamp)}`);
    map.setView(position, 13, { animate: true });
  }, [driverLocation]);

  return (
    <div className="feature-page">
      <div className="feature-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="feature-title">
          <div className="feature-title-icon" style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}>
            <Navigation size={24} />
          </div>
          <div>
            <h1>Journey Tracker</h1>
            <p>Live ride location for driver and passengers</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner large" />
          <p>Loading tracker...</p>
        </div>
      ) : (
        <>
          <div className="feature-form glass-card">
            <div className="form-row">
              <div className="form-group">
                <label><UserIcon size={14} /> Driver</label>
                <div>{journey?.driver?.name || 'Unknown'}</div>
              </div>
              <div className="form-group">
                <label><Clock size={14} /> Ride Status</label>
                <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{journey?.status || 'scheduled'}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>From</label>
                <div>{journey?.origin || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label>To</label>
                <div>{journey?.destination || 'N/A'}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label><Clock size={14} /> Departure</label>
                <div>{formatDateTime(journey?.departureTime)}</div>
              </div>
              <div className="form-group">
                <label>Last Driver Update</label>
                <div>{formatDateTime(journey?.tracking?.lastUpdatedAt || journey?.tracking?.driverLocation?.timestamp)}</div>
              </div>
            </div>

            {isDriver && (
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button className="primary-btn" onClick={startSharing} disabled={isSharing}>
                  <Play size={16} /> Start Live Sharing
                </button>
                <button className="secondary-btn" onClick={stopSharing} disabled={!isSharing}>
                  <Square size={16} /> Stop Sharing
                </button>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div ref={mapContainerRef} style={{ height: '360px', width: '100%' }} />

            {!driverLocation && (
              <p style={{ marginTop: '0.8rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Driver has not started live location sharing yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default JourneyTrackerPage;
