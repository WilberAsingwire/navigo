import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonSegment, IonSegmentButton,
  IonText, IonNote, IonCheckbox, IonList
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, personOutline,
  mailOutline, eyeOutline, eyeOffOutline, logInOutline,
  arrowBackOutline, carOutline, bicycleOutline, personOutline as RiderIcon
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Register: React.FC = () => {
  const history = useHistory();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('rider');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleRegister = async () => {
    setError('');

    if (!name.trim()) return setError('Please enter your name');
    if (!phone.trim()) return setError('Please enter your phone number');
    if (!password) return setError('Please enter a password');
    if (password.length < 4) return setError('Password must be at least 4 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!acceptTerms) return setError('Please accept the Terms of Service');

    setIsLoading(true);
    try {
      await register(name.trim(), phone.trim(), password, email.trim() || undefined, role || 'rider');
      if (role === 'driver' || role === 'motorist') {
        history.push(`/${role}/home`);
      } else {
        history.push('/rider/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.push('/login')}>
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="auth-content">
        <div className="auth-container">
          <div className="auth-logo">
            <h1>🚀 NAVIGO</h1>
            <p>Navigate Your World</p>
          </div>

          {/* Role Selector */}
          <IonSegment 
            value={role} 
            onIonChange={(e) => setRole(e.detail.value as string)}
            className="role-segment"
          >
            <IonSegmentButton value="rider">
              <IonIcon icon={RiderIcon} />
              <IonLabel>Rider</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="driver">
              <IonIcon icon={carOutline} />
              <IonLabel>Driver</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="motorist">
              <IonIcon icon={bicycleOutline} />
              <IonLabel>Boda</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {(role === 'driver' || role === 'motorist') && (
            <div className="verification-notice">
              <IonIcon icon={carOutline} />
              <p>{role === 'driver' ? 'Drivers' : 'Motorists'} must upload documents for verification after registration.</p>
            </div>
          )}

          {/* Name */}
          <IonItem className="auth-input">
            <IonIcon icon={personOutline} slot="start" />
            <IonLabel position="stacked">Full Name *</IonLabel>
            <IonInput
              type="text"
              value={name}
              onIonInput={(e) => setName(e.detail.value!)}
              placeholder="Enter your full name"
            />
          </IonItem>

          {/* Phone */}
          <IonItem className="auth-input">
            <IonIcon icon={phonePortraitOutline} slot="start" />
            <IonLabel position="stacked">Phone Number *</IonLabel>
            <IonInput
              type="tel"
              value={phone}
              onIonInput={(e) => setPhone(e.detail.value!)}
              placeholder="0772000000"
            />
            <IonNote slot="helper">Uganda format: 07XX or +2567XX</IonNote>
          </IonItem>

          {/* Email (OPTIONAL) */}
          <IonItem className="auth-input">
            <IonIcon icon={mailOutline} slot="start" />
            <IonLabel position="stacked">Email <IonText color="medium">(Optional)</IonText></IonLabel>
            <IonInput
              type="email"
              value={email}
              onIonInput={(e) => setEmail(e.detail.value!)}
              placeholder="For receipts & notifications"
            />
          </IonItem>

          {/* Password */}
          <IonItem className="auth-input">
            <IonIcon icon={lockClosedOutline} slot="start" />
            <IonLabel position="stacked">Password *</IonLabel>
            <IonInput
              type={showPassword ? 'text' : 'password'}
              value={password}
              onIonInput={(e) => setPassword(e.detail.value!)}
              placeholder="Min 4 characters"
            />
            <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)}>
              <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
            </IonButton>
          </IonItem>

          {/* Confirm Password */}
          <IonItem className="auth-input">
            <IonIcon icon={lockClosedOutline} slot="start" />
            <IonLabel position="stacked">Confirm Password *</IonLabel>
            <IonInput
              type="password"
              value={confirmPassword}
              onIonInput={(e) => setConfirmPassword(e.detail.value!)}
              placeholder="Re-enter password"
            />
          </IonItem>

          {/* Terms */}
          <IonItem lines="none" className="terms-item">
            <IonCheckbox 
              slot="start" 
              checked={acceptTerms}
              onIonChange={(e) => setAcceptTerms(e.detail.checked)}
            />
            <IonLabel className="terms-label">
              I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
            </IonLabel>
          </IonItem>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Register Button */}
          <IonButton
            expand="block"
            className="auth-button"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? <IonSpinner /> : 'Create Account'}
          </IonButton>

          {/* Login Link */}
          <div className="auth-switch">
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
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

export default Register;