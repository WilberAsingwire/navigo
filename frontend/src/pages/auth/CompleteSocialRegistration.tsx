import React, { useState } from 'react';
import { IonPage, IonContent, IonSpinner, IonToast, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { checkmarkCircleOutline, globeOutline } from 'ionicons/icons';
import './Auth.css';
import './CompleteSocialRegistration.css';
import { API_URL } from '../../config';

const CompleteSocialRegistration: React.FC = () => {
  const history = useHistory();
  // saveSession used to be missing from AuthContextType's exposed value,
  // so this was silently calling `undefined(...)` below (masked by the
  // `as any` cast) and crashing the entire "finish social sign-up" flow
  // for every new Google user with no phone on file yet.
  const { saveSession } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const socialData = JSON.parse(localStorage.getItem('temp_social_user') || '{}');

  const handleCompleteRegistration = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      return setError('Please enter a valid phone number');
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/google-register`, {
        ...socialData,
        phone: phone
      });

      // CLEAR any existing session first to prevent "Role Leaking" from old admin accounts
      localStorage.removeItem('navigo_token');
      localStorage.removeItem('navigo_user');

      // Now save the new, fresh customer session
      saveSession(response.data.user, response.data.token);
      localStorage.removeItem('temp_social_user');

      // users.role is only ever 'rider' | 'driver' | 'admin' — 'motorist'
      // has never been a real value.
      const role = response.data.user.role;
      const redirectPath = role === 'driver' ? '/driver/home' :
                           (role === 'admin') ? '/admin/dashboard' : '/customer/home';

      history.push(redirectPath);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-content">
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
                onChange={e => setPhone(e.target.value)}
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