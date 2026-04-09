import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RideService } from '../services/RideService';
import { UserService } from '../services/UserService';
import { User } from '../models/User';
import {
  Car, Bike, MapPin, ArrowLeft, CheckCircle, Navigation,
  ShieldAlert, Users, Clock, Route, X
} from 'lucide-react';
import AutocompleteInput from '../components/AutocompleteInput';
import OfferRideMapUI from '../components/OfferRideMapUI';
import {
  PursuerStop,
  haversineDistance,
  isNearRouteSegment,
  dijkstraWaypointOrder,
} from '../services/routingUtils';
import '../styles/feature-pages.css';
import '../styles/offer-ride-map.css';

// ── Constants ──────────────────────────────────────────────────────────────
const HOTSPOTS = [
  { name: 'IIT Delhi',                      lat: 28.5450, lon: 77.1926 },
  { name: 'Delhi Tech. University (DTU)',    lat: 28.7499, lon: 77.1165 },
  { name: 'Delhi University (North)',        lat: 28.6881, lon: 77.2065 },
  { name: 'NSUT Dwarka',                    lat: 28.6083, lon: 77.0398 },
  { name: 'Jawaharlal Nehru University',    lat: 28.5402, lon: 77.1652 },
  { name: 'Jamia Millia Islamia (JMI)',     lat: 28.5616, lon: 77.2802 },
  { name: 'GGSIPU Dwarka',                  lat: 28.5949, lon: 77.0195 },
  { name: 'Delhi University (South)',       lat: 28.5835, lon: 77.1664 },
  { name: 'MAIT',                           lat: 28.7196, lon: 77.0661 },
  { name: 'MSIT',                           lat: 28.6210, lon: 77.0926 },
];

type VehicleType = 'two-wheeler' | 'four-wheeler';

const calculateRideCost = (distance: number, vehicleType: VehicleType): number => {
  if (vehicleType === 'four-wheeler') {
    return Math.round((10 + distance * 4) * 100) / 100;
  } else {
    return Math.round((5 + distance * 2.5) * 100) / 100;
  }
};

