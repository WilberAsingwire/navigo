import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonText, IonNote, IonCheckbox
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, eyeOutline,
  eyeOffOutline, logInOutline, logoGoogle, 
  arrowForwardOutline, callOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const history = useHistory();
  const { login, continueAsGuest, error: authError, clearError } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('256')) return '0' + cleaned.slice(3);
    return cleaned;
  };

  const handleLogin = async () => {
    setError('');
    clearError();
    const cleanPhone = formatPhone(phone);
    
    if (!cleanPhone) return setError('Please enter your phone number');
    if (cleanPhone.length < 10) return setError('Please enter a valid phone number (10 digits)');
    if (!password) return setError('Please enter your password');
    if (password.length < 4) return setError('Password must be at least 4 characters');

    setIsLoading(true);
    try {
      const response = await login(cleanPhone, password);
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
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ color: '#fff' }}>Welcome Back</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="auth-content">
        <div className="auth-container">
          <div className="auth-logo">
            <h1>🚀 NAVIGO</h1>
            <p>Navigate Your World</p>
          </div>

          {/* Phone Input */}
          <IonItem className="auth-input">
            <IonIcon icon={phonePortraitOutline} slot="start" />
            <IonLabel position="stacked">Phone Number</IonLabel>
            <IonInput
              type="tel"
              inputmode="numeric"
              value={phone}
              onIonInput={(e) => setPhone(formatPhone(e.detail.value!))}
              placeholder="0772000000"
              maxlength={12}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <IonNote slot="helper">Enter your registered phone number</IonNote>
          </IonItem>

          {/* Password Input */}
          <IonItem className="auth-input">
            <IonIcon icon={lockClosedOutline} slot="start" />
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput
              type={showPassword ? 'text' : 'password'}
              value={password}
              onIonInput={(e) => setPassword(e.detail.value!)}
              placeholder="Enter your password"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)}>
              <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} style={{ color: '#888' }} />
            </IonButton>
          </IonItem>

          {/* Remember Me & Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IonCheckbox checked={rememberMe} onIonChange={e => setRememberMe(e.detail.checked)} style={{ '--size': '16px', '--border-radius': '4px' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Remember me</span>
            </div>
            <Link to="/forgot-password" style={{ color: '#FF6B35', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>Forgot Password?</Link>
          </div>

          {/* Error */}
          {(error || authError) && (
            <div className="auth-error">
              <IonIcon icon={informationCircleOutline} style={{ marginRight: 6 }} />
              {error || authError}
            </div>
          )}

          {/* Login Button */}
          <IonButton expand="block" className="auth-button" onClick={handleLogin} disabled={isLoading}>
            {isLoading ? <IonSpinner name="crescent" /> : (<>Sign In <IonIcon icon={logInOutline} slot="end" /></>)}
          </IonButton>

          {/* USSD Offline */}
          <IonButton expand="block" fill="clear" size="small" onClick={() => history.push('/ussd')} style={{ marginTop: 8 }}>
            <IonIcon icon={callOutline} slot="start" />
            📱 No internet? Dial *284*624#
          </IonButton>

        

          {/* Social Login */}
          <div className="auth-divider"><IonText color="medium">or continue with</IonText></div>
          <div className="social-buttons">
            <IonButton expand="block" fill="outline" className="social-btn google"
              onClick={() => window.location.href = 'https://navigo-fzdo.onrender.com/auth/google'}>
              <IonIcon icon={logoGoogle} slot="start" /> Continue with Google
            </IonButton>
          </div>

          {/* Register Link */}
          <div className="auth-switch">
            <p>Don't have an account? <Link to="/register">Create Account</Link></p>
          </div>

          {/* Guest Mode */}
          <div className="guest-mode">
            <IonButton expand="block" fill="clear" size="small" onClick={handleGuest}>
              Continue as Guest <IonIcon icon={arrowForwardOutline} slot="end" />
            </IonButton>
            <IonNote color="medium">Browse fares & routes without an account</IonNote>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default Login;