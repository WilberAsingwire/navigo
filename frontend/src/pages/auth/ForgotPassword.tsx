import React, { useState } from 'react';
import {
  IonPage, IonContent, IonIcon, IonSpinner, IonToast
} from '@ionic/react';
import { arrowBackOutline, lockClosedOutline, refreshOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Auth.css';
import './AuthStyles.css';

const ForgotPassword: React.FC = () => {
  const ionRouter = useIonRouter();
  const { forgotPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);

  const isDev = import.meta.env.DEV;

  const handleRequestCode = async (isResend = false) => {
    setError('');
    if (!email || !email.includes('@')) {
      return setError('Please enter a valid email address');
    }
    if (isResend) setResending(true); else setIsLoading(true);
    try {
      // Use api instance (token-safe) rather than the AuthContext forgotPassword
      // so we can capture an optional devCode without double-calling.
      const res = await api.post('/auth/forgot-password', { email });
      // Backend only returns a devCode in non-production/development environments.
      if (res.data?.devCode) setDevCode(res.data.devCode);
      else setDevCode(null);
      setStep('code');
      if (isResend) {
        setResentAt(Date.now());
        setCode('');
        setToastMsg('A new code has been sent.');
        setShowToast(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset code. Try again.');
    } finally {
      setIsLoading(false);
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (code.length < 4) {
      return setError('Please enter the full reset code');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return setError('Password must contain at least one letter and one number');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    setIsLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      setToastMsg('Password reset! Signing you in...');
      setShowToast(true);
      setTimeout(() => ionRouter.push('/login', 'root', 'replace'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed. Check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-content auth-container">
        <div className="auth-page-container">
          <div className="auth-glass-card">
            <button className="back-btn" onClick={() => ionRouter.push('/login', 'back')}>
              <IonIcon icon={arrowBackOutline} /> Back
            </button>

            <div className="icon-badge">
              <IonIcon icon={lockClosedOutline} />
            </div>

            <span className="step-badge">{step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}</span>
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">
              {step === 'email'
                ? 'Enter your email and we\'ll send a reset code.'
                : 'Enter the code sent to your email and choose a new password.'}
            </p>

            {step === 'email' && (
              <>
                <div className="input-group">
                  <div className="input-label">Email</div>
                  <div className="input-wrapper">
                    <span className="input-icon">@</span>
                    <input
                      className="auth-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleRequestCode(false)}
                    />
                  </div>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button className="btn-primary" onClick={() => handleRequestCode(false)} disabled={isLoading}>
                  {isLoading ? <IonSpinner name="crescent" /> : 'Send Reset Code'}
                </button>
              </>
            )}

            {step === 'code' && (
              <>
                <div className="input-group">
                  <div className="input-label">Reset Code</div>
                  <div className="input-wrapper">
                    <span className="input-icon"><IonIcon icon={checkmarkCircleOutline} /></span>
                    <input
                      className="auth-input"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="input-group">
                  <div className="input-label">New Password</div>
                  <div className="input-wrapper">
                    <span className="input-icon"><IonIcon icon={lockClosedOutline} /></span>
                    <input
                      className="auth-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <div className="input-label">Confirm Password</div>
                  <div className="input-wrapper">
                    <span className="input-icon"><IonIcon icon={lockClosedOutline} /></span>
                    <input
                      className="auth-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                    />
                  </div>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button className="btn-primary" onClick={handleResetPassword} disabled={isLoading}>
                  {isLoading ? <IonSpinner name="crescent" /> : 'Reset Password'}
                </button>
                <button
                  className="resend-link"
                  onClick={() => handleRequestCode(true)}
                  disabled={resending}
                  style={{
                    marginTop: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#FF6B35',
                    fontWeight: 600,
                    cursor: resending ? 'wait' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {resending
                    ? 'Sending…'
                    : (<><IonIcon icon={refreshOutline} /> {resentAt ? 'Resend new code' : 'Didn\'t get the code? Resend'}</>)}
                </button>
              </>
            )}


            <IonToast
              isOpen={showToast}
              onDidDismiss={() => setShowToast(false)}
              message={toastMsg}
              duration={3000}
              position="top"
              color="dark"
            />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;
