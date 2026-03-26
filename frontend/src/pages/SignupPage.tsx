import React, { useState } from 'react';
import { UserService } from '../services/UserService';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const SignupPage: React.FC<{ setUserId: (id: string) => void }> = ({ setUserId }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    UserService.signup({ name, email, phone, password, university: '' })
      .then((user) => {
        setUserId(user.id);
        localStorage.setItem('userId', user.id);
        navigate('/');
      })
      .catch((err) => setError(err.message));
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    UserService.googleLogin(credentialResponse.credential)
      .then((user) => {
        setUserId(user.id);
        localStorage.setItem('userId', user.id);
        navigate('/');
      })
      .catch((err) => setError(err.message));
  };

  return (
    <div className="profile-container" style={{maxWidth: '450px'}}>
      <div className="white-section">
        <h2 className="section-title">Join <span className="uniride-brand">UniRide</span></h2>
        
        {error && <p style={{ color: '#ff4757', fontWeight: 600, textAlign: 'center' }}>{error}</p>}

        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign Up Failed')}
            useOneTap
            text="signup_with"
            width="100%"
          />
        </div>

        <div style={{display: 'flex', alignItems: 'center', margin: '1rem 0'}}>
          <div style={{flex: 1, height: '1px', background: 'var(--border)'}}></div>
          <span style={{margin: '0 10px', color: 'var(--text-muted)', fontSize: '0.8rem'}}>OR</span>
          <div style={{flex: 1, height: '1px', background: 'var(--border)'}}></div>
        </div>

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit">Sign Up</button>
        </form>
        <p style={{textAlign: 'center', marginTop: '1rem'}}>
          Already have an account? <Link to="/login" style={{color: 'var(--accent)', fontWeight: '700'}}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
