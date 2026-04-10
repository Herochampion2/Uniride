import React, { useEffect, useState } from 'react';
import { User } from '../models/User';
import { Ride } from '../models/Ride';
import { UserService } from '../services/UserService';
import { RideService } from '../services/RideService';
import { Search, MapPin, Clock, Plus, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import MapUI from '../components/MapUI';
import ChatBubble from '../components/ChatBubble';
import '../styles/dashboard.css'; 

const DashboardPage: React.FC<{ userId: string, isSidebarOpen: boolean }> = ({ userId, isSidebarOpen }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | undefined>();
  const [userRides, setUserRides] = useState<any[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  // Mock flag to represent a confirmed ride - keeping it false for now as requested
  const [hasConfirmedRide] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState(11);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    UserService.getUser(userId)
      .then(data => setUser(data))
      .catch(err => console.error("Failed to fetch user", err));

    RideService.getAllRides()
      .then(rides => {
        const myRides = rides.filter((r: Ride) => r.driver.id === userId || r.passengers.some((p: User) => p.id === userId));
        setUserRides(myRides);
      })
      .catch(err => console.error("Failed to fetch rides", err))
      .finally(() => setLoadingRides(false));
  }, [userId]);

  const handleCancelBooking = async (rideId: string) => {
    console.log('[handleCancelBooking] Initiated for ride:', rideId);
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      console.log('[handleCancelBooking] User aborted cancellation.');
      return;
    }
    
    try {
      console.log('[handleCancelBooking] Making API request to cancel passenger booking...');
      await RideService.cancelBookingByPassenger(rideId, userId);
      console.log('[handleCancelBooking] API request successful. Updating local state.');
      
      alert('Booking cancelled successfully.');
      setUserRides(prev => prev.filter(r => r.id !== rideId));
    } catch (error) {
      console.error('[handleCancelBooking] API request failed:', error);
      alert('Failed to cancel booking.');
    }
  };

  const handleCancelRide = async (rideId: string) => {
    console.log('[handleCancelRide] Initiated for ride:', rideId);
    if (!window.confirm('Are you sure you want to cancel this ride?')) {
      console.log('[handleCancelRide] User aborted cancellation.');
      return;
    }
    
    try {
      console.log('[handleCancelRide] Making API request to cancel driver ride...');
      const response = await RideService.cancelRideByDriver(rideId, userId);
      console.log('[handleCancelRide] API response:', response);
      console.log('[handleCancelRide] API request successful. Updating local state.');
      
      setUserRides(prev => prev.filter(r => r.id !== rideId));
    } catch (error) {
      console.error('[handleCancelRide] API request failed:', error);
      alert('Failed to cancel ride.');
    }
  };

  const handleRideCardClick = (ride: Ride) => {
    console.log('[handleRideCardClick] Navigating to live ride page for ride:', ride.id);
    navigate(`/live-ride/${ride.id}`, { state: { ride } });
  };

  const handleCancelRideClick = (event: React.MouseEvent<HTMLButtonElement>, rideId: string) => {
    console.log('[handleCancelRideClick] Button clicked for ride:', rideId);
    event.preventDefault();
    event.stopPropagation();
    handleCancelRide(rideId);
  };

  const handleCancelBookingClick = (event: React.MouseEvent<HTMLButtonElement>, rideId: string) => {
    console.log('[handleCancelBookingClick] Button clicked for ride:', rideId);
    event.preventDefault();
    event.stopPropagation();
    handleCancelBooking(rideId);
  };

  const handleFindRide = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      navigate('/find-ride');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation([lat, lng]);
        setMapZoom(15);
        sessionStorage.setItem(
          'uniride:lastLocation',
          JSON.stringify({ lat, lng, timestamp: Date.now() })
        );
        setLocating(false);
        navigate(`/find-ride?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
      },
      () => {
        setLocating(false);
        setLocationError('Could not detect your location. Opening ride search.');
        navigate('/find-ride');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Background Map Component */}
      <div className="map-container">
        <MapUI userLocation={currentLocation} zoom={mapZoom} />
      </div>

      {/* Floating Sidebar Container */}
      <div className={`sidebar-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Welcome back, {(user?.name || 'User').split(' ')[0]}</h2>
          <p>Where are you heading today?</p>
        </div>

        {/* Active Ride Widget */}
        {loadingRides ? (
          <div style={{
            background: 'rgba(0,0,0,0.02)', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            textAlign: 'center',
            marginBottom: '1.5rem',
            border: '1px dashed var(--border)'
          }}>
            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>Loading rides...</p>
          </div>
        ) : userRides.filter((r: Ride) => r.status === 'ACTIVE' || r.status === 'PENDING').length > 0 ? (
          <div style={{
            background: 'rgba(0,0,0,0.02)', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            marginBottom: '1.5rem',
            border: '1px solid var(--border)'
          }}>
            <h4 style={{margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text)'}}>Active Rides</h4>
            {userRides.filter((r: Ride) => r.status === 'ACTIVE' || r.status === 'PENDING').map((ride: Ride) => (
              <div
                key={ride.id}
                className="active-ride-card"
                role="button"
                tabIndex={0}
                onClick={() => handleRideCardClick(ride)}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRideCardClick(ride);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <p className="active-ride-route">{ride.origin} → {ride.destination}</p>
                  <p className="active-ride-details">
                    {new Date(ride.departureTime).toLocaleString()} • {ride.passengers.length}/{ride.availableSeats + ride.passengers.length} seats
                  </p>
                  <p className={`active-ride-status ${ride.status === 'ACTIVE' ? 'active' : 'pending'}`}>
                    Status: {ride.status}
                  </p>
                </div>
                {ride.driver.id === userId ? (
                  <button
                    type="button"
                    className="active-ride-button"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => handleCancelRideClick(event, ride.id)}
                  >
                    Cancel Ride
                  </button>
                ) : (
                  <button
                    type="button"
                    className="active-ride-button"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => handleCancelBookingClick(event, ride.id)}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'rgba(0,0,0,0.02)', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            textAlign: 'center',
            marginBottom: '1.5rem',
            border: '1px dashed var(--border)'
          }}>
            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>No active trips.</p>
          </div>
        )}

        <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px'}}>
          Quick Actions
        </h3>
        
        <button
          type="button"
          onClick={handleFindRide}
          style={{ background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left', color: 'inherit' }}
        >
          <div className="action-card">
            <div className="action-icon" style={{background: '#e0f2fe', color: '#0284c7'}}>
              <Search size={22} />
            </div>
            <div className="action-text">
              <h3>Find a Ride</h3>
              <p>Search for available rides to your destination</p>
            </div>
          </div>
        </button>

        {locationError && (
          <p style={{ color: '#b45309', fontSize: '0.82rem', margin: '0 0 1rem' }}>{locationError}</p>
        )}

        <Link to="/offer-ride" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="action-card">
            <div className="action-icon" style={{background: '#f3e8ff', color: '#9333ea'}}>
              <Plus size={22} />
            </div>
            <div className="action-text">
              <h3>Offer a Ride</h3>
              <p>Driving today? Share an empty seat</p>
            </div>
          </div>
        </Link>

        <Link to="/saved-routes" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="action-card" style={{opacity: 0.9}}>
            <div className="action-icon" style={{background: '#f0fdf4', color: '#16a34a'}}>
              <MapPin size={22} />
            </div>
            <div className="action-text">
              <h3>Saved Routes</h3>
              <p>Quick book your daily commute</p>
            </div>
          </div>
        </Link>
        
        {/* The Chat Bubble floats on top */}
        <ChatBubble />
      </div>
    </div>
  );
};

export default DashboardPage;
