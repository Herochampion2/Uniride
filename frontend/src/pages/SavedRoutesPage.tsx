import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteService } from '../services/RouteService';
import { MapPin, ArrowLeft, Bookmark, Trash2, Search, Clock, Plus } from 'lucide-react';
import '../styles/feature-pages.css';

interface SavedRoute {
  id: string;
  origin: string;
  destination: string;
  days: string[];
  time: string;
  user: { id: string; name: string };
}

const SavedRoutesPage: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await RouteService.getUserRoutes(userId);
      setRoutes(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load saved routes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [userId]);

  const handleDelete = async (routeId: string) => {
    setDeletingId(routeId);
    try {
      await RouteService.deleteRoute(routeId);
      setRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch {
      setError('Failed to delete route. Try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickBook = (route: SavedRoute) => {
    navigate(`/find-ride?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`);
  };

  return (
    <div className="feature-page">
      <div className="feature-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="feature-title">
          <div className="feature-title-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}>
            <Bookmark size={24} />
          </div>
          <div>
            <h1>Saved Routes</h1>
            <p>Your frequently used commute routes</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner large" />
          <p>Loading your routes...</p>
        </div>
      ) : error ? (
        <div className="feature-form glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>{error}</p>
          <button className="secondary-btn" onClick={fetchRoutes}>Retry</button>
        </div>
      ) : routes.length === 0 ? (
        <div className="empty-state glass-card">
          <Bookmark size={48} style={{ opacity: 0.3 }} />
          <h3>No saved routes yet</h3>
          <p>When you search for rides, you can save your frequent routes here for quick booking.</p>
          <button className="primary-btn" onClick={() => navigate('/find-ride')}>
            <Search size={16} /> Find a Ride
          </button>
        </div>
      ) : (
        <div className="routes-list">
          <div className="routes-count">{routes.length} saved route{routes.length !== 1 ? 's' : ''}</div>
          {routes.map(route => (
            <div key={route.id} className="route-card glass-card">
              <div className="route-card-main">
                <div className="route-visual">
                  <div className="route-stop">
                    <span className="route-dot origin-dot" />
                    <div>
                      <span className="route-label">From</span>
                      <span className="route-place">{route.origin}</span>
                    </div>
                  </div>
                  <div className="route-connector-line" />
                  <div className="route-stop">
                    <span className="route-dot dest-dot" />
                    <div>
                      <span className="route-label">To</span>
                      <span className="route-place">{route.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="route-schedule">
                  {route.time && (
                    <span className="schedule-chip">
                      <Clock size={12} /> {route.time}
                    </span>
                  )}
                  {route.days && route.days.length > 0 && route.days.map(d => (
                    <span key={d} className="day-chip">{d.slice(0, 3)}</span>
                  ))}
                </div>
              </div>

              <div className="route-card-actions">
                <button
                  className="primary-btn quick-book-btn"
                  onClick={() => handleQuickBook(route)}
                >
                  <Search size={14} /> Quick Book
                </button>
                <button
                  className="danger-btn"
                  onClick={() => handleDelete(route.id)}
                  disabled={deletingId === route.id}
                >
                  {deletingId === route.id ? <span className="spinner" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating add button to offer a ride and save route */}
      <button
        className="fab-add"
        onClick={() => navigate('/offer-ride')}
        title="Offer a ride"
      >
        <Plus size={22} />
      </button>
    </div>
  );
};

export default SavedRoutesPage;

