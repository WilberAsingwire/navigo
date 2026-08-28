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
  checkmarkCircleOutline, informationCircleOutline, globeOutline,
  flashOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './AuthStyles.css';

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
      case 'rider': return { text: '📱 Book rides, earn Zawadi points, and get exclusive discounts!' };
      case 'driver': return { text: '🚗 Earn UGX 50K-150K daily driving your car. Keep 90% of every fare!' };
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
      <IonContent style={{ '--background': '#0a0a0a' }}>
        <div className="auth-container">
          <div className="glow-top"></div>
          <div className="glow-bottom"></div>

          <div className="auth-card">
            <div className="auth-header">
              <span className="auth-eyebrow">Join Navigo</span>
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-copy">
                Start your journey with Uganda's smartest ride-hailing app.
              </p>
            </div>

            <div className="method-toggle" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button
                type="button"
                className={`method-btn ${role === 'rider' ? 'active' : ''}`}
                onClick={() => setRole('rider')}
              >
                <IonIcon icon={RiderIcon} style={{ marginRight: '8px' }} /> Rider
              </button>
              <button
                type="button"
                className={`method-btn ${role === 'driver' ? 'active' : ''}`}
                onClick={() => setRole('driver')}
              >
                <IonIcon icon={carOutline} style={{ marginRight: '8px' }} /> Driver
              </button>
            </div>

            {roleInfo && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px',
                fontSize: '13px', color: 'var(--navigo-zinc-400)', marginBottom: '24px'
              }}>
                <IonIcon icon={informationCircleOutline} style={{ color: 'var(--navigo-ember)' }} />
                <span>{roleInfo.text}</span>
              </div>
            )}

            <div className="reg-form" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  className="input-field"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--navigo-zinc-400)',
                    fontSize: '14px', zIndex: 1, pointerEvents: 'none'
                  }}>
                    <IonIcon icon={globeOutline} />
                    <span>{countryCode}</span>
                  </div>
                  <input
                    className="input-field"
                    style={{ paddingLeft: '85px' }}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="700 000 000"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Email (Optional)</label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For receipts & notifications"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
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
                {password.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ height: '4px', flex: 1, background: 'var(--navigo-white-10)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${passwordStrength.percent * 100}%`, background: passwordStrength.color, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: passwordStrength.color, fontWeight: 600 }}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              <div className="input-group">
                <label className="input-label">Confirm Password *</label>
                <input
                  className="input-field"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>

              {error && (
                <div className="error-message">
                  <IonIcon icon={checkmarkCircleOutline} /> {error}
                </div>
              )}

              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--navigo-zinc-400)',
                fontSize: '13px', cursor: 'pointer', marginBottom: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ accentColor: 'var(--navigo-ember)' }}
                />
                <span>
                  I agree to the <Link to="/terms" style={{ color: 'var(--navigo-ember)', textDecoration: 'none' }}>Terms</Link> and <Link to="/privacy" style={{ color: 'var(--navigo-ember)', textDecoration: 'none' }}>Privacy Policy</Link>
                </span>
              </label>

              <button
                className="btn-primary"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" color="dark" /> : 'Create Account'}
              </button>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--navigo-zinc-400)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--navigo-ember', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
            </div>

            <div className="trust-row">
              <div className="trust-item">
                <div className="trust-icon"><IonIcon icon={checkmarkCircleOutline} /></div>
                <span className="trust-label">Verified captains</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon"><IonIcon icon={flashOutline} /></div>
                <span className="trust-label">4-min pickups</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon"><IonIcon icon={checkmarkCircleOutline} /></div>
                <span className="trust-label">Fares from UGX 1,500</span>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
