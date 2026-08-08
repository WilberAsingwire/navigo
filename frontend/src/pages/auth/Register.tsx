import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonSegment, IonSegmentButton,
  IonText, IonNote, IonCheckbox, IonProgressBar, IonCard, IonCardContent
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, personOutline,
  mailOutline, eyeOutline, eyeOffOutline,
  arrowBackOutline, carOutline, bicycleOutline, personOutline as RiderIcon,
  checkmarkCircleOutline, starOutline, cashOutline,
  shieldCheckmarkOutline, informationCircleOutline, globeOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';
import './Register.css';

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
  const [countryCode] = useState('+256');

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
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

  const getRoleInfo = (r: string) => {
    switch (r) {
      case 'customer': return { text: '📱 Book rides, earn Zawadi points, and get exclusive discounts!', color: '#FF6B35' };
      case 'driver': return { text: '🚗 Earn UGX 50K-150K daily driving your car. Keep 85% of every fare!', color: '#4da6ff' };
      case 'motorist': return { text: '🏍️ Boda Safe™ certified! Free helmet, safety training & instant payouts!', color: '#ffab40' };
      default: return null;
    }
  };

  const roleInfo = getRoleInfo(role);

  const handleRegister = async () => {
    setError('');
    if (!role) return setError('Please select your role');
    if (!name.trim()) return setError('Please enter your full name');
    if (name.trim().length < 2) return setError('Name must be at least 2 characters');
    
    const cleanPhone = formatPhone(phone);
    if (!cleanPhone) return setError('Please enter your phone number');
    if (cleanPhone.length < 10) return setError('Please enter a valid 10-digit phone number');
    
    if (!password) return setError('Please enter a password');
    if (password.length < 4) return setError('Password must be at least 4 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!acceptTerms) return setError('Please accept the Terms of Service');

    setIsLoading(true);
    try {
      await register(name.trim(), cleanPhone, password, email.trim() || undefined, role);
      const redirectPath = (role === 'driver' || role === 'motorist') ? '/driver/home' : '/rider/home';
      history.push(redirectPath);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
  <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
    ...
  </IonToolbar>
</IonHeader>
      <IonContent className="auth-content">
        <div className="auth-container">
          
          {/* Logo */}
          <div className="auth-logo">
            <h1 className="logo-main">🚀 NAVIGO</h1>
            <p className="logo-tagline">Join Uganda's Smartest Ride-Hailing App</p>
          </div>

          {/* Role Selector */}
          <IonSegment value={role} onIonChange={(e) => setRole(e.detail.value as string)} className="role-segment">
            <IonSegmentButton value="customer" className="role-btn">
              <IonIcon icon={RiderIcon} />
              <IonLabel>Rider</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="driver" className="role-btn">
              <IonIcon icon={carOutline} />
              <IonLabel>Driver</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="motorist" className="role-btn">
              <IonIcon icon={bicycleOutline} />
              <IonLabel>Boda</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* Role Info Card */}
          {roleInfo && (
            <div className="role-info-card" style={{ borderColor: roleInfo.color }}>
              <IonIcon icon={informationCircleOutline} style={{ color: roleInfo.color }} />
              <p>{roleInfo.text}</p>
            </div>
          )}

         {role === 'driver' && (
  <div className="verification-notice">
    <IonIcon icon={shieldCheckmarkOutline} />
    <p>You'll need to upload your driver's license and vehicle documents for verification after signing up.</p>
  </div>
)}

{role === 'motorist' && (
  <div className="verification-notice" style={{ borderColor: '#ffab40', background: 'rgba(255,171,64,0.06)' }}>
    <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#ffab40' }} />
    <p>Boda Safe™ certified! You'll need your driving permit and motorcycle documents for verification.</p>
  </div>
)}

          {/* Registration Card */}
          <IonCard className="register-card">
            <IonCardContent>

              {/* Name */}
              <IonItem className="auth-input">
                <IonIcon icon={personOutline} slot="start" />
                <IonLabel position="stacked">Full Name *</IonLabel>
                <IonInput type="text" value={name} onIonInput={(e) => setName(e.detail.value!)} placeholder="Enter your full name" />
              </IonItem>

              {/* Phone with Country Code */}
              <div className="phone-input-group">
                <div className="country-code">
                  <IonIcon icon={globeOutline} />
                  <span>{countryCode}</span>
                </div>
                <IonItem className="auth-input phone-field" lines="none">
                  <IonInput type="tel" inputmode="numeric" value={phone} onIonInput={(e) => setPhone(formatPhone(e.detail.value!))} placeholder="700 000 000" maxlength={10} />
                </IonItem>
              </div>
              <IonNote className="input-helper">Uganda format: 07XX XXXXXX</IonNote>

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
                <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                  <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                </IonButton>
              </IonItem>

              {/* Password Strength */}
              {password.length > 0 && (
                <div className="password-strength">
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

              {/* Error */}
              {error && <div className="auth-error">{error}</div>}

              {/* Register Button */}
              <IonButton expand="block" className="auth-button register-btn" onClick={handleRegister} disabled={isLoading}>
                {isLoading ? <IonSpinner name="crescent" /> : 'Create Account'}
              </IonButton>

              {/* Terms Checkbox — moved below button */}
              <div className="terms-wrap">
                <IonCheckbox checked={acceptTerms} onIonChange={(e) => setAcceptTerms(e.detail.checked)} className="custom-checkbox" />
                <span>I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link></span>
              </div>

            </IonCardContent>
          </IonCard>

          {/* Login Link */}
          <div className="auth-switch">
            <p>Already have an account? <Link to="/login" className="create-account-link">Sign In</Link></p>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default Register;