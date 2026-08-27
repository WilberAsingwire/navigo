import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonIcon,
  IonSpinner, IonToast,
} from '@ionic/react';
import {
  eyeOutline, eyeOffOutline, logInOutline, logoGoogle,
  arrowForwardOutline, callOutline, globeOutline,
  shieldCheckOutline, zapOutline, badgeCheckOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './AuthStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

const Login: React.FC = () => {
  const history = useHistory();
  const { login, continueAsGuest, error: authError, clearError } = useAuth();

  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [countryCode] = useState('+256');

  const handleLogin = async () => {
    setError('');
    clearError();

    if (!identifier) return setError('Please enter your credentials');
    if (!password) return setError('Please enter your password');
    if (password.length < 4) return setError('Password must be at least 4 characters');

    setIsLoading(true);
    try {
      await login(identifier, password);
      if (rememberMe) localStorage.setItem('navigo_remember', 'true');
      const savedUser = localStorage.getItem('navigo_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const redirectPath = user.role === 'admin' ? '/admin/dashboard' :
                            (user.role === 'driver' || user.role === 'motorist') ? '/driver/home' : '/rider/home';
        history.push(redirectPath);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    history.push('/explore');
  };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0a0a0a' }}>
        <div className="auth-container">
          <div className="glow-top"></div>
          <div className="glow-bottom"></div>

          <div className="auth-card">
            <div className="auth-header">
              <span className="auth-eyebrow">Sign in</span>
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-copy">
                New to Navigo? <Link to="/register" style={{ color: 'var(--navigo-ember)', fontWeight: 600 }}>Create your account</Link> in under a minute.
              </p>
            </div>

            <div className="method-toggle">
              <button
                className={`method-btn ${method === 'phone' ? 'active' : ''}`}
                onClick={() => setMethod('phone')}
              >
                Phone number
              </button>
              <button
                className={`method-btn ${method === 'email' ? 'active' : ''}`}
                onClick={() => setMethod('email')}
              >
                Email
              </button>
            </div>

            <div className="reg-form" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="input-group">
                <label className="input-label">{method === 'phone' ? 'Ugandan phone number' : 'Email address'}</label>
                <div style={{ position: 'relative' }}>
                  {method === 'phone' && (
                    <div style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--navigo-zinc-400)',
                      fontSize: '14px', zIndex: 1, pointerEvents: 'none'
                    }}>
                      <IonIcon icon={globeOutline} />
                      <span>{countryCode}</span>
                    </div>
                  )}
                  <input
                    className="input-field"
                    style={{ paddingLeft: method === 'phone' ? '85px' : '16px' }}
                    type={method === 'phone' ? 'text' : 'email'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={method === 'phone' ? '07... (e.g. 0772000000)' : 'you@example.com'}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--navigo-zinc-400)', cursor: 'pointer'
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navigo-zinc-400)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--navigo-ember)' }}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" style={{ color: 'var(--navigo-ember)', textDecoration: 'none', fontWeight: 500 }}>Forgot Password?</Link>
              </div>

              {error && (
                <div className="error-message">
                  <IonIcon icon={shieldCheckOutline} /> {error || authError}
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" color="dark" /> : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Continue <IonIcon icon={logInOutline} />
                  </span>
                )}
              </button>

              <button
                style={{
                  background: 'none', border: 'none', color: 'var(--navigo-zinc-400)',
                  fontSize: '13px', marginTop: '20px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
                onClick={() => history.push('/ussd')}
              >
                <IonIcon icon={callOutline} /> 📱 No internet? Dial *284*624#
              </button>

              <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--navigo-white-10)' }}></div>
                <span style={{ fontSize: '11px', color: 'var(--navigo-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or continue with</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--navigo-white-10)' }}></div>
              </div>

              <button
                style={{
                  width: '100%', height: '48px', borderRadius: '12px', border: '1px solid var(--navigo-white-10)',
                  background: 'var(--navigo-white-5)', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px'
                }}
                onClick={() => window.location.href = `${BASE_URL}/auth/google`}
              >
                <IonIcon icon={logoGoogle} /> Continue with Google
              </button>

              <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--navigo-zinc-400)' }}>
                Don't have an account? <Link to="/register" style={{ color: 'var(--navigo-ember)', fontWeight: 600, textDecoration: 'none' }}>Create Account</Link>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--navigo-zinc-500)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '0 auto' }}
                  onClick={handleGuest}
                >
                  Continue as Guest <IonIcon icon={arrowForwardOutline} />
                </button>
              </div>
            </div>

            <div className="trust-row">
              <div className="trust-item">
                <div className="trust-icon"><IonIcon icon={shieldCheckOutline} /></div>
                <span className="trust-label">Verified captains</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon"><IonIcon icon={zapOutline} /></div>
                <span className="trust-label">4-min pickups</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon"><IonIcon icon={badgeCheckOutline} /></div>
                <span className="trust-label">Fares from UGX 1,500</span>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
Guest}>
                Continue as Guest <IonIcon icon={arrowForwardOutline} slot="end" />
              </button>
            </div>
          </div>

          <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;