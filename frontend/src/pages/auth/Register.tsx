import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonSegment, IonSegmentButton,
  IonText, IonNote, IonCheckbox, IonProgressBar
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, personOutline,
  mailOutline, eyeOutline, eyeOffOutline,
  arrowBackOutline, carOutline, bicycleOutline, personOutline as RiderIcon,
  checkmarkCircleOutline, starOutline, cashOutline,
  shieldCheckmarkOutline, informationCircleOutline
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
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('256')) return '0' + cleaned.slice(3);
    return cleaned;
  };

  const getPasswordStrength = (pwd: string): { label: string; color: string; percent: number } => {
    if (!pwd) return { label: '', color: 'medium', percent: 0 };
    if (pwd.length < 4) return { label: 'Weak', color: 'danger', percent: 0.25 };
    if (pwd.length < 6) return { label: 'Fair', color: 'warning', percent: 0.5 };
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Good', color: 'primary', percent: 0.75 };
    return { label: 'Strong', color: 'success', percent: 1 };
  };

  const passwordStrength = getPasswordStrength(password);

  const getRoleBenefits = (r: string) => {
    switch (r) {
      case 'rider': return { icon: starOutline, text: 'Book rides, earn Zawadi points, get discounts!' };
      case 'driver': return { icon: cashOutline, text: 'Earn UGX 50K-150K daily, keep 90% of fares!' };
      case 'motorist': return { icon: shieldCheckmarkOutline, text: 'Boda Safe certified, free helmet, instant payouts!' };
      default: return null;
    }
  };

  const handleRegister = async () => {
    setError('');

    if (!role) return setError('Please select your role (Rider, Driver, or Boda)');
    if (!name.trim()) return setError('Please enter your full name');
    if (name.trim().length < 2) return setError('Name must be at least 2 characters');
    
    const cleanPhone = formatPhone(phone);
    if (!cleanPhone) return setError('Please enter your phone number');
    if (cleanPhone.length < 10) return setError('Please enter a valid phone number (10 digits)');
    
    if (!password) return setError('Please enter a password');
    if (password.length < 4) return setError('Password must be at least 4 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!acceptTerms) return setError('Please accept the Terms of Service');

    setIsLoading(true);
    try {
      await register(name.trim(), cleanPhone, password, email.trim() || undefined, role);
      const redirectPath = (role === 'driver' || role === 'motorist') ? `/${role}/home` : '/rider/home';
      history.push(redirectPath);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = getRoleBenefits(role);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.push('/login')}>
            <IonIcon icon={arrowBackOutline} style={{ color: '#fff' }} />
          </IonButton>
          <IonTitle style={{ color: '#fff' }}>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="auth-content">
        <div className="auth-container">
          <div className="auth-logo">
            <h1>🚀 NAVIGO</h1>
            <p>Join Uganda's Smartest Ride-Hailing App</p>
          </div>

          {/* Role Selector */}
          <IonSegment value={role} onIonChange={(e) => setRole(e.detail.value as string)} className="role-segment">
            <IonSegmentButton value="rider">
              <IonIcon icon={RiderIcon} />
              <IonLabel style={{ fontSize: 11 }}>Rider</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="driver">
              <IonIcon icon={carOutline} />
              <IonLabel style={{ fontSize: 11 }}>Driver</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="motorist">
              <IonIcon icon={bicycleOutline} />
              <IonLabel style={{ fontSize: 11 }}>Motorist</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* Role Benefits */}
          {benefits && (
            <div style={{ background: 'rgba(255,107,53,0.06)', borderRadius: 12, padding: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,107,53,0.15)' }}>
              <IonIcon icon={benefits.icon} style={{ color: '#FF6B35', fontSize: 20, flexShrink: 0 }} />
              <p style={{ color: 'rgba(255,248,240,0.7)', fontSize: 12, margin: 0 }}>{benefits.text}</p>
            </div>
          )}

          {/* Driver/Motorist Notice */}
          {(role === 'driver' || role === 'motorist') && (
            <div className="verification-notice">
              <IonIcon icon={informationCircleOutline} />
              <p>You'll need to upload your driver's license and vehicle documents for verification after signing up.</p>
            </div>
          )}

          {/* Name */}
          <IonItem className="auth-input">
            <IonIcon icon={personOutline} slot="start" />
            <IonLabel position="stacked">Full Name *</IonLabel>
            <IonInput type="text" value={name} onIonInput={(e) => setName(e.detail.value!)} placeholder="Enter your full name" />
          </IonItem>

          {/* Phone */}
          <IonItem className="auth-input">
            <IonIcon icon={phonePortraitOutline} slot="start" />
            <IonLabel position="stacked">Phone Number *</IonLabel>
            <IonInput type="tel" inputmode="numeric" value={phone} onIonInput={(e) => setPhone(formatPhone(e.detail.value!))} placeholder="0772000000" maxlength={12} />
            <IonNote slot="helper">Uganda format: 07XX XXXXXX</IonNote>
          </IonItem>

          {/* Email */}
          <IonItem className="auth-input">
            <IonIcon icon={mailOutline} slot="start" />
            <IonLabel position="stacked">Email <IonText color="medium">(Optional)</IonText></IonLabel>
            <IonInput type="email" value={email} onIonInput={(e) => setEmail(e.detail.value!)} placeholder="For receipts & notifications" />
          </IonItem>

          {/* Password */}
          <IonItem className="auth-input">
            <IonIcon icon={lockClosedOutline} slot="start" />
            <IonLabel position="stacked">Password *</IonLabel>
            <IonInput type={showPassword ? 'text' : 'password'} value={password} onIonInput={(e) => setPassword(e.detail.value!)} placeholder="Minimum 4 characters" />
            <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)}>
              <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} style={{ color: '#888' }} />
            </IonButton>
          </IonItem>

          {/* Password Strength */}
          {password.length > 0 && (
            <div style={{ marginBottom: 12, padding: '0 4px' }}>
              <IonProgressBar value={passwordStrength.percent} color={passwordStrength.color} style={{ height: 4, borderRadius: 2 }} />
              <p style={{ color: passwordStrength.color === 'danger' ? '#ff5252' : passwordStrength.color === 'warning' ? '#FFC107' : passwordStrength.color === 'success' ? '#2D6A4F' : '#4da6ff', fontSize: 10, margin: '4px 0 0' }}>
                {passwordStrength.label} password
              </p>
            </div>
          )}

          {/* Confirm Password */}
          <IonItem className="auth-input">
            <IonIcon icon={lockClosedOutline} slot="start" />
            <IonLabel position="stacked">Confirm Password *</IonLabel>
            <IonInput type="password" value={confirmPassword} onIonInput={(e) => setConfirmPassword(e.detail.value!)} placeholder="Re-enter your password" />
            {confirmPassword && password === confirmPassword && (
              <IonIcon icon={checkmarkCircleOutline} slot="end" style={{ color: '#2D6A4F' }} />
            )}
          </IonItem>

          {/* Terms */}
          <IonItem lines="none" className="terms-item">
            <IonCheckbox slot="start" checked={acceptTerms} onIonChange={(e) => setAcceptTerms(e.detail.checked)} style={{ '--size': '16px' }} />
            <IonLabel className="terms-label" style={{ fontSize: 12 }}>
              I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
            </IonLabel>
          </IonItem>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Register Button */}
          <IonButton expand="block" className="auth-button" onClick={handleRegister} disabled={isLoading}>
            {isLoading ? <IonSpinner name="crescent" /> : 'Create Account'}
          </IonButton>

          {/* Login Link */}
          <div className="auth-switch">
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default Register;