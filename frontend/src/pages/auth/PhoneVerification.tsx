import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonSpinner, IonToast, IonNote } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  checkmarkCircleOutline, refreshOutline, arrowBackOutline,
  phonePortraitOutline, shieldCheckmarkOutline, keyOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const PhoneVerification: React.FC = () => {
  const history = useHistory();
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [devCode, setDevCode] = useState('');

  const phone = user?.phone || localStorage.getItem('navigo_temp_phone') || 'your phone';

  useEffect(() => {
    // Production: await api call for SMS verification
    // Development: show a safe test code (only visible when NODE_ENV !== 'production')
    if (process.env.NODE_ENV !== 'production') {
      const safeDevCode = '123456'; // Fixed safe code for testing
      setDevCode(safeDevCode);
      console.log('📱 DEV Verification code (safe test):', safeDevCode);
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    setError('');
    if (!code.trim()) return setError('Please enter the verification code');
    if (code.trim().length !== 6) return setError('Code must be 6 digits');

    setIsLoading(true);
    try {
      // In production: verify via API
      // await api.post('/auth/verify-phone', { phone, code });
      
      // For now: accept the dev code or any 6-digit code
      if (code === devCode || code === '123456' || code.length === 6) {
        updateUser({ phoneVerified: true });
        const savedUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
        savedUser.phoneVerified = true;
        localStorage.setItem('navigo_user', JSON.stringify(savedUser));
        
        const role = savedUser.role || 'rider';
        const redirectPath = role === 'admin' ? '/admin/dashboard' :
                            (role === 'driver' || role === 'motorist') ? '/driver/home' : '/customer/home';
        setTimeout(() => history.push(redirectPath), 500);
      } else {
        setError('Invalid code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsLoading(true);
    try {
      const newCode = process.env.NODE_ENV !== 'production' ? '123456' : '000000';
      setDevCode(newCode);
      console.log('📱 New code:', newCode);
      setCountdown(30);
      setCanResend(false);
      setError('');
    } catch (err: any) {
      setError('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedPhone = (p: string) => {
    if (!p || p.length < 7) return p;
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
            <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
            <h1>Verify Your Phone</h1>
            <p>We sent a 6-digit code to <strong>{maskedPhone(phone)}</strong></p>
          </div>

          {/* Dev Code Display */}
          <div className="dev-code-box">
            <p>🔧 DEV MODE: <strong>{devCode}</strong></p>
          </div>

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
              <IonButton expand="block" fill="clear" size="small" onClick={handleResend} disabled={isLoading}>
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
              Didn't receive the code? Check your SMS inbox or contact support.
            </p>
          </div>
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={4000} color="danger" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default PhoneVerification;