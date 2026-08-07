import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonText, IonNote, IonCheckbox,
  IonCard, IonCardContent
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, eyeOutline,
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
  const [countryCode, setCountryCode] = useState('+256');

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
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
  <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
    <IonTitle style={{color: '#fff'}}>Welcome Back</IonTitle>
  </IonToolbar>
</IonHeader>

      <IonContent className="auth-content">
        <div className="auth-container">
          
          {/* Logo */}
          <div className="auth-logo">
            <h1 className="logo-main">🚀 NAVIGO</h1>
            <p className="logo-tagline">Navigate Your World</p>
          </div>

          {/* Login Card */}
          <IonCard className="login-card">
            <IonCardContent>

              {/* Identifier Input (Phone or Email) */}
              <div className="phone-input-group">
                <div className="country-code" style={{ display: identifier.includes('@') ? 'none' : 'flex' }}>
                  <IonIcon icon={globeOutline} />
                  <span>{countryCode}</span>
                </div>
                <IonItem className="auth-input phone-field" lines="none">
                  <IonInput
                    type="text"
                    value={identifier}
                    onIonInput={(e) => setIdentifier(e.detail.value!)}
                    placeholder="Phone number or Email"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </IonItem>
              </div>
              <IonNote className="input-helper">Enter your registered phone number or email</IonNote>

              {/* Password Input */}
              <IonItem className="auth-input password-field">
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value!)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                  <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                </IonButton>
              </IonItem>

              {/* Remember Me & Forgot Password */}
              <div className="login-options-row">
                <div className="remember-me-wrap">
                  <IonCheckbox checked={rememberMe} onIonChange={e => setRememberMe(e.detail.checked)} className="custom-checkbox" />
                  <span>Remember me</span>
                </div>
                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
              </div>

              {/* Error */}
              {(error || authError) && (
                <div className="auth-error">
                  <IonIcon icon={callOutline} style={{ marginRight: 6 }} />
                  {error || authError}
                </div>
              )}

              {/* Login Button */}
              <IonButton expand="block" className="auth-button login-btn" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? <IonSpinner name="crescent" /> : (<>Sign In <IonIcon icon={logInOutline} slot="end" /></>)}
              </IonButton>

              {/* USSD Offline */}
              <IonButton expand="block" fill="clear" className="ussd-link" onClick={() => history.push('/ussd')}>
                <IonIcon icon={callOutline} slot="start" />
                📱 No internet? Dial *284*624#
              </IonButton>

              {/* Divider */}
              <div className="auth-divider"><IonText color="medium">or continue with</IonText></div>

              {/* Google Login */}
              <IonButton expand="block" fill="outline" className="social-btn google-btn"
                onClick={() => window.location.href = `${BASE_URL}/auth/google`}>
                <IonIcon icon={logoGoogle} slot="start" /> Continue with Google
              </IonButton>

            </IonCardContent>
          </IonCard>

          {/* Register Link */}
          <div className="auth-switch">
            <p>Don't have an account? <Link to="/register" className="create-account-link">Create Account</Link></p>
          </div>

          {/* Guest Mode */}
          <div className="guest-mode">
            <IonButton expand="block" fill="clear" className="guest-btn" onClick={handleGuest}>
              Continue as Guest <IonIcon icon={arrowForwardOutline} slot="end" />
            </IonButton>
            <IonNote color="medium" className="guest-note">Browse fares & routes without an account</IonNote>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default Login;