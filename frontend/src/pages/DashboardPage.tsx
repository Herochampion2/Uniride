import React, { useEffect, useState } from 'react';
import { User } from '../models/User';
import { UserService } from '../services/UserService';
import { Search, MapPin, Clock, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MapUI from '../components/MapUI';
import ChatBubble from '../components/ChatBubble';
import '../styles/dashboard.css'; 

const DashboardPage: React.FC<{ userId: string, isSidebarOpen: boolean }> = ({ userId, isSidebarOpen }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | undefined>();
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
  }, [userId]);

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
        {hasConfirmedRide ? (
          <div className="active-ride-widget">
            <div className="active-ride-header">
              <span>
                <Clock size={14} style={{display:'inline', marginRight:'4px', verticalAlign:'text-bottom'}}/> 
                Upcoming Trip
              </span>
              <span style={{opacity: 0.8}}>In 45 mins</span>
            </div>
            <div style={{fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px'}}>
              {user?.university || "Delhi Technological University"}
            </div>
            <div style={{fontSize: '0.9rem', opacity: 0.9}}>
              Driver: Rahul K.  White Swift
            </div>
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
            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>No trips scheduled for today.</p>
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
              <p>{locating ? 'Detecting your location...' : 'Search for rides to campus'}</p>
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
