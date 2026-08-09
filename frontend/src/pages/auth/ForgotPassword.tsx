import React, { useState, useEffect } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonSpinner, IonToast, IonIcon
} from '@ionic/react';
import {
  lockClosedOutline, checkmarkCircleOutline, keyOutline, refreshOutline,
  eyeOutline, eyeOffOutline, globeOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';
import './ForgotPassword.css';

const ForgotPassword: React.FC = () => {
  const history = useHistory();
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleRequestCode = async () => {
    setError('');
    if (!phone || phone.length < 10) return setError('Please enter a valid phone number');
    setIsLoading(true);
    try {
      const returnedCode = await forgotPassword(phone);
      setDevCode(returnedCode);
      setStep('code');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!code || code.length !== 6) return setError('Reset code must be 6 digits');
    if (!newPassword || newPassword.length < 4) return setError('Password must be at least 4 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setIsLoading(true);
    try {
      await resetPassword(phone, code, newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-content">
        <div className="forgot-page-container">
          <div className="forgot-card">

            <div className="icon-badge">
              <IonIcon icon={keyOutline} />
            </div>
            <h1 className="forgot-title">Forgot Password?</h1>
            <p className="forgot-subtitle">
              {step === 'phone'
                ? "We'll send a 6-digit reset code to your phone"
                : step === 'code'
                  ? `We've sent a code to ${phone}`
                  : "Your account is secured"}
            </p>

            {step === 'phone' && (
              <>
                <div className="phone-input-wrapper">
                  <div className="country-badge">
                    <IonIcon icon={globeOutline} />
                    <span>+256</span>
                  </div>
                  <input
                    className="phone-field"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="700 000 000"
                    maxlength={10}
                    onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="btn-primary" onClick={handleRequestCode} disabled={isLoading}>
                  {isLoading ? <IonSpinner name="crescent" /> : 'Send Reset Code'}
                </button>
              </>
            )}

            {step === 'code' && (
              <>
                <div className="dev-code-box">
                  <p>🔧 DEV CODE: <strong>{devCode}</strong></p>
                </div>

                <div className="reset-field-group">
                  <label className="reset-label">6-Digit Reset Code</label>
                  <input
                    className="reset-input"
                    type="text"
                    inputmode="numeric"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="000000"
                    maxlength={6}
                  />
                </div>

                <div className="reset-field-group">
                  <label className="reset-label">New Password</label>
                  <div className="input-wrapper password-wrapper">
                    <input
                      className="reset-input"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
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

                <div className="reset-field-group">
                  <label className="reset-label">Confirm New Password</label>
                  <input
                    className="reset-input"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="btn-primary" onClick={handleResetPassword} disabled={isLoading}>
                  {isLoading ? <IonSpinner name="crescent" /> : 'Reset Password'}
                </button>

                <button
                  className="btn-secondary"
                  style={{ background: 'none', border: 'none', color: '#FF5A1F', cursor: 'pointer', marginTop: 12, fontSize: '13px' }}
                  onClick={handleRequestCode}
                  disabled={!canResend || isLoading}
                >
                  <IonIcon icon={refreshOutline} style={{ marginRight: 4 }} />
                  {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                </button>
              </>
            )}

            {step === 'success' && (
              <div className="success-container">
                <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
                <h2 className="forgot-title">Password Reset!</h2>
                <p className="forgot-subtitle">Your password has been updated successfully.</p>
                <button className="btn-primary" onClick={() => history.push('/login')}>
                  Back to Login
                </button>
              </div>
            )}

            {step !== 'success' && (
              <div className="forgot-footer">
                <p>Remember password? <Link to="/login" className="forgot-link">Sign In</Link></p>
              </div>
            )}
          </div>

          <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword; !== confirmPassword) return setError('Passwords do not match');
    setIsLoading(true);
    try {
      await resetPassword(phone, code, newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
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
          
          <div className="auth-logo">
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h1 style={{ fontWeight: 700 }}>Forgot Password?</h1>
            <p style={{ color: '#D1D5DB', fontSize: 14 }}>We'll send a 6-digit reset code to your phone</p>
          </div>

          <IonCard className="register-card" style={{ marginBottom: 16 }}>
            <IonCardContent>

              {step === 'phone' && (
                <>
                  <div className="phone-input-group">
                    <div className="country-code">
                      <IonIcon icon={globeOutline} />
                      <span>+256</span>
                    </div>
                    <IonItem className="auth-input phone-field" lines="none">
                      <IonInput
                        type="tel"
                        inputmode="numeric"
                        value={phone}
                        onIonInput={(e) => setPhone(e.detail.value!)}
                        placeholder="700 000 000"
                        maxlength={10}
                        onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                      />
                    </IonItem>
                  </div>
                  <IonNote className="input-helper">Enter your registered phone number</IonNote>

                  {error && <div className="auth-error">{error}</div>}

                  <IonButton expand="block" className="auth-button register-btn" onClick={handleRequestCode} disabled={isLoading}>
                    {isLoading ? <IonSpinner name="crescent" /> : 'Send Reset Code'}
                  </IonButton>
                </>
              )}

              {step === 'code' && (
                <>
                  <div className="code-sent-message">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <p style={{ color: '#D1D5DB' }}>Code sent to <strong style={{ color: '#fff' }}>{phone}</strong></p>
                    <IonNote color="medium" style={{ display: 'block', marginTop: 4 }}>
                      {countdown > 0 ? `Resend in ${countdown}s` : "Didn't receive the code?"}
                    </IonNote>
                  </div>

                  {devCode && (
                    <div className="dev-code-box">
                      <p>🔧 DEV: <strong>{devCode}</strong></p>
                    </div>
                  )}

                  <IonItem className="auth-input">
                    <IonIcon icon={keyOutline} slot="start" />
                    <IonLabel position="stacked">6-Digit Reset Code</IonLabel>
                    <IonInput type="text" inputmode="numeric" value={code} onIonInput={e => setCode(e.detail.value!)} placeholder="000000" maxlength={6} />
                  </IonItem>

                  <IonItem className="auth-input">
                    <IonIcon icon={lockClosedOutline} slot="start" />
                    <IonLabel position="stacked">New Password</IonLabel>
                    <IonInput type={showPassword ? 'text' : 'password'} value={newPassword} onIonInput={e => setNewPassword(e.detail.value!)} placeholder="Minimum 4 characters" />
                    <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                      <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                    </IonButton>
                  </IonItem>

                  <IonItem className="auth-input">
                    <IonIcon icon={lockClosedOutline} slot="start" />
                    <IonLabel position="stacked">Confirm New Password</IonLabel>
                    <IonInput type="password" value={confirmPassword} onIonInput={e => setConfirmPassword(e.detail.value!)} placeholder="Re-enter password" />
                  </IonItem>

                  {error && <div className="auth-error">{error}</div>}

                  <IonButton expand="block" className="auth-button register-btn" onClick={handleResetPassword} disabled={isLoading}>
                    {isLoading ? <IonSpinner name="crescent" /> : 'Reset Password'}
                  </IonButton>

                  <IonButton expand="block" fill="clear" size="small" onClick={handleRequestCode} disabled={!canResend || isLoading} style={{ marginTop: 8, color: '#FF6B35' }}>
                    <IonIcon icon={refreshOutline} slot="start" />
                    {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                  </IonButton>
                </>
              )}

              {step === 'success' && (
                <div className="success-message">
                  <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
                  <h2 style={{ color: '#fff' }}>Password Reset!</h2>
                  <p style={{ color: '#D1D5DB' }}>Your password has been updated successfully.</p>
                  <IonButton expand="block" className="auth-button register-btn" onClick={() => history.push('/login')}>
                    Back to Login
                  </IonButton>
                </div>
              )}

            </IonCardContent>
          </IonCard>

          {step !== 'success' && (
            <div className="auth-switch" style={{ marginTop: 20 }}>
              <p style={{ color: '#D1D5DB' }}>Remember your password? <Link to="/login" style={{ color: '#FF6B35', fontWeight: 700 }}>Sign In</Link></p>
            </div>
          )}

          <div className="auth-switch" style={{ marginTop: step !== 'success' ? 8 : 16 }}>
            <p><Link to="/login" style={{ color: '#FF6B35' }}>← Back to Login</Link></p>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;