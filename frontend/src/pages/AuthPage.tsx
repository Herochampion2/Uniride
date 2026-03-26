import React, { useState, useEffect } from 'react';
import { UserService } from '../services/UserService';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const AuthPage: React.FC<{ setUserId: (id: string) => void }> = ({ setUserId }) => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [showPasswordSignup, setShowPasswordSignup] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
    setError('');
  }, [location.pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = isLogin 
      ? UserService.login({ email, password }) 
      : UserService.signup({ name, email, phone, password, university: '' });

    action
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      padding: '20px',
    }}>
      {/* Sign Up Card - Toggle Visibility */}
      <div style={{
        display: !isLogin ? 'flex' : 'none',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        background: 'white',
        minHeight: '500px',
        maxWidth: '550px',
        width: '100%',
        transition: 'all 0.5s ease',
        animation: !isLogin ? 'fadeInScale 0.5s ease' : 'fadeOutScale 0.5s ease',
      }}>
        {/* Form Section */}
        <div style={{
          flex: 1,
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'white'
        }}>
          <h3 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            color: 'var(--text-main)',
            margin: '0 0 1.5rem 0',
            letterSpacing: '-0.5px'
          }}>
            Create Account
          </h3>

          {error && (
            <div style={{
              background: 'rgba(255, 77, 77, 0.1)',
              color: '#ff4d4d',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              border: '1px solid rgba(255, 77, 77, 0.3)'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.2rem'
          }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign up failed')}
            />
          </div>

          {/* Social Login */}
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '1.2rem',
            fontSize: '0.85rem'
          }}>
            <span style={{color: 'var(--text-muted)'}}>or use your email for registration</span>
          </div>

          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              style={{
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(178, 211, 194, 0.1)';}}
              onBlur={(e) => {e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none';}}
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={{
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(178, 211, 194, 0.1)';}}
              onBlur={(e) => {e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none';}}
            />

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              required
              style={{
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(178, 211, 194, 0.1)';}}
              onBlur={(e) => {e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none';}}
            />

<div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <input
                type={showPasswordSignup ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={{
                  padding: '12px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit',
                  flex: 1
                }}
                onFocus={(e) => {e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(178, 211, 194, 0.1)';}}  
                onBlur={(e) => {e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none';}}
              />
              <button
                type="button"
                onClick={() => setShowPasswordSignup(!showPasswordSignup)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0'
                }}
              >
                <i className={`fas ${showPasswordSignup ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>

            <button
              type="submit"
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #9bc39a 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(178, 211, 194, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Sign Up
            </button>
          </form>
        </div>

        {/* Welcome Section */}
        <div style={{
          flex: 0.8,
          background: 'linear-gradient(135deg, var(--primary) 0%, #9bc39a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div>
            <h4 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              margin: '0 0 1rem 0',
              letterSpacing: '-0.5px'
            }}>
              Welcome Back!
            </h4>
            <p style={{
              fontSize: '0.85rem',
              lineHeight: '1.5',
              opacity: 0.95,
              margin: '0 0 1.2rem 0',
              fontWeight: '400'
            }}>
              To keep connected with us please login with your personal info
            </p>
            <button
              onClick={() => { setIsLogin(true); navigate('/login'); }}
              style={{
                background: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                border: '2px solid white',
                padding: '10px 28px',
                borderRadius: '25px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Sign In Card - Toggle Visibility */}
      <div style={{
        display: isLogin ? 'flex' : 'none',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        background: 'white',
        minHeight: '500px',
        maxWidth: '550px',
        width: '100%',
        transition: 'all 0.5s ease',
        animation: isLogin ? 'fadeInScale 0.5s ease' : 'fadeOutScale 0.5s ease',
        flexDirection: 'row-reverse'
      }}>
        {/* Form Section */}
        <div style={{
          flex: 1,
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'white'
        }}>
          <h3 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            color: 'var(--text-main)',
            margin: '0 0 1.5rem 0',
            letterSpacing: '-0.5px'
          }}>
            Sign in
          </h3>

          {error && (
            <div style={{
              background: 'rgba(255, 77, 77, 0.1)',
              color: '#ff4d4d',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              border: '1px solid rgba(255, 77, 77, 0.3)'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.2rem'
          }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign in failed')}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '1.2rem',
            fontSize: '0.85rem'
          }}>
            <span style={{color: 'var(--text-muted)'}}>or use your account</span>
          </div>

          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={{
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px rgba(65, 66, 76, 0.1)';}}
              onBlur={(e) => {e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none';}}
            />

            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <input
                type={showPasswordLogin ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={{
                  padding: '12px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit',
                  flex: 1
                }}
                onFocus={(e) => {e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px rgba(65, 66, 76, 0.1)';}}
                onBlur={(e) => {e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none';}}
              />
              <button
                type="button"
                onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0'
                }}
              >
                <i className={`fas ${showPasswordLogin ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>

            <div style={{
              textAlign: 'right',
              marginBottom: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setError('Password reset coming soon')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, var(--accent) 0%, rgba(65, 66, 76, 0.8) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(65, 66, 76, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Welcome Section */}
        <div style={{
          flex: 0.8,
          background: 'linear-gradient(135deg, var(--accent) 0%, rgba(65, 66, 76, 0.8) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div>
            <h4 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              margin: '0 0 1rem 0',
              letterSpacing: '-0.5px'
            }}>
              Hello, Friend!
            </h4>
            <p style={{
              fontSize: '0.85rem',
              lineHeight: '1.5',
              opacity: 0.95,
              margin: '0 0 1.2rem 0',
              fontWeight: '400'
            }}>
              Enter your personal details and start your journey with us
            </p>
            <button
              onClick={() => { setIsLogin(false); navigate('/signup'); }}
              style={{
                background: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                border: '2px solid white',
                padding: '10px 28px',
                borderRadius: '25px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
