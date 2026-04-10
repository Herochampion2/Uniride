import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { RideService } from '../services/RideService';
import { Ride } from '../models/Ride';
import '../styles/feature-pages.css';

interface PursuerMatchResult {
  id: string;
  user: {
    id: string;
    name: string;
    email?: string;
    university?: string;
    phone?: string;
  };
  origin: string;
  destination: string;
  time: string;
  days: string[];
  pickupDistanceKm?: number;
  timeDeltaMinutes?: number;
  score: number;
}

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090];
const DEFAULT_ZOOM = 12;

const LiveRidePage: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { rideId } = useParams<{ rideId: string }>();
  const rideFromState = (location.state as { ride?: Ride } | null)?.ride ?? null;

  const [ride, setRide] = useState<Ride | null>(rideFromState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pursuers, setPursuers] = useState<PursuerMatchResult[]>([]);
  const [pursuersLoading, setPursuersLoading] = useState(false);
  const [pursuersError, setPursuersError] = useState('');
  const [acceptingPursuerId, setAcceptingPursuerId] = useState<string | null>(null);
  const [acceptMessage, setAcceptMessage] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | L.GeoJSON | null>(null);

  const originCoords = ride?.originCoords;
  const destinationCoords = ride?.destinationCoords;
  const hasCoordinates = !!originCoords && !!destinationCoords;

  useEffect(() => {
    if (!ride && rideId) {
      setLoading(true);
      RideService.getRideById(rideId)
        .then(data => {
          setRide(data);
          setError('');
        })
        .catch(err => {
          console.error('[LiveRidePage] Failed to load ride:', err);
          setError('Unable to load ride details.');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [ride, rideId]);

  useEffect(() => {
    if (!rideId) {
      return;
    }

    const fetchPursuers = async () => {
      setPursuersLoading(true);
      try {
        const data = await RideService.getRidePursuers(rideId);
        if (Array.isArray(data)) {
          setPursuers(data);
          setPursuersError('');
        } else {
          setPursuers([]);
          setPursuersError('Unexpected pursuer response from server');
        }
      } catch (err) {
        console.error('[LiveRidePage] Failed to load matched pursuers:', err);
        setPursuersError('Unable to load matching passenger requests.');
      } finally {
        setPursuersLoading(false);
      }
    };

    fetchPursuers();
    const intervalId = window.setInterval(fetchPursuers, 10000);
    return () => window.clearInterval(intervalId);
  }, [rideId]);

  const handleAcceptPursuer = async (pursuer: PursuerMatchResult) => {
    if (!ride || !rideId) {
      return;
    }

    setAcceptingPursuerId(pursuer.id);
    setAcceptMessage('');

    try {
      const bookingPayload = {
        id: pursuer.user.id,
        name: pursuer.user.name,
        email: pursuer.user.email,
        university: pursuer.user?.university ?? '',
        phone: pursuer.user?.phone ?? '',
        schedule: pursuer.days,
        distanceKm: ride.distance ?? 0,
      };

      const result = await RideService.bookRide(rideId, bookingPayload);
      if (result && result.passenger) {
        setAcceptMessage(`Accepted ${pursuer.user.name} successfully.`);
        setPursuers((prev) => prev.filter((item) => item.id !== pursuer.id));
      } else {
        setAcceptMessage(result.error || 'Failed to accept passenger request.');
      }
    } catch (err) {
      console.error('[LiveRidePage] Accept pursuer error:', err);
      const message = err instanceof Error ? err.message : 'Failed to accept passenger request.';
      setAcceptMessage(message);
    } finally {
      setAcceptingPursuerId(null);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CARTO',
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      // keep map instance so markers can update
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!hasCoordinates) {
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const map = mapInstanceRef.current;
    const originLatLng: [number, number] = [originCoords!.lat, originCoords!.lng];
    const destinationLatLng: [number, number] = [destinationCoords!.lat, destinationCoords!.lng];

    const startIcon = L.divIcon({
      className: '',
      html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.45);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -10],
    });

    const endIcon = L.divIcon({
      className: '',
      html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(239,68,68,0.45);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -10],
    });

    if (!originMarkerRef.current) {
      originMarkerRef.current = L.marker(originLatLng, { icon: startIcon })
        .addTo(map)
        .bindPopup(`<strong>Pickup</strong><br/>${ride?.origin ?? ''}`);
    } else {
      originMarkerRef.current.setLatLng(originLatLng);
    }

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = L.marker(destinationLatLng, { icon: endIcon })
        .addTo(map)
        .bindPopup(`<strong>Drop-off</strong><br/>${ride?.destination ?? ''}`);
    } else {
      destinationMarkerRef.current.setLatLng(destinationLatLng);
    }

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const bounds = L.latLngBounds([originLatLng, destinationLatLng]);

    const parseOsrmGeoJson = (geometry: any) => {
      if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
        return null;
      }
      return geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
    };

    (async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${originLatLng[1]},${originLatLng[0]};${destinationLatLng[1]},${destinationLatLng[0]}?overview=full&geometries=geojson`
        );
        if (!res.ok) {
          throw new Error(`OSRM route fetch failed with status ${res.status}`);
        }
        const data = await res.json();
        const coordinates = parseOsrmGeoJson(data?.routes?.[0]?.geometry);

        if (coordinates && coordinates.length > 0) {
          const routeLine = L.polyline(coordinates, {
            color: '#2563eb',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          routeLineRef.current = routeLine;
          map.fitBounds(routeLine.getBounds(), {
            padding: [40, 40],
          });
          return;
        }

        throw new Error('OSRM returned invalid route geometry');
      } catch (err) {
        console.error('[LiveRidePage] Route fetch failed', err);
        if (routeLineRef.current) {
          routeLineRef.current.remove();
          routeLineRef.current = null;
        }
      }

      map.fitBounds(bounds, {
        padding: [40, 40],
      });
    })();
  }, [hasCoordinates, originCoords, destinationCoords, ride?.origin, ride?.destination]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="page-shell" style={{ padding: '1.5rem' }}>
      <button
        type="button"
        onClick={handleBack}
        className="back-btn"
        style={{ marginBottom: '1rem' }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Live Ride</h1>
            <p style={{ margin: '0.4rem 0 0', color: '#6b7280' }}>
              {ride ? `${ride.origin} → ${ride.destination}` : 'Loading ride route...'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={16} /> {hasCoordinates ? 'Route loaded' : 'Coordinates unavailable'}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: '0.75rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Ride details</h2>
            <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.75rem' }}>
              <div>
                <strong>Pickup</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{ride?.origin ?? 'Loading...'}</p>
              </div>
              <div>
                <strong>Drop-off</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{ride?.destination ?? 'Loading...'}</p>
              </div>
              <div>
                <strong>Departure</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{ride?.departureTime ? new Date(ride.departureTime).toLocaleString() : 'Loading...'}</p>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Matched passenger requests</h2>
                <p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
                  Live matches are refreshed every 10 seconds.
                </p>
              </div>
              {pursuersLoading && (
                <span style={{ color: '#2563eb', fontWeight: 700 }}>Refreshing...</span>
              )}
            </div>

            {pursuersError ? (
              <div style={{ marginTop: '1rem', color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: '0.75rem' }}>
                {pursuersError}
              </div>
            ) : null}

            {acceptMessage ? (
              <div style={{ marginTop: '1rem', color: '#134e4a', background: '#d1fae5', padding: '1rem', borderRadius: '0.75rem' }}>
                {acceptMessage}
              </div>
            ) : null}

            {pursuers.length === 0 && !pursuersLoading && !pursuersError ? (
              <div style={{ marginTop: '1rem', color: '#4b5563' }}>
                No matching passenger requests found yet.
              </div>
            ) : null}

            {pursuers.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                {pursuers.map((pursuer) => (
                  <div key={pursuer.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <strong>{pursuer.user.name}</strong>
                        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{pursuer.user.email ?? 'No contact provided'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontWeight: 600, color: '#111827' }}>{pursuer.origin} → {pursuer.destination}</span>
                        <span style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280' }}>{pursuer.time}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <strong>Days</strong>
                        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{pursuer.days.join(', ') || 'Any'}</p>
                      </div>
                      <div>
                        <strong>Pickup distance</strong>
                        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{pursuer.pickupDistanceKm !== undefined ? `${pursuer.pickupDistanceKm.toFixed(1)} km` : 'N/A'}</p>
                      </div>
                      <div>
                        <strong>Time difference</strong>
                        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{pursuer.timeDeltaMinutes !== undefined ? `${pursuer.timeDeltaMinutes} min` : 'N/A'}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => handleAcceptPursuer(pursuer)}
                        disabled={acceptingPursuerId === pursuer.id}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '0.75rem',
                          border: 'none',
                          background: '#2563eb',
                          color: 'white',
                          cursor: acceptingPursuerId === pursuer.id ? 'not-allowed' : 'pointer',
                          opacity: acceptingPursuerId === pursuer.id ? 0.6 : 1,
                        }}
                      >
                        {acceptingPursuerId === pursuer.id ? 'Accepting…' : 'Accept request'}
                      </button>
                      <span style={{ color: '#6b7280', fontSize: '0.95rem', alignSelf: 'center' }}>
                        Match quality: {Math.max(0, Math.round((1 - pursuer.score / 100) * 100))}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ minHeight: '420px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '420px' }} />
          </div>

          {!hasCoordinates && ride && (
            <div style={{ color: '#3b82f6', background: '#eff6ff', padding: '1rem', borderRadius: '0.75rem' }}>
              This ride does not have route coordinates in state. The map is showing the default view, but the ride still loads by ID.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveRidePage;
