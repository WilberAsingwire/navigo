import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonSpinner, IonToast, IonNote } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  refreshOutline, arrowBackOutline,
  shieldCheckmarkOutline, keyOutline, phonePortraitOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Auth.css';

/**
 * Real phone verification (C10): the backend generates a 6-digit OTP (stored
 * hashed, 10-minute expiry, 5-attempt cap) and delivers it by SMS when a
 * provider is configured, otherwise by email. Outside production the backend
 * returns the code as `devCode` for QA.
 */
const PhoneVerification: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ phone?: string }>();
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [devCode, setDevCode] = useState('');
  const sentOnce = useRef(false);

  const phone =
    location.state?.phone ||
    user?.phone ||
    localStorage.getItem('navigo_temp_phone') ||
    '';

  const startCountdown = () => {
    setCountdown(30);
    setCanResend(false);
  };

  const sendCode = async () => {
    if (!phone) return setError('No phone number found. Please log in again.');
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/send-verification', { phone });
      if (res.data?.alreadyVerified) {
        updateUser?.({ phoneVerified: true });
        setInfo('This number is already verified!');
        setTimeout(() => history.replace('/login'), 1200);
        return;
      }
      setInfo(res.data?.message || 'Verification code sent.');
      if (res.data?.devCode) {
        setDevCode(res.data.devCode);
        console.log('📱 DEV verification code:', res.data.devCode);
      }
      startCountdown();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send the code. Try again.');
      setCanResend(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!sentOnce.current) {
      sentOnce.current = true;
      sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canResend) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [canResend]);

  const handleVerify = async () => {
    setError('');
    if (!code.trim()) return setError('Please enter the verification code');
    if (!/^\d{6}$/.test(code.trim())) return setError('Code must be 6 digits');

    setIsLoading(true);
    try {
      await api.post('/auth/verify-phone', { phone, code: code.trim() });
      updateUser?.({ phoneVerified: true });
      try {
        const savedUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
        if (savedUser && savedUser.id) {
          savedUser.phoneVerified = true;
          localStorage.setItem('navigo_user', JSON.stringify(savedUser));
        }
      } catch { /* non-fatal */ }
      localStorage.removeItem('navigo_temp_phone');
      setInfo('Phone verified');

      const role = user?.role || JSON.parse(localStorage.getItem('navigo_user') || '{}')?.role;
      const token = localStorage.getItem('navigo_token');
      const redirectPath = !token ? '/login' :
        role === 'admin' ? '/admin/dashboard' :
        (role === 'driver' || role === 'motorist') ? '/driver/home' : '/customer/home';
      setTimeout(() => history.replace(redirectPath), 600);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedPhone = (p: string) => {
    if (!p || p.length < 7) return p || 'your phone';
    return p.slice(0, 3) + '****' + p.slice(-3);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={arrowBackOutline} style={{ color: '#fff' }} />
          </IonButton>
          <IonTitle style={{ color: '#fff' }}>Verify Phone</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="auth-content auth-container" style={{'--background': 'var(--nav-bg)'} as any}>
        <div className="auth-container">
          <div className="auth-logo">
            <IonIcon icon={phonePortraitOutline} style={{ fontSize: 44, color: 'var(--navigo-orange)', marginBottom: 12 }} />
            <h1>Verify Your Phone</h1>
            <p>We sent a 6-digit code to <strong>{maskedPhone(phone)}</strong></p>
          </div>

          {/* Dev-only code display (backend returns devCode outside production) */}
          {devCode && (
            <div className="dev-code-box">
              <p>DEV MODE: <strong>{devCode}</strong></p>
            </div>
          )}

          {/* Code Input */}
          <IonItem className="auth-input">
            <IonIcon icon={keyOutline} slot="start" />
            <IonLabel position="stacked">Verification Code</IonLabel>
            <IonInput
              type="text"
              inputmode="numeric"
              value={code}
              onIonInput={(e) => setCode(e.detail.value!)}
              placeholder="000000"
              maxlength={6}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              style={{ fontSize: 20, letterSpacing: 8, textAlign: 'center' }}
            />
            <IonNote slot="helper">Enter the 6-digit code sent to your phone</IonNote>
          </IonItem>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 6 }} />
              {error}
            </div>
          )}

          {/* Verify Button */}
          <IonButton expand="block" className="auth-button" onClick={handleVerify} disabled={isLoading}>
            {isLoading ? <IonSpinner name="crescent" /> : 'Verify & Continue'}
          </IonButton>

          {/* Resend */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {canResend ? (
              <IonButton expand="block" fill="clear" size="small" onClick={sendCode} disabled={isLoading}>
                <IonIcon icon={refreshOutline} slot="start" />
                Resend Code
              </IonButton>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                Resend code in <strong style={{ color: '#FF6B35' }}>{countdown}s</strong>
              </p>
            )}
          </div>

          {/* Help */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              Didn't receive the code? Check your SMS inbox{user?.email ? ' or email' : ''}, or contact support.
            </p>
          </div>
        </div>

        <IonToast isOpen={!!info} onDidDismiss={() => setInfo('')} message={info} duration={2500} color="success" position="top" />
        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default PhoneVerification;
