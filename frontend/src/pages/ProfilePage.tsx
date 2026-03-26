import React, { useEffect, useState } from 'react';
import { User } from '../models/User';
import { Route } from '../models/Route';
import { UserService } from '../services/UserService';
import { RouteService } from '../services/RouteService';
import RouteForm from '../components/RouteForm';
import { Mail, GraduationCap, MapPin, Calendar, Clock, Navigation, ShieldCheck } from 'lucide-react';

const ProfilePage: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<User | undefined>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [matches, setMatches] = useState<Route[]>([]);
  const [verificationForm, setVerificationForm] = useState({
    studentIdNumber: '',
    licenseNumber: '',
    vehicleRegNumber: '',
  });
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');

  useEffect(() => {
    UserService.getUser(userId).then((userData) => {
      setUser(userData);
      if (userData?.verification) {
        setVerificationForm({
          studentIdNumber: userData.verification.studentIdNumber || '',
          licenseNumber: userData.verification.licenseNumber || '',
          vehicleRegNumber: userData.verification.vehicleRegNumber || '',
        });
      }
    });
    RouteService.getUserRoutes(userId).then(setRoutes);
  }, [userId]);

  const handleRouteCreated = (data: { newRoute: Route; matches: Route[] }) => {
    RouteService.getUserRoutes(userId).then(setRoutes);
    setMatches(data.matches);
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationSubmitting(true);
    setVerificationError('');
    setVerificationSuccess('');

    try {
      const response = await UserService.submitVerification(userId, verificationForm);
      setUser(response.user);
      setVerificationSuccess('Verification details submitted. Review is pending.');
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Failed to submit verification');
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const status = user?.verificationStatus || 'unverified';
  const statusStyle =
    status === 'verified'
      ? { background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }
      : status === 'pending'
        ? { background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.35)' }
        : status === 'rejected'
          ? { background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.35)' }
          : { background: 'rgba(107, 114, 128, 0.12)', color: '#4b5563', border: '1px solid rgba(107,114,128,0.3)' };

  if (!user) {
    return <div className="profile-container">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 style={{margin: 0, fontSize: '2.5rem'}}>{user.name}'s Profile</h1>
        <div style={{display: 'flex', gap: '2rem', marginTop: '1.5rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Mail size={18} /> {user.email}
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <GraduationCap size={18} /> {user.university}
          </div>
        </div>
      </div>

      <div className="white-section">
        <h2 className="section-title">Rider <span>Verification</span></h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <ShieldCheck size={18} />
            Verification Status:
          </div>
          <span
            style={{
              ...statusStyle,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'capitalize',
            }}
          >
            {status}
          </span>
        </div>

        <form onSubmit={handleVerificationSubmit}>
          <div className="form-group">
            <label>Student ID Number</label>
            <input
              type="text"
              value={verificationForm.studentIdNumber}
              onChange={(e) => setVerificationForm((prev) => ({ ...prev, studentIdNumber: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Driving License Number</label>
            <input
              type="text"
              value={verificationForm.licenseNumber}
              onChange={(e) => setVerificationForm((prev) => ({ ...prev, licenseNumber: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Vehicle Registration Number</label>
            <input
              type="text"
              value={verificationForm.vehicleRegNumber}
              onChange={(e) => setVerificationForm((prev) => ({ ...prev, vehicleRegNumber: e.target.value }))}
              required
            />
          </div>
          <button type="submit" disabled={verificationSubmitting} style={{ marginTop: '0.8rem' }}>
            {verificationSubmitting ? 'Submitting...' : 'Submit Verification'}
          </button>
        </form>

        {verificationError && (
          <p style={{ color: '#dc2626', fontWeight: 600, marginTop: '0.8rem' }}>{verificationError}</p>
        )}
        {verificationSuccess && (
          <p style={{ color: '#16a34a', fontWeight: 600, marginTop: '0.8rem' }}>{verificationSuccess}</p>
        )}
        {user.verification?.reviewerNote && (
          <p style={{ marginTop: '0.8rem', color: 'var(--text-muted)' }}>
            Reviewer note: {user.verification.reviewerNote}
          </p>
        )}
      </div>

      <div className="white-section">
        <h2 className="section-title">Add Regular <span>Route</span></h2>
        <RouteForm user={user} onRouteCreated={handleRouteCreated} />
      </div>

      {matches.length > 0 && (
        <div className="white-section" style={{borderColor: 'var(--primary)', borderWidth: '2px'}}>
          <h2 className="section-title">Matches <span>Found!</span></h2>
          <div className="ride-list">
            {matches.map((match) => (
              <div key={match.id} className="ride-card" style={{backgroundColor: 'var(--primary)', border: 'none'}}>
                <div className="info-item">
                  <Navigation size={18} />
                  <span className="info-label">Driver:</span> {match.user.name}
                </div>
                <div className="info-item">
                  <MapPin size={18} />
                  <span className="info-label">From:</span> {match.origin}
                </div>
                <div className="info-item">
                  <MapPin size={18} />
                  <span className="info-label">To:</span> {match.destination}
                </div>
                <div className="info-item">
                  <Calendar size={18} />
                  <span className="info-label">Days:</span> {match.days.join(', ')}
                </div>
                <div className="info-item">
                  <Clock size={18} />
                  <span className="info-label">Time:</span> {match.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="white-section">
        <h2 className="section-title">My Regular <span>Routes</span></h2>
        <div className="ride-list">
          {routes.map((route) => (
            <div key={route.id} className="ride-card">
              <div className="info-item">
                <MapPin size={18} color="var(--primary)" />
                <span className="info-label">From:</span> {route.origin}
              </div>
              <div className="info-item">
                <MapPin size={18} color="var(--primary)" />
                <span className="info-label">To:</span> {route.destination}
              </div>
              <div className="info-item">
                <Calendar size={18} color="var(--primary)" />
                <span className="info-label">Days:</span> {route.days.join(', ')}
              </div>
              <div className="info-item">
                <Clock size={18} color="var(--primary)" />
                <span className="info-label">Time:</span> {route.time}
              </div>
            </div>
          ))}
          {routes.length === 0 && <p style={{textAlign: 'center', gridColumn: '1/-1'}}>No routes added yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
