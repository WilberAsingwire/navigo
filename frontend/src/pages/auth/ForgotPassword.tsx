import React, { useState, useEffect } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonLabel, IonButton, IonIcon,
  IonSpinner, IonToast, IonText, IonNote
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, arrowBackOutline,
  checkmarkCircleOutline, keyOutline, refreshOutline,
  eyeOutline, eyeOffOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

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
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone) return setError('Please enter your phone number');
    if (cleanPhone.length < 10) return setError('Please enter a valid phone number');

    setIsLoading(true);
    try {
      const returnedCode = await forgotPassword(phone.trim());
      setDevCode(returnedCode);
      setStep('code');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!code.trim()) return setError('Please enter the reset code');
    if (code.trim().length !== 6) return setError('Reset code must be 6 digits');
    if (!newPassword) return setError('Please enter a new password');
    if (newPassword.length < 4) return setError('Password must be at least 4 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');

    setIsLoading(true);
    try {
      await resetPassword(phone.trim(), code.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedPhone = (p: string) => {
    if (p.length < 7) return p;
    return p.slice(0, 3) + '****' + p.slice(-3);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.push('/login')}>
            <IonIcon icon={arrowBackOutline} style={{ color: '#fff' }} />
          </IonButton>
          <IonTitle style={{ color: '#fff' }}>Reset Password</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="auth-content">
        <div className="auth-container">
          <div className="auth-logo">
            <h1>🔑 Forgot Password?</h1>
            <p>We'll send a 6-digit reset code to your phone</p>
          </div>

          {step === 'phone' && (
            <>
              <IonItem className="auth-input">
                <IonIcon icon={phonePortraitOutline} slot="start" />
                <IonLabel position="stacked">Registered Phone Number</IonLabel>
                <IonInput
                  type="tel"
                  value={phone}
                  onIonInput={(e) => setPhone(e.detail.value!)}
                  placeholder="0772000000"
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                />
                <IonNote slot="helper">Enter the phone number you registered with</IonNote>
              </IonItem>

              {error && <div className="auth-error">{error}</div>}

              <IonButton expand="block" className="auth-button" onClick={handleRequestCode} disabled={isLoading}>
                {isLoading ? <IonSpinner name="crescent" /> : 'Send Reset Code'}
              </IonButton>

              <div className="auth-switch">
                <p>Remember your password? <Link to="/login">Sign In</Link></p>
              </div>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="code-sent-message">
                <IonIcon icon={checkmarkCircleOutline} />
                <p>Code sent to <strong>{maskedPhone(phone)}</strong></p>
                <IonNote color="medium" style={{ display: 'block', marginTop: 4 }}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Didn\'t receive the code?'}
                </IonNote>
              </div>

              {devCode && (
                <div className="dev-code-box">
                  <p>🔧 DEV MODE: <strong>{devCode}</strong></p>
                </div>
              )}

              <IonItem className="auth-input">
                <IonIcon icon={keyOutline} slot="start" />
                <IonLabel position="stacked">6-Digit Reset Code</IonLabel>
                <IonInput
                  type="text"
                  inputmode="numeric"
                  value={code}
                  onIonInput={(e) => setCode(e.detail.value!)}
                  placeholder="000000"
                  maxlength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                />
              </IonItem>

              <IonItem className="auth-input">
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonLabel position="stacked">New Password</IonLabel>
                <IonInput
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onIonInput={(e) => setNewPassword(e.detail.value!)}
                  placeholder="Minimum 4 characters"
                />
                <IonButton slot="end" fill="clear" onClick={() => setShowPassword(!showPassword)}>
                  <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} style={{ color: '#888' }} />
                </IonButton>
              </IonItem>

              <IonItem className="auth-input">
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonLabel position="stacked">Confirm New Password</IonLabel>
                <IonInput
                  type="password"
                  value={confirmPassword}
                  onIonInput={(e) => setConfirmPassword(e.detail.value!)}
                  placeholder="Re-enter your new password"
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                />
              </IonItem>

              {error && <div className="auth-error">{error}</div>}

              <IonButton expand="block" className="auth-button" onClick={handleResetPassword} disabled={isLoading}>
                {isLoading ? <IonSpinner name="crescent" /> : 'Reset Password'}
              </IonButton>

              <IonButton expand="block" fill="clear" size="small" onClick={handleRequestCode} disabled={!canResend || isLoading} style={{ marginTop: 8 }}>
                <IonIcon icon={refreshOutline} slot="start" />
                {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
              </IonButton>
            </>
          )}

          {step === 'success' && (
            <div className="success-message">
              <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
              <h2>Password Reset!</h2>
              <p>Your password has been updated successfully. You can now sign in with your new password.</p>
              <IonButton expand="block" className="auth-button" onClick={() => history.push('/login')}>
                <IonIcon icon={arrowBackOutline} slot="start" /> Back to Login
              </IonButton>
            </div>
          )}

          {step !== 'success' && (
            <div className="auth-switch">
              <p><Link to="/login">← Back to Login</Link></p>
            </div>
          )}
        </div>

        <IonToast isOpen={!!error && step === 'phone'} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;