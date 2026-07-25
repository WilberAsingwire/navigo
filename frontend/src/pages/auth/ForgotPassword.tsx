import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonButton, IonIcon,
  IonSpinner, IonToast, IonText
} from '@ionic/react';
import {
  phonePortraitOutline, lockClosedOutline, arrowBackOutline,
  checkmarkCircleOutline, keyOutline
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const handleRequestCode = async () => {
    setError('');
    if (!phone.trim()) return setError('Please enter your phone number');

    setIsLoading(true);
    try {
      const returnedCode = await forgotPassword(phone.trim());
      setDevCode(returnedCode);
      setStep('code');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!code.trim()) return setError('Please enter the reset code');
    if (!newPassword) return setError('Please enter a new password');
    if (newPassword.length < 4) return setError('Password must be at least 4 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');

    setIsLoading(true);
    try {
      await resetPassword(phone.trim(), code.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed');
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
          <IonTitle>Reset Password</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="auth-content">
        <div className="auth-container">
          <div className="auth-logo">
            <h1>🔑 Forgot Password?</h1>
            <p>We'll send a reset code to your phone</p>
          </div>

          {step === 'phone' && (
            <>
              <IonItem className="auth-input">
                <IonIcon icon={phonePortraitOutline} slot="start" />
                <IonLabel position="stacked">Phone Number</IonLabel>
                <IonInput
                  type="tel"
                  value={phone}
                  onIonInput={(e) => setPhone(e.detail.value!)}
                  placeholder="0772000000"
                />
              </IonItem>

              {error && <div className="auth-error">{error}</div>}

              <IonButton
                expand="block"
                className="auth-button"
                onClick={handleRequestCode}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner /> : 'Send Reset Code'}
              </IonButton>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="code-sent-message">
                <IonIcon icon={checkmarkCircleOutline} />
                <p>Code sent to {phone}</p>
              </div>

              {/* Dev: Show code */}
              {devCode && (
                <div className="dev-code-box">
                  <p>🔧 DEV MODE: Your code is <strong>{devCode}</strong></p>
                </div>
              )}

              <IonItem className="auth-input">
                <IonIcon icon={keyOutline} slot="start" />
                <IonLabel position="stacked">6-Digit Reset Code</IonLabel>
                <IonInput
                  type="text"
                  value={code}
                  onIonInput={(e) => setCode(e.detail.value!)}
                  placeholder="000000"
                  maxlength={6}
                />
              </IonItem>

              <IonItem className="auth-input">
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonLabel position="stacked">New Password</IonLabel>
                <IonInput
                  type="password"
                  value={newPassword}
                  onIonInput={(e) => setNewPassword(e.detail.value!)}
                  placeholder="Min 4 characters"
                />
              </IonItem>

              <IonItem className="auth-input">
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonLabel position="stacked">Confirm New Password</IonLabel>
                <IonInput
                  type="password"
                  value={confirmPassword}
                  onIonInput={(e) => setConfirmPassword(e.detail.value!)}
                  placeholder="Re-enter password"
                />
              </IonItem>

              {error && <div className="auth-error">{error}</div>}

              <IonButton
                expand="block"
                className="auth-button"
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner /> : 'Reset Password'}
              </IonButton>
            </>
          )}

          {step === 'success' && (
            <div className="success-message">
              <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
              <h2>Password Reset!</h2>
              <p>Your password has been updated successfully.</p>
              <IonButton
                expand="block"
                className="auth-button"
                onClick={() => history.push('/login')}
              >
                Back to Login
              </IonButton>
            </div>
          )}

          <div className="auth-switch">
            <p><Link to="/login">Back to Login</Link></p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;