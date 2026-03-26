import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Link, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import FindRidePage from './pages/FindRidePage';
import OfferRidePage from './pages/OfferRidePage';
import SavedRoutesPage from './pages/SavedRoutesPage';
import JourneyTrackerPage from './pages/JourneyTrackerPage';
import { Home, User, LogOut, Menu } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import StartupAnimation from './components/StartupAnimation';

const Navbar: React.FC<{ userId: string | null; handleLogout: () => void; toggleSidebar: () => void }> = ({ userId, handleLogout, toggleSidebar }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <nav>
      <ul>
        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {userId && (
            <button 
              onClick={toggleSidebar}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <Menu size={24} color="var(--accent)" />
            </button>
          )}
          <Link to="/" style={{fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent)'}}>
            UniRide
          </Link>
        </li>
        <div className="nav-links">
          <li>
            <NavLink to="/" end style={({ isActive }) => ({
              background: isActive ? 'var(--text-main)' : 'transparent',
              color: isActive ? 'white' : 'var(--text-muted)',
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontWeight: '600'
            })}>
              <Home size={18} />
              Home
            </NavLink>
          </li>
          {userId ? (
            <>
              <li>
                <NavLink to="/profile" style={({ isActive }) => ({
                  background: isActive ? 'var(--text-main)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontWeight: '600'
                })}>
                  <User size={18} />
                  Profile
                </NavLink>
              </li>
              <li>
                <button 
                  onClick={handleLogout} 
                  style={{
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-muted)', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '20px'
                  }}
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" style={{
                background: isAuthPage ? 'var(--text-main)' : 'transparent',
                color: isAuthPage ? 'white' : 'var(--text-muted)',
                padding: '8px 16px',
                borderRadius: '20px',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}>
                Login
              </Link>
            </li>
          )}
        </div>
      </ul>
    </nav>
  );
};

const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setUserId(null);
  };

  return (
    <GoogleOAuthProvider clientId={(import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
      <StartupAnimation />
      <Router>
        <div>
          <Navbar userId={userId} handleLogout={handleLogout} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

          <Routes>
            <Route path="/" element={userId ? <DashboardPage userId={userId} isSidebarOpen={isSidebarOpen} /> : <HomePage setUserId={setUserId} />} />
            <Route 
              path="/profile" 
              element={userId ? <ProfilePage userId={userId} /> : <Navigate to="/login" />} 
            />
            <Route
              path="/find-ride"
              element={userId ? <FindRidePage userId={userId} /> : <Navigate to="/login" />}
            />
            <Route
              path="/offer-ride"
              element={userId ? <OfferRidePage userId={userId} /> : <Navigate to="/login" />}
            />
            <Route
              path="/saved-routes"
              element={userId ? <SavedRoutesPage userId={userId} /> : <Navigate to="/login" />}
            />
            <Route
              path="/journey/:rideId"
              element={userId ? <JourneyTrackerPage userId={userId} /> : <Navigate to="/login" />}
            />
            <Route path="/login" element={<AuthPage setUserId={setUserId} />} />
            <Route path="/signup" element={<AuthPage setUserId={setUserId} />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
