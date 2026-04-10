import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Navigation, Play, Square, Clock, User as UserIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { RideService } from '../services/RideService';
import '../styles/feature-pages.css';

interface RideDetails {
  id: string;
  driver?: { id: string; name: string };
  origin: string;
  destination: string;
  departureTime: string;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

interface TrackingSnapshot {
  rideId: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  tracking?: {
    isLive: boolean;
    lastUpdatedAt?: string;
    driverLocation?: DriverLocation;
  };
  driver?: { id?: string; name?: string };
  origin: string;
  destination: string;
  departureTime: string;
}

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090];

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
  const rideFromState = (location.state as { ride?: RideDetails } | null)?.ride ?? null;
  const watchIdRef = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.CircleMarker | null>(null);
  const viewerMarkerRef = useRef<L.CircleMarker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  const [ride, setRide] = useState<RideDetails | null>(rideFromState);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [viewerLocation, setViewerLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');

  const isDriver = ride?.driver?.id === userId;
  const driverLocation = snapshot?.tracking?.driverLocation;

  const mapCenter = useMemo<[number, number]>(() => {
    if (driverLocation) {
      return [driverLocation.lat, driverLocation.lng];
    }
    if (viewerLocation) {
      return [viewerLocation.lat, viewerLocation.lng];
    }
    return DEFAULT_CENTER;
  }, [driverLocation, viewerLocation]);

  const refreshTracker = async () => {
    if (!rideId) {
      return;
    }

    try {
      const ridePromise = rideFromState ? Promise.resolve(rideFromState) : RideService.getRideById(rideId);
      const [rideData, trackingData] = await Promise.all([
        ridePromise,
        RideService.getRideTracking(rideId),
      ]);
      setRide(rideData);
      setSnapshot(trackingData);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error loading tracker:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unable to load tracker details right now.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshTracker();
    if (!rideId) {
      return;
    }
    const poller = setInterval(() => {
      void refreshTracker();
    }, 5000);
    return () => clearInterval(poller);
  }, [rideId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setViewerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize and manage the map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView(mapCenter, 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CARTO'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      // Keep map instance alive for updates
    };
  }, []);

  // Update map center and markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo(mapCenter, 13, { animate: true, duration: 1.5 });

    // Update driver location marker
    if (driverLocation) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.circleMarker([driverLocation.lat, driverLocation.lng], {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.85,
          radius: 10,
          weight: 2,
          className: 'driver-marker'
        }).addTo(mapInstanceRef.current);
      } else {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      }
      
      driverMarkerRef.current.bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:#2563eb;">🚗 Driver Location</strong><br />Updated: ${formatDateTime(driverLocation.timestamp)}</div>`
      );
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    // Update viewer location marker (passenger)
    if (viewerLocation) {
      if (!viewerMarkerRef.current) {
        viewerMarkerRef.current = L.circleMarker([viewerLocation.lat, viewerLocation.lng], {
          color: '#a855f7',
          fillColor: '#d946ef',
          fillOpacity: 0.85,
          radius: 8,
          weight: 2,
          className: 'passenger-marker'
        }).addTo(mapInstanceRef.current);
      } else {
        viewerMarkerRef.current.setLatLng([viewerLocation.lat, viewerLocation.lng]);
      }
      
      viewerMarkerRef.current.bindPopup('<div style="font-family:Inter,sans-serif;"><strong style="color:#a855f7;">👤 Passenger Location</strong></div>');
    } else if (viewerMarkerRef.current) {
      viewerMarkerRef.current.remove();
      viewerMarkerRef.current = null;
    }

    // Update line between driver and viewer
    if (driverLocation && viewerLocation) {
      const positions: [number, number][] = [
        [viewerLocation.lat, viewerLocation.lng],
        [driverLocation.lat, driverLocation.lng],
      ];
      
      if (!lineRef.current) {
        lineRef.current = L.polyline(positions, {
          color: '#64748b',
          dashArray: '6 6',
          weight: 2
        }).addTo(mapInstanceRef.current);
      } else {
        lineRef.current.setLatLngs(positions);
      }
    } else if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }
  }, [driverLocation, viewerLocation, mapCenter]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
      (position) => {
        const latestLocation: DriverLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        };

        setViewerLocation(latestLocation);

        void RideService.updateRideTracking(rideId, {
          driverId: userId,
          lat: latestLocation.lat,
          lng: latestLocation.lng,
          heading: latestLocation.heading,
          speed: latestLocation.speed,
          accuracy: latestLocation.accuracy,
          timestamp: latestLocation.timestamp,
        }).then(() => {
          void refreshTracker();
        }).catch((err) => {
          console.error('Failed to update location:', err);
          // Continue tracking even if update fails
        });
      },
      () => {
        setError('Failed to read your current location. Please allow location permissions.');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const stopSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (rideId) {
      await RideService.updateRideStatus(rideId, 'COMPLETED');
      await refreshTracker();
    }
    setIsSharing(false);
  };

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
                <div>{ride?.driver?.name || 'Unknown'}</div>
              </div>
              <div className="form-group">
                <label><Clock size={14} /> Ride Status</label>
                <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{snapshot?.status || ride?.status || 'scheduled'}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>From</label>
                <div>{ride?.origin || snapshot?.origin || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label>To</label>
                <div>{ride?.destination || snapshot?.destination || 'N/A'}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label><Clock size={14} /> Departure</label>
                <div>{formatDateTime(ride?.departureTime || snapshot?.departureTime)}</div>
              </div>
              <div className="form-group">
                <label>Last Driver Update</label>
                <div>{formatDateTime(snapshot?.tracking?.lastUpdatedAt || driverLocation?.timestamp)}</div>
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
            <div 
              ref={mapContainerRef}
              style={{ height: '360px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
            />
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