// resolve a location string to a [lat, lon] via HOTSPOTS → Nominatim fallback
async function geocodeLocation(name: string): Promise<[number, number] | null> {
  const hs = HOTSPOTS.find(h => name.toLowerCase().includes(h.name.toLowerCase()));
  if (hs) return [hs.lat, hs.lon];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1&countrycodes=in`
    );
    const data = await res.json();
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { /**/ }
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────
const OfferRidePage: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form state
  const [origin, setOrigin]           = useState('');
  const [destination, setDestination] = useState('');
  const [originPos, setOriginPos]     = useState<[number,number]|null>(null);
  const [destPos, setDestPos]         = useState<[number,number]|null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>('four-wheeler');
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Post-ride dashboard state
  interface PostedRide {
    id: string; origin: string; destination: string;
    availableSeats: number; vehicleType?: string;
  }
  const [postedRide, setPostedRide]           = useState<PostedRide|null>(null);
  const [driverPos, setDriverPos]             = useState<[number,number]|null>(null);
  const [pursuerPings, setPursuerPings]       = useState<PursuerStop[]>([]);
  const [selectedPursuer, setSelectedPursuer] = useState<PursuerStop|null>(null);
  const [optimalWaypoints, setOptimalWaypoints] = useState<[number,number][]|null>(null);
  const [loadingPursuers, setLoadingPursuers] = useState(false);
  
  // Post-confirmation navigation state
  const [rideStatus, setRideStatus]           = useState<'LIVE' | 'RE-ROUTING' | 'IN-TRANSIT'>('LIVE');
  const [confirmedPursuer, setConfirmedPursuer] = useState<PursuerStop|null>(null);
  const [activeNavigationRoute, setActiveNavigationRoute] = useState<[number,number][]|null>(null);
  const [navigationInstruction, setNavigationInstruction] = useState<string>('');
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [routeValidationError, setRouteValidationError] = useState<string>('');

  // origin / dest position refs for autocomplete
  const originPosRef = useRef<[number,number]|null>(null);
  const destPosRef   = useRef<[number,number]|null>(null);

  useEffect(() => {
    UserService.getUser(userId)
      .then(d => setUser(d ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, [userId]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setOriginPos([lat, lng]);
      originPosRef.current = [lat, lng];
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(r => r.json())
        .then(d => setOrigin(d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`))
        .catch(() => setOrigin(`${lat.toFixed(4)}, ${lng.toFixed(4)}`));
    }, () => alert("Couldn't retrieve your location."));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      setError('Please fill in both From and To locations.');
      return;
    }
    if (availableSeats < 1) {
      setError('Please select at least 1 seat available.');
      return;
    }
    setLoading(true); setError('');
    try {
      // Resolve coordinates if not already set via autocomplete
      let oPos = originPosRef.current;
      let dPos = destPosRef.current;
      if (!oPos) { oPos = await geocodeLocation(origin); originPosRef.current = oPos; }
      if (!dPos) { dPos = await geocodeLocation(destination); destPosRef.current = dPos; }
      setOriginPos(oPos);
      setDestPos(dPos);

      // Calculate distance and cost
      const distance = oPos && dPos ? haversineDistance({lat: oPos[0], lon: oPos[1]}, {lat: dPos[0], lon: dPos[1]}) : 10;
      const cost = calculateRideCost(distance, vehicleType);

      const newRide = await RideService.createRide({
        driver: user!,
        origin,
        destination,
        originCoords: oPos ? { lat: oPos[0], lng: oPos[1] } : undefined,
        destinationCoords: dPos ? { lat: dPos[0], lng: dPos[1] } : undefined,
        distance,
        departureTime: new Date().toISOString(),
        availableSeats,
        cost,
        vehicleType,
        pricingConfig: {
          vehicleType: vehicleType === 'four-wheeler' ? '4-wheeler' : '2-wheeler',
          basePickupFee: vehicleType === 'four-wheeler' ? 10 : 5,
          perKmRate: vehicleType === 'four-wheeler' ? 4 : 2.5,
          platformFeePercent: 0,
          platformFeeCap: 15,
          emptySeatIncentivePassengers: 3,
          emptySeatDiscount: 0.15,
          campusZoneRadius: 2,
          campusZoneCenter: { lat: 28.5450, lng: 77.1926 },
          campusZoneFlatRates: { bike: 20, car: 35 },
        },
      });

      setPostedRide(newRide);

      // Get driver's current location for the map
      navigator.geolocation?.getCurrentPosition(pos => {
        setDriverPos([pos.coords.latitude, pos.coords.longitude]);
      });

      // Load pursuer pings
      setLoadingPursuers(true);
      loadPursuers(oPos, dPos);
    } catch {
      setError('Failed to post ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPursuers = async (
    oPos: [number,number] | null,
    dPos: [number,number] | null
  ) => {
    try {
      const allRides = await RideService.getAllRides();
      const rides = Array.isArray(allRides) ? allRides : [];
      const pings: PursuerStop[] = [];

      for (const ride of rides) {
        const passengers: any[] = Array.isArray(ride.passengers) ? ride.passengers : [];
        for (const passenger of passengers) {
          const fromHs = HOTSPOTS.find(h =>
            (ride.origin || '').toLowerCase().includes(h.name.toLowerCase())
          );
          const toHs = HOTSPOTS.find(h =>
            (ride.destination || '').toLowerCase().includes(h.name.toLowerCase())
          );
          if (!fromHs || !toHs) continue;

          // Only show if near driver's route corridor (1km radius)
          if (oPos && dPos) {
            const nearFrom = isNearRouteSegment(
              { lat: fromHs.lat, lon: fromHs.lon },
              { lat: oPos[0], lon: oPos[1] },
              { lat: dPos[0], lon: dPos[1] },
              1
            );
            const nearTo = isNearRouteSegment(
              { lat: toHs.lat, lon: toHs.lon },
              { lat: oPos[0], lon: oPos[1] },
              { lat: dPos[0], lon: dPos[1] },
              1
            );
            if (!nearFrom && !nearTo) continue;
          }

          pings.push({
            id: `${ride.id}_${passenger.id ?? passenger.name ?? Math.random()}`,
            name: passenger.name || 'Passenger',
            fromPos: [fromHs.lat, fromHs.lon],
            toPos:   [toHs.lat,   toHs.lon],
            fromName: ride.origin,
            toName:   ride.destination,
          });
        }
      }

      // Deduplicate by name+from+to
      const seen = new Set<string>();
      const unique = pings.filter(p => {
        const key = `${p.name}_${p.fromName}_${p.toName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // If database has no passengers yet, add a few demo pursuers near hotspots for demonstration
      if (unique.length === 0 && oPos && dPos) {
        const demoNames = ['Riya S.', 'Arjun M.', 'Priya K.'];
        const nearHotspots = HOTSPOTS.filter(h =>
          isNearRouteSegment(
            { lat: h.lat, lon: h.lon },
            { lat: oPos[0], lon: oPos[1] },
            { lat: dPos[0], lon: dPos[1] },
            3
          )
        ).slice(0, 4);

        for (let i = 0; i < Math.min(demoNames.length, Math.max(0, nearHotspots.length - 1)); i++) {
          unique.push({
            id: `demo_${i}`,
            name: demoNames[i],
            fromPos: [nearHotspots[i].lat, nearHotspots[i].lon],
            toPos:   [nearHotspots[i + 1].lat, nearHotspots[i + 1].lon],
            fromName: nearHotspots[i].name,
            toName:   nearHotspots[i + 1].name,
          });
        }
      }

      setPursuerPings(unique);
    } catch {
      // silent — no pursuers to show
    } finally {
      setLoadingPursuers(false);
    }
  };

  const handlePursuerClick = (id: string) => {
    const pursuer = pursuerPings.find(p => p.id === id);
    if (!pursuer) return;

    if (selectedPursuer?.id === id) {
      // Deselect
      setSelectedPursuer(null);
      setOptimalWaypoints(null);
      return;
    }

    setSelectedPursuer(pursuer);
    setRouteValidationError('');

    // Compute optimal waypoints via Dijkstra
    const start = driverPos ?? originPos ?? pursuer.fromPos;
    const end   = destPos ?? pursuer.toPos;
    const waypoints = dijkstraWaypointOrder(start, [pursuer], end);
    setOptimalWaypoints(waypoints);
  };

  // ── Confirm pursuer and activate re-routing ────────────────────────────────
  const handlePursuerConfirm = async () => {
    if (!selectedPursuer || !postedRide) {
      setRouteValidationError('Ride data missing');
      return;
    }

    // Use driver position if available, otherwise fall back to origin position
    const currentPos = driverPos || originPos;
    if (!currentPos) {
      setRouteValidationError('Driver position or ride data missing');
      return;
    }

    setConfirmationLoading(true);
    setRouteValidationError('');

    try {
      // Calculate the three-point route (driver → pickup → destination)
      const pickupPos = selectedPursuer.fromPos;
      const finalDestPos = selectedPursuer.toPos;

      // Generate the new three-point route using Dijkstra
      const newRoute = dijkstraWaypointOrder(currentPos, [selectedPursuer], finalDestPos);

      if (!newRoute || newRoute.length < 3) {
        setRouteValidationError('Failed to calculate route');
        return;
      }

      // Generate navigation instruction
      const instruction = `Heading to ${selectedPursuer.fromName} for pickup`;

      // Update state to reflect confirmation
      setConfirmedPursuer(selectedPursuer);
      setActiveNavigationRoute(newRoute);
      setNavigationInstruction(instruction);
      setRideStatus('RE-ROUTING');
      setSelectedPursuer(null); // Deselect to show solid route
      setOptimalWaypoints(null); // Clear the dashed preview
      setPursuerPings([]); // Clear all other passengers from map after acceptance

      // Update ride status in backend
      if (postedRide && postedRide.id) {
        await RideService.updateRideStatus(postedRide.id, 'ongoing');
      }
    } catch (err) {
      setRouteValidationError('Error confirming ride');
    } finally {
      setConfirmationLoading(false);
    }
  };

  const handleReset = () => {
    setPostedRide(null);
    setOrigin(''); setDestination('');
    setOriginPos(null); setDestPos(null);
    originPosRef.current = null; destPosRef.current = null;
    setPursuerPings([]); setSelectedPursuer(null);
    setOptimalWaypoints(null); setDriverPos(null);
  };

  // ── Distance helper for display ────────────────────────────────────────────
  const pursuerDistanceFromRoute = (p: PursuerStop): string => {
    if (!originPos || !destPos) return '';
    const d = haversineDistance(
      { lat: p.fromPos[0], lon: p.fromPos[1] },
      { lat: originPos[0], lon: originPos[1] }
    );
    return `${d.toFixed(1)} km from your start`;
  };

  // ══ LOADING ════════════════════════════════════════════════════════════════
  if (loadingUser) {
    return (
      <div className="feature-page">
        <div className="loading-state"><div className="spinner large" /><p>Checking verification status…</p></div>
      </div>
    );
  }

  // ══ VERIFICATION GATE ══════════════════════════════════════════════════════
  const isVerified = user?.verificationStatus === 'verified';
  if (!isVerified) {
    const isPending = user?.verificationStatus === 'pending';
    return (
      <div className="feature-page">
        <div className="feature-header">
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
          <div className="feature-title">
            <div className="feature-title-icon" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}><Car size={24} /></div>
            <div><h1>Offer a Ride</h1><p>Share your journey and help fellow students</p></div>
          </div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:isPending?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.5rem',color:isPending?'#f59e0b':'#ef4444' }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ margin:'0 0 0.75rem', fontSize:'1.4rem' }}>{isPending ? 'Verification Pending' : 'Vehicle Verification Required'}</h2>
          <p style={{ color:'var(--text-muted)', margin:'0 auto 2rem', maxWidth:380 }}>
            {isPending
              ? 'Your verification is under review. You\'ll be able to offer rides once approved.'
              : 'To offer rides, verify your vehicle and driving license on your profile first.'}
          </p>
          {!isPending && (
            <button className="primary-btn" onClick={() => navigate('/profile')} style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', gap:8 }}>
              <ShieldAlert size={16} /> Go to Profile &amp; Verify
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══ POST-RIDE MAP DASHBOARD ════════════════════════════════════════════════
  if (postedRide) {
    return (
      <div className="orm-fullpage">

        {/* ── Top bar ── */}
        <div className="orm-topbar">
          <div className="orm-topbar-left">
            <div className="orm-topbar-icon"><Car size={18} /></div>
            <div>
              <span className="orm-topbar-title">Ride Posted</span>
              <span className="orm-topbar-sub">{postedRide.origin} → {postedRide.destination}</span>
            </div>
          </div>
          <div className="orm-topbar-actions">
            <button className="orm-action-ghost" onClick={handleReset}><Car size={14} /> New Ride</button>
            <button className="orm-action-ghost" onClick={() => navigate('/')}><ArrowLeft size={14} /> Dashboard</button>
          </div>
        </div>

        {/* ── Main split layout ── */}
        <div className="orm-layout">

          {/* ── Left panel ── */}
          <aside className="orm-sidebar">

            {/* Success badge */}
            <div className="orm-success-badge">
              <CheckCircle size={20} />
              <div>
                <div className="orm-success-badge-title">Your ride is live!</div>
                <div className="orm-success-badge-sub">Students near your route can now request a pickup</div>
              </div>
            </div>

            {/* Route summary */}
            <div className="orm-route-card">
              <div className="orm-route-row">
                <span className="orm-dot orm-dot-green" />
                <div>
                  <div className="orm-route-label">FROM</div>
                  <div className="orm-route-place">{postedRide.origin}</div>
                </div>
              </div>
              <div className="orm-route-connector" />
              <div className="orm-route-row">
                <span className="orm-dot orm-dot-red" />
                <div>
                  <div className="orm-route-label">TO</div>
                  <div className="orm-route-place">{postedRide.destination}</div>
                </div>
              </div>
              <div className="orm-route-meta">
                <span><Car size={12} /> {postedRide.vehicleType === 'two-wheeler' ? 'Two Wheeler' : 'Four Wheeler'}</span>
                <span><Users size={12} /> {postedRide.availableSeats} seat{postedRide.availableSeats !== 1 ? 's' : ''}</span>
                <span><Clock size={12} /> Just now</span>
              </div>
            </div>

            {/* Pursuer list */}
            <div className="orm-section-header">
              <Route size={14} />
              <span>Nearby Pursuers</span>
              {loadingPursuers && <span className="orm-spinner" />}
              {!loadingPursuers && <span className="orm-pursuer-count">{pursuerPings.length}</span>}
            </div>

            {!loadingPursuers && pursuerPings.length === 0 && (
              <div className="orm-empty-pursuers">
                <Users size={36} style={{ opacity: 0.25 }} />
                <p>No passengers found near your route yet.<br/>Check back once more rides are listed.</p>
              </div>
            )}

            <div className="orm-pursuer-list">
              {pursuerPings.map(p => {
                const isSelected = selectedPursuer?.id === p.id;
                return (
                  <button
                    key={p.id}
                    className={`orm-pursuer-card ${isSelected ? 'orm-pursuer-card--selected' : ''}`}
                    onClick={() => handlePursuerClick(p.id)}
                  >
                    <div className="orm-pursuer-avatar">{p.name[0].toUpperCase()}</div>
                    <div className="orm-pursuer-info">
                      <div className="orm-pursuer-name">{p.name}</div>
                      <div className="orm-pursuer-route">
                        <span className="orm-pursuer-from">{p.fromName}</span>
                        <span className="orm-pursuer-arrow">→</span>
                        <span className="orm-pursuer-to">{p.toName}</span>
                      </div>
                      <div className="orm-pursuer-dist">{pursuerDistanceFromRoute(p)}</div>
                    </div>
                    {isSelected && (
                      <div className="orm-pursuer-selected-badge">
                        <Route size={12} /> Optimal route shown
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

          </aside>

          {/* ── Map panel ── */}
          <div className="orm-map-panel">
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <OfferRideMapUI
                originPos={originPos ?? undefined}
                originName={postedRide.origin}
                destinationPos={destPos ?? undefined}
                destinationName={postedRide.destination}
                driverPos={driverPos ?? undefined}
                pursuerPings={pursuerPings}
                selectedPursuerId={selectedPursuer?.id}
                onPursuerClick={handlePursuerClick}
                optimalWaypoints={optimalWaypoints}
                confirmedRoute={activeNavigationRoute}
                navigationInstruction={navigationInstruction}
                confirmedPickupName={confirmedPursuer?.fromName}
                confirmedDestinationName={confirmedPursuer?.toName}
              />

              {/* Map legend overlay */}
              <div className="orm-map-legend">
                {confirmedPursuer ? (
                  <>
                    <div className="orm-legend-item"><span className="orm-legend-dot" style={{ background: '#0ea5e9' }} />Active navigation</div>
                    <div className="orm-legend-item"><span className="orm-legend-dot" style={{ background: '#a855f7' }} />Passenger: {confirmedPursuer.name}</div>
                  </>
                ) : (
                  <>
                    <div className="orm-legend-item"><span className="orm-legend-dot" style={{ background: '#0ea5e9' }} />Your route</div>
                    <div className="orm-legend-item"><span className="orm-legend-dot" style={{ background: '#a855f7' }} />Passenger ping</div>
                    {selectedPursuer && (
                      <div className="orm-legend-item"><span className="orm-legend-dot orm-legend-dot--dashed" style={{ background: '#7c3aed' }} />Optimal re-route</div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Pursuer detail drawer at bottom of map */}
            {selectedPursuer && (
              <div className="orm-detail-drawer">
                <div className="orm-detail-header">
                  <div className="orm-detail-avatar">{selectedPursuer.name[0].toUpperCase()}</div>
                  <div className="orm-detail-info">
                    <div className="orm-detail-name">{selectedPursuer.name}</div>
                    <div className="orm-detail-sub">Wants to ride along</div>
                  </div>
                  <button className="orm-detail-close" onClick={() => { setSelectedPursuer(null); setOptimalWaypoints(null); }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="orm-detail-body">
                  <div className="orm-detail-route">
                    <div className="orm-detail-stop">
                      <span className="orm-dot orm-dot-green" style={{ width:10, height:10 }} />
                      <div>
                        <div className="orm-route-label">PICKUP FROM</div>
                        <div className="orm-route-place">{selectedPursuer.fromName}</div>
                      </div>
                    </div>
                    <div className="orm-route-connector" style={{ margin: '4px 0 4px 5px', height: 16 }} />
                    <div className="orm-detail-stop">
                      <span className="orm-dot orm-dot-red" style={{ width:10, height:10 }} />
                      <div>
                        <div className="orm-route-label">DROP AT</div>
                        <div className="orm-route-place">{selectedPursuer.toName}</div>
                      </div>
                    </div>
                  </div>
                  <div className="orm-detail-chips">
                    <span className="orm-chip orm-chip--purple">
                      <Route size={11} /> Dijkstra optimal path computed
                    </span>
                    <span className="orm-chip">
                      <MapPin size={11} /> {pursuerDistanceFromRoute(selectedPursuer)}
                    </span>
                  </div>
                  {routeValidationError && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                      ⚠️ {routeValidationError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handlePursuerConfirm}
                    disabled={confirmationLoading}
                    style={{
                      marginTop: '1rem',
                      padding: '0.8rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg,#10b981,#059669)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: confirmationLoading ? 'not-allowed' : 'pointer',
                      opacity: confirmationLoading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {confirmationLoading ? (
                      <>
                        <div className="spinner" style={{ width: '14px', height: '14px' }} />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Accept & Start Navigation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══ MAIN OFFER FORM ════════════════════════════════════════════════════════
  return (
    <div className="feature-page">
      <div className="feature-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
        <div className="feature-title">
          <div className="feature-title-icon" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}><Car size={24} /></div>
          <div><h1>Offer a Ride</h1><p>Share your journey and help fellow students</p></div>
        </div>
      </div>

      <form className="feature-form glass-card" onSubmit={handleSubmit}>

        {/* From */}
        <div className="form-group">
          <label><MapPin size={14} /> From <span className="required">*</span></label>
          <div className="input-with-action">
            <AutocompleteInput
              placeholder="e.g. Vasant Vihar"
              defaultValue={origin}
              hotspots={HOTSPOTS}
              onPlaceSelected={place => {
                setOrigin(place.name);
                setOriginPos([place.lat, place.lon]);
                originPosRef.current = [place.lat, place.lon];
              }}
              onChange={(e: any) => setOrigin(e.target.value)}
              required
            />
            <button type="button" className="input-action-btn" onClick={handleUseCurrentLocation} title="Use Current Location">
              <Navigation size={16} />
            </button>
          </div>
        </div>

        {/* To */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label><MapPin size={14} /> To <span className="required">*</span></label>
          <AutocompleteInput
            placeholder="e.g. Connaught Place"
            defaultValue={destination}
            hotspots={HOTSPOTS}
            onPlaceSelected={place => {
              setDestination(place.name);
              setDestPos([place.lat, place.lon]);
              destPosRef.current = [place.lat, place.lon];
            }}
            onChange={(e: any) => setDestination(e.target.value)}
            required
          />
        </div>

        {/* Vehicle type toggle */}
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label style={{ marginBottom:'0.75rem', display:'block' }}>Vehicle Type</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <button type="button" onClick={() => {
              setVehicleType('two-wheeler');
              setAvailableSeats(1);
              if (destPos && originPos) {
                const distance = haversineDistance(originPos[0], originPos[1], destPos[0], destPos[1]);
                setEstimatedCost(calculateRideCost(distance, 'two-wheeler'));
              }
            }} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              padding:'1.1rem 0.5rem', borderRadius:14, cursor:'pointer',
              border: vehicleType === 'two-wheeler' ? '2px solid #b2d3c2' : '2px solid var(--border)',
              background: vehicleType === 'two-wheeler' ? 'rgba(178,211,194,0.18)' : 'rgba(0,0,0,0.02)',
              color: vehicleType === 'two-wheeler' ? '#41424c' : 'var(--text-muted)',
              transition:'all 0.2s ease',
              boxShadow: vehicleType === 'two-wheeler' ? '0 4px 16px rgba(178,211,194,0.35)' : 'none',
            }}>
              <Bike size={28} />
              <span style={{ fontWeight: vehicleType === 'two-wheeler' ? 700 : 500, fontSize:'0.9rem' }}>Two Wheeler</span>
              <span style={{ fontSize:'0.75rem', opacity:0.75 }}>₹2.50/km</span>
            </button>

            <button type="button" onClick={() => {
              setVehicleType('four-wheeler');
              setAvailableSeats(3);
              if (destPos && originPos) {
                const distance = haversineDistance(originPos[0], originPos[1], destPos[0], destPos[1]);
                setEstimatedCost(calculateRideCost(distance, 'four-wheeler'));
              }
            }} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              padding:'1.1rem 0.5rem', borderRadius:14, cursor:'pointer',
              border: vehicleType === 'four-wheeler' ? '2px solid #41424c' : '2px solid var(--border)',
              background: vehicleType === 'four-wheeler' ? 'rgba(65,66,76,0.08)' : 'rgba(0,0,0,0.02)',
              color: vehicleType === 'four-wheeler' ? '#41424c' : 'var(--text-muted)',
              transition:'all 0.2s ease',
              boxShadow: vehicleType === 'four-wheeler' ? '0 4px 16px rgba(65,66,76,0.18)' : 'none',
            }}>
              <Car size={28} />
              <span style={{ fontWeight: vehicleType === 'four-wheeler' ? 700 : 500, fontSize:'0.9rem' }}>Four Wheeler</span>
              <span style={{ fontSize:'0.75rem', opacity:0.75 }}>₹4.00/km</span>
            </button>
          </div>
        </div>

        {/* Available seats selection */}
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label style={{ marginBottom: '0.75rem', display: 'block' }}>Available Seats</label>
          <div style={{ display: 'grid', gridTemplateColumns: vehicleType === 'four-wheeler' ? '1fr 1fr 1fr' : '1fr', gap: '0.75rem' }}>
            {vehicleType === 'four-wheeler' ? (
              [1, 2, 3].map(num => (
                <button key={num} type="button" onClick={() => setAvailableSeats(num)} style={{
                  padding: '0.8rem',
                  borderRadius: '10px',
                  border: availableSeats === num ? '2px solid var(--accent)' : '2px solid var(--border)',
                  background: availableSeats === num ? 'rgba(14, 165, 233, 0.1)' : 'rgba(0,0,0,0.02)',
                  color: availableSeats === num ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: availableSeats === num ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                  <Users size={14} style={{ marginRight: '0.4rem', display: 'inline' }} />
                  {num} Seat{num > 1 ? 's' : ''}
                </button>
              ))
            ) : (
              <button type="button" onClick={() => setAvailableSeats(1)} style={{
                padding: '0.8rem',
                borderRadius: '10px',
                border: '2px solid var(--accent)',
                background: 'rgba(14, 165, 233, 0.1)',
                color: 'var(--accent)',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                <Users size={14} style={{ marginRight: '0.4rem', display: 'inline' }} />
                1 Pillion Seat
              </button>
            )}
          </div>
          {estimatedCost > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              📍 Estimated cost: <strong style={{ color: 'var(--accent)' }}>₹{estimatedCost.toFixed(2)}</strong> (for 1 passenger)
            </div>
          )}
        </div>

        {error && <div className="form-error" style={{ marginTop:'1rem' }}>{error}</div>}

        <button
          type="submit"
          className="primary-btn"
          disabled={loading}
          style={{ marginTop:'1.5rem', background:'linear-gradient(135deg,#41424c,#5a5b66)' }}
        >
          {loading
            ? <span className="btn-loading"><span className="spinner" />Posting Ride…</span>
            : <><Car size={16} /> Post Ride</>}
        </button>
      </form>
    </div>
  );
};

export default OfferRidePage;
