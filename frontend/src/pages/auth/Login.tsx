import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonIcon,
  IonSpinner, IonToast,
} from '@ionic/react';
import {
  lockClosedOutline, eyeOutline,
  eyeOffOutline, logInOutline, logoGoogle,
  arrowForwardOutline, callOutline, globeOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

const Login: React.FC = () => {
  const history = useHistory();
  const { login, continueAsGuest, error: authError, clearError } = useAuth();

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

    if (!identifier) return setError('Please enter your phone number or email');
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
      <IonContent className="auth-content">
        <div className="reg-page-container">
          <div className="reg-card">
            <div className="reg-header">
              <h1 className="reg-logo">🚀 NAVIGO</h1>
              <p className="reg-tagline">Navigate Your World</p>
            </div>

            <div className="reg-form">
              {/* Identifier Input */}
              <div className="input-group">
                <label className="input-label">Email or Phone *</label>
                <div className="input-wrapper">
                  <div className="phone-prefix" style={{ display: identifier.includes('@') ? 'none' : 'flex' }}>
                    <IonIcon icon={globeOutline} />
                    <span>{countryCode}</span>
                  </div>
                  <input
                    className="input-field phone-input"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Phone number or Email"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="input-group">
                <label className="input-label">Password *</label>
                <div className="input-wrapper password-wrapper">
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
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="options-row">
                <label className="remember-wrap">
                  <input
                    type="checkbox"
                    className="remember-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="remember-text">Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
              </div>

              {error && <div className="error-msg">{error || authError}</div>}

              {/* Login Button */}
              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" /> : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Sign In <IonIcon icon={logInOutline} />
                  </span>
                )}
              </button>

              {/* USSD Offline */}
              <button className="ussd-action" onClick={() => history.push('/ussd')}>
                <IonIcon icon={callOutline} />
                📱 No internet? Dial *284*624#
              </button>

              <div className="divider">or continue with</div>

              {/* Google Login */}
              <button
                className="social-btn"
                onClick={() => window.location.href = `${BASE_URL}/auth/google`}
              >
                <IonIcon icon={logoGoogle} /> Continue with Google
              </button>
            </div>

            {/* Register Link */}
            <div className="auth-footer">
              <p>Don't have an account? <Link to="/register">Create Account</Link></p>
            </div>

            <div className="divider">Just browsing?</div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <button className="guest-link" onClick={handleGuest}>
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