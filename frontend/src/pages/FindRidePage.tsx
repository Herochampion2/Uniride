import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RideService } from '../services/RideService';
import { UserService } from '../services/UserService';
import { Search, MapPin, Clock, Users, ArrowLeft, Car, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import AutocompleteInput from '../components/AutocompleteInput';
import MapUI from '../components/MapUI';
import '../styles/feature-pages.css';

interface Ride {
  id: string;
  driver: { id: string; name: string; email: string };
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  cost: number;
  passengers: any[];
  passengerFare?: number;
  passengerDistance?: number;
}

const HOTSPOTS = [
  { name: 'IIT Delhi', lat: 28.5450, lon: 77.1926 },
  { name: 'Delhi Tech. University (DTU)', lat: 28.7499, lon: 77.1165 },
  { name: 'Delhi University (North)', lat: 28.6881, lon: 77.2065 },
  { name: 'NSUT Dwarka', lat: 28.6083, lon: 77.0398 },
  { name: 'Jawaharlal Nehru University', lat: 28.5402, lon: 77.1652 },
  { name: 'Jamia Millia Islamia (JMI)', lat: 28.5616, lon: 77.2802 },
  { name: 'GGSIPU Dwarka', lat: 28.5949, lon: 77.0195 },
  { name: 'Delhi University (South)', lat: 28.5835, lon: 77.1664 },
  { name: 'MAIT', lat: 28.7196, lon: 77.0661 },
  { name: 'MSIT', lat: 28.6210, lon: 77.0926 }
];

const FindRidePage: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  
  const defaultCenter: [number, number] = [28.6139, 77.2090];

  const [originPos, setOriginPos] = useState<[number, number] | null>(null);
  const [destinationPos, setDestinationPos] = useState<[number, number] | null>(null);

  const originMarker = originPos && origin ? { name: origin, pos: originPos } : undefined;
  const destinationMarker = destinationPos && destination ? { name: destination, pos: destinationPos } : undefined;

  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [locationHint, setLocationHint] = useState('');

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setOrigin('Current Location');
        setOriginPos([latitude, longitude]);
        setCurrentPos([latitude, longitude]);
        setLocationHint('Using your current location');
      }, () => {
        alert("Couldn't retrieve location.");
      });
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const originParam = params.get('origin') || '';
    const destinationParam = params.get('destination') || '';
    const latParam = params.get('lat');
    const lngParam = params.get('lng');
    if (originParam || destinationParam) {
      setOrigin(originParam);
      setDestination(destinationParam);
    }
    
    // Check session storage if no URL params
    const lastSessionLoc = sessionStorage.getItem('uniride:lastLocation');
    if (latParam && lngParam) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setLocationHint(`Current location detected`);
        setCurrentPos([lat, lng]);
      }
    } else if (lastSessionLoc) {
      try {
        const { lat, lng } = JSON.parse(lastSessionLoc);
        setCurrentPos([lat, lng]);
        setLocationHint(`Current location detected`);
      } catch (e) {}
    } else {
      setLocationHint('');
    }
  }, [location.search]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false);
    setBookingStatus(null);
    try {
      // Prefer coordinate-based search if available
      const filters: any = {};
      if (originPos && destinationPos) {
        filters.originLat = originPos[0];
        filters.originLng = originPos[1];
        filters.destLat = destinationPos[0];
        filters.destLng = destinationPos[1];
        filters.radius = 15; // 15km maximum deviation as requested
      } else {
        // Fallback to string-based search
        if (origin) filters.origin = origin;
        if (destination) filters.destination = destination;
      }
      const results = await RideService.getAllRides(filters);
      setRides(Array.isArray(results) ? results : []);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleBook = async (ride: Ride) => {
    setBookingId(ride.id);
    try {
      const user = await UserService.getUserById(userId);
      // Pass the specific distance for this passenger's trip
      const bookingPayload = {
        ...user,
        distanceKm: ride.passengerDistance,
      };
      const result = await RideService.bookRide(ride.id, bookingPayload);
      if (result.error) {
        setBookingStatus({ id: ride.id, success: false, message: result.error });
      } else {
        const payableFare =
          typeof result?.passenger?.finalFare === 'number'
            ? ` Current payable fare: Rs ${result.passenger.finalFare.toFixed(2)}`
            : '';
        setBookingStatus({
          id: ride.id,
          success: true,
          message: `Ride booked successfully!${payableFare}`,
        });
        // Refresh results using same search criteria
        const filters: any = {};
        if (originPos && destinationPos) {
          filters.originLat = originPos[0];
          filters.originLng = originPos[1];
          filters.destLat = destinationPos[0];
          filters.destLng = destinationPos[1];
          filters.radius = 15;
        } else {
          if (origin) filters.origin = origin;
          if (destination) filters.destination = destination;
        }
        const updated = await RideService.getAllRides(filters);
        setRides(Array.isArray(updated) ? updated : []);
      }
    } catch {
      setBookingStatus({ id: ride.id, success: false, message: 'Failed to book ride. Try again.' });
    } finally {
      setBookingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const placeName = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setDestination(placeName);
      setDestinationPos([lat, lng]);
    } catch (err) {
      setDestination(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setDestinationPos([lat, lng]);
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="feature-title">
          <div className="feature-title-icon">
            <Search size={24} />
          </div>
          <div>
            <h1>Find a Ride</h1>
            <p>Search for available rides to your destination</p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form className="feature-form glass-card" onSubmit={handleSearch}>
        {locationHint && (
          <div
            style={{
              padding: '0.7rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(14,165,233,0.12)',
              color: '#0369a1',
              border: '1px solid rgba(14,165,233,0.25)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {locationHint}
          </div>
        )}

        {/* Dynamic Map Display */}
        <div className="map-view-container" style={{ height: '480px', width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border)', position: 'relative', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
          <MapUI 
            userLocation={currentPos || defaultCenter} 
            zoom={12}
            originMarker={originMarker}
            destinationMarker={destinationMarker}
            onMapClick={handleMapClick}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label><MapPin size={14} /> From</label>
            <div className="input-with-action">
              <AutocompleteInput
                placeholder="e.g. Rajiv Chowk Metro"
                defaultValue={origin}
                hotspots={HOTSPOTS}
                onPlaceSelected={(place) => {
                  setOrigin(place.name);
                  setOriginPos([place.lat, place.lon]);
                }}
                onChange={(e: any) => setOrigin(e.target.value)}
              />
              <button 
                type="button" 
                className="input-action-btn" 
                onClick={handleUseCurrentLocation}
                title="Use Current Location"
              >
                <Navigation size={16} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label><MapPin size={14} /> To</label>
            <AutocompleteInput
              placeholder="e.g. Hauz Khas Village"
              defaultValue={destination}
              hotspots={HOTSPOTS}
              onPlaceSelected={(place) => {
                setDestination(place.name);
                setDestinationPos([place.lat, place.lon]);
              }}
              onChange={(e: any) => setDestination(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? (
            <span className="btn-loading"><span className="spinner" />Searching...</span>
          ) : (
            <><Search size={16} /> Search Rides</>
          )}
        </button>
      </form>

      {/* Results */}
      {searched && (
        <div className="results-section">
          <h2 className="results-title">
            {rides.length > 0
              ? `${rides.length} ride${rides.length !== 1 ? 's' : ''} found`
              : 'No rides found'}
          </h2>

          {rides.length === 0 ? (
            <div className="empty-state glass-card">
              <Car size={48} style={{ opacity: 0.3 }} />
              <h3>No rides available</h3>
              <p>Try adjusting your search, or <button className="link-btn" onClick={() => navigate('/offer-ride')}>offer a ride</button> yourself!</p>
            </div>
          ) : (
            <div className="ride-cards">
              {rides.map(ride => (
                <div key={ride.id} className="ride-card glass-card">
                  <div className="ride-card-header">
                    <div className="driver-info">
                      <div className="driver-avatar">
                        {(ride.driver?.name || 'D')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="driver-name">{ride.driver?.name || 'Unknown Driver'}</span>
                        <span className="driver-badge">Driver</span>
                      </div>
                    </div>
                    <div className="ride-cost">Rs {ride.passengerFare ? ride.passengerFare.toFixed(2) : (ride.cost || 0)}</div>
                  </div>

                  <div className="ride-route">
                    <div className="route-point">
                      <span className="route-dot origin-dot" />
                      <span>{ride.origin}</span>
                    </div>
                    <div className="route-line" />
                    <div className="route-point">
                      <span className="route-dot dest-dot" />
                      <span>{ride.destination}</span>
                    </div>
                  </div>

                  <div className="ride-meta">
                    <span><Clock size={13} /> {formatTime(ride.departureTime)}</span>
                    <span><Users size={13} /> {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} left</span>
                  </div>

                  {bookingStatus?.id === ride.id && (
                    <div className={`booking-status ${bookingStatus.success ? 'success' : 'error'}`}>
                      {bookingStatus.success
                        ? <CheckCircle size={15} />
                        : <AlertCircle size={15} />}
                      {bookingStatus.message}
                    </div>
                  )}

                  {bookingStatus?.id === ride.id && bookingStatus.success && (
                    <button
                      className="secondary-btn"
                      onClick={() => navigate(`/journey/${ride.id}`)}
                    >
                      Track Ride
                    </button>
                  )}

                  <button
                    className="primary-btn book-btn"
                    onClick={() => handleBook(ride)}
                    disabled={bookingId === ride.id || ride.availableSeats <= 0}
                  >
                    {bookingId === ride.id
                      ? <span className="btn-loading"><span className="spinner" />Booking...</span>
                      : ride.availableSeats <= 0
                        ? 'Full'
                        : 'Book Ride'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FindRidePage;

