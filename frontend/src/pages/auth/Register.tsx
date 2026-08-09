import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonIcon,
  IonSpinner, IonToast,
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, personOutline,
  mailOutline, eyeOutline, eyeOffOutline,
  carOutline, bicycleOutline, personOutline as RiderIcon,
  checkmarkCircleOutline, informationCircleOutline, globeOutline
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
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [countryCode] = useState('+256');

  const formatPhone = (value: string) => {
    return value.replace(/\D/g, '');
  };

  const getPasswordStrength = (pwd: string): { label: string; color: string; percent: number } => {
    if (!pwd) return { label: '', color: '#1E293B', percent: 0 };
    if (pwd.length < 6) return { label: 'Weak', color: '#EF4444', percent: 0.33 };
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Fair', color: '#F59E0B', percent: 0.66 };
    return { label: 'Strong', color: '#10B981', percent: 1 };
  };

  const passwordStrength = getPasswordStrength(password);

  const getRoleInfo = (r: string) => {
    switch (r) {
      case 'customer': return { text: '📱 Book rides, earn Zawadi points, and get exclusive discounts!' };
      case 'driver': return { text: '🚗 Earn UGX 50K-150K daily driving your car. Keep 85% of every fare!' };
      case 'motorist': return { text: '🏍️ Boda Safe™ certified! Free helmet, safety training & instant payouts!' };
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
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!acceptTerms) return setError('Please accept the Terms of Service');

    setIsLoading(true);
    try {
      await register(name.trim(), cleanPhone, password, email.trim() || undefined, role);
      history.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-content">
        <div className="reg-page-container">
          <div className="reg-card">
            <div className="reg-header">
              <h1 className="reg-logo">🚀 NAVIGO</h1>
              <p className="reg-tagline">Join Uganda's Smartest Ride-Hailing App</p>
            </div>

            {/* Role Selector */}
            <div className="role-selector">
              <button
                type="button"
                className={`role-option ${role === 'customer' ? 'active' : ''}`}
                onClick={() => setRole('customer')}
              >
                <IonIcon icon={RiderIcon} /> Rider
              </button>
              <button
                type="button"
                className={`role-option ${role === 'driver' ? 'active' : ''}`}
                onClick={() => setRole('driver')}
              >
                <IonIcon icon={carOutline} /> Driver
              </button>
              <button
                type="button"
                className={`role-option ${role === 'motorist' ? 'active' : ''}`}
                onClick={() => setRole('motorist')}
              >
                <IonIcon icon={bicycleOutline} /> Boda
              </button>
            </div>

            {/* Role Info Card */}
            {roleInfo && (
              <div className="role-info">
                <IonIcon icon={informationCircleOutline} />
                <span>{roleInfo.text}</span>
              </div>
            )}

            {/* Registration Form */}
            <div className="reg-form">
              {/* Name */}
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <div className="input-wrapper">
                  <input
                    className="input-field"
                    type="text"
                    value={name}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Phone with Country Code */}
              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="input-wrapper">
                  <div className="phone-prefix">
                    <IonIcon icon={globeOutline} />
                    <span>{countryCode}</span>
                  </div>
                  <input
                    className="input-field phone-input"
                    type="tel"
                    onInput={(e) => setPhone(formatPhone(e.currentTarget.value))}
                    placeholder="700 000 000"
                    maxlength={10}
                    value={phone}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="input-group">
                <label className="input-label">Email (Optional)</label>
                <div className="input-wrapper">
                  <input
                    className="input-field"
                    type="email"
                    value={email}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    placeholder="For receipts & notifications"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="input-group">
                <label className="input-label">Password *</label>
                <div className="input-wrapper password-wrapper">
                  <input
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="strength-container">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{ width: `${passwordStrength.percent * 100}%`, backgroundColor: passwordStrength.color }}
                      />
                    </div>
                    <span className="strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label} password
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="input-group">
                <label className="input-label">Confirm Password *</label>
                <div className="input-wrapper">
                  <input
                    className="input-field"
                    type="password"
                    value={confirmPassword}
                    onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>

              {error && <div className="error-msg">{error}</div>}

              {/* Terms Checkbox */}
              <label className="terms-group">
                <input
                  type="checkbox"
                  className="terms-checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span className="terms-text">
                  I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
                </span>
              </label>

              {/* Register Button */}
              <button
                className="btn-primary"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Create Account'}
              </button>
            </div>

            {/* Login Link */}
            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign In</Link></p>
            </div>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default Register;