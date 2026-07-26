import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonText,  IonNote
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, eyeOutline,
  eyeOffOutline, logInOutline, logoGoogle, logoFacebook,
  logoGithub, arrowForwardOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const history = useHistory();
  const { login, continueAsGuest } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!phone.trim()) return setError('Please enter your phone number');
    if (!password) return setError('Please enter your password');

    setIsLoading(true);
    try {
      const response = await login(phone.trim(), password);
      // The AuthContext handles redirect. If it doesn't, force it:
      const savedUser = localStorage.getItem('navigo_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        history.push(`/${user.role}/home`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // For now: Simulate social login with mock data
    // In production: Use Passport.js OAuth redirect
    setError('Social login will be available when deployed with backend OAuth.');
  };

  const handleGuest = () => {
    continueAsGuest();
    history.push('/explore'); // Guest can see the ride booking page
};

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Welcome Back</IonTitle>
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
              value={phone}
              onIonInput={(e) => setPhone(e.detail.value!)}
              placeholder="0772000000"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
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
              <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
            </IonButton>
          </IonItem>

          {/* Forgot Password */}
          <div className="forgot-password-link">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Login Button */}
          <IonButton
            expand="block"
            className="auth-button"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? <IonSpinner /> : (
              <>Sign In <IonIcon icon={logInOutline} slot="end" /></>
            )}
          </IonButton>
          <IonButton expand="block" fill="clear" size="small" onClick={() => history.push('/ussd')}>
  📱 Book without internet? Dial *284*624#
</IonButton>

          {/* Social Login */}
          <div className="auth-divider">
  <IonText color="medium">or continue with</IonText>
</div>
          <div className="social-buttons">
            <IonButton 
              expand="block" 
              fill="outline" 
              className="social-btn google"
              onClick={() => window.location.href='https://navigo-fzdo.onrender.com/api/auth/google'}
            >
              <IonIcon icon={logoGoogle} slot="start" />
              Google
            </IonButton>

            <IonButton 
              expand="block" 
              fill="outline" 
              className="social-btn facebook"
              onClick={() => window.location.href='https://navigo-fzdo.onrender.com/api/auth/facebook'}
            >
              <IonIcon icon={logoFacebook} slot="start" />
              Facebook
            </IonButton>

            
          </div>

          {/* Register Link */}
          <div className="auth-switch">
            <p>Don't have an account? <Link to="/register">Create Account</Link></p>
          </div>

          {/* Guest Mode */}
          <div className="guest-mode">
            <IonButton 
              expand="block" 
              fill="clear" 
              size="small"
              onClick={handleGuest}
            >
              Continue as Guest <IonIcon icon={arrowForwardOutline} slot="end" />
            </IonButton>
            <IonNote color="medium">Browse fares & routes without an account</IonNote>
          </div>
        </div>

        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError('')}
          message={error}
          duration={4000}
          color="danger"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;