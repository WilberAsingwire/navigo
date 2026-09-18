import React, { useState } from 'react';
import { IonPage, IonContent, IonSpinner, IonToast, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { checkmarkCircleOutline, globeOutline } from 'ionicons/icons';
import './Auth.css';
import './CompleteSocialRegistration.css';

const CompleteSocialRegistration: React.FC = () => {
  const history = useHistory();
  const { saveSession } = useAuth() as any;
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const raw = localStorage.getItem('temp_social_user') || '{}';
  const socialData = (() => { try { return JSON.parse(raw); } catch { return {}; } })();

  // Guard against direct navigation without a pending social payload
  if (!socialData.name && !socialData.socialId) {
    // Defer the redirect until after mount
    setTimeout(() => history.replace('/login'), 0);
  }

  const normalizePhone = (v: string) => v.replace(/\D/g, '');

  const handleCompleteRegistration = async () => {
    setError('');
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 9) {
      return setError('Please enter a valid Ugandan phone number');
    }
    // Prefix with leading 0 if missing (user typed 7... instead of 07...)
    const finalPhone = cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`;

    setIsLoading(true);
    try {
      // Backend expects `fullName`, not `name` — map it explicitly to avoid silent nulls.
      const response = await api.post('/auth/google-register', {
        fullName: socialData.name,
        email: socialData.email,
        socialId: socialData.socialId,
        provider: socialData.provider || 'google',
        phone: finalPhone,
      });

      localStorage.removeItem('navigo_token');
      localStorage.removeItem('navigo_user');
      saveSession(response.data.user, response.data.token);
      localStorage.removeItem('temp_social_user');

      const role = response.data.user?.role || 'customer';
      const redirectPath =
        role === 'admin' ? '/admin/dashboard'
        : (role === 'driver' || role === 'motorist') ? '/driver/home'
        : '/customer/home';
      history.replace(redirectPath);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-content auth-container" style={{'--background': 'var(--nav-bg)'} as any}>
        <div className="social-reg-page-container">
          <div className="social-reg-card">

            <div className="icon-badge">
              <IonIcon icon={checkmarkCircleOutline} />
            </div>

            <span className="step-badge">Final Step</span>
            <h1 className="social-reg-title">Almost there, {socialData.name || 'User'}!</h1>
            <p className="social-reg-subtitle">
              We just need your phone number to secure your account and notify you about your rides.
            </p>

            <div className="phone-input-wrapper">
              <div className="country-badge">
                <IonIcon icon={globeOutline} />
                <span>+256</span>
              </div>
              <input
                className="phone-field"
                type="tel"
                value={phone}
                onChange={e => setPhone(normalizePhone(e.target.value))}
                placeholder="700 000 000"
                maxLength={10}
                onKeyDown={(e) => e.key === 'Enter' && handleCompleteRegistration()}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="btn-primary"
              onClick={handleCompleteRegistration}
              disabled={isLoading}
            >
              {isLoading ? <IonSpinner name="crescent" /> : 'Finish Registration'}
            </button>
          </div>

          <IonToast
            isOpen={!!error}
            onDidDismiss={() => setError('')}
            message={error}
            duration={4000}
            color="danger"
            position="top"
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CompleteSocialRegistration;