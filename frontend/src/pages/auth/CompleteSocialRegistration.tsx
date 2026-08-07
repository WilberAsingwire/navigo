import React, { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput, IonButton, IonSpinner, IonToast, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { checkmarkCircleOutline } from 'ionicons/icons';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CompleteSocialRegistration: React.FC = () => {
  const history = useHistory();
  const { saveSession } = useAuth() as any; // Cast to any to access internal saveSession if needed, or use socialLogin logic
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

      localStorage.setItem('navigo_token', response.data.token);
      localStorage.setItem('navigo_user', JSON.stringify(response.data.user));
      localStorage.removeItem('temp_social_user');

      history.push('/rider/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonTitle>Complete Your Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="auth-content">
        <div className="auth-container">
          <div className="auth-logo">
            <h1 className="logo-main">🚀 NAVIGO</h1>
            <p className="logo-tagline">One last step!</p>
          </div>

          <IonCard className="login-card">
            <IonCardContent>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 48, color: '#FF6B35' }} />
                <h3 style={{ color: '#fff', marginTop: 10 }}>Almost there, {socialData.name}!</h3>
                <p style={{ color: '#aaa', fontSize: 12 }}>We just need your phone number to secure your account and notify you about your rides.</p>
              </div>

              <IonItem className="auth-input" lines="none">
                <IonLabel position="stacked">Phone Number</IonLabel>
                <IonInput
                  type="tel"
                  value={phone}
                  onIonInput={e => setPhone(e.detail.value!)}
                  placeholder="07... (e.g. 0772000000)"
                  maxlength={10}
                />
              </IonItem>

              {error && <div className="auth-error" style={{ color: '#ff5252', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</div>}

              <IonButton expand="block" className="auth-button login-btn" onClick={handleCompleteRegistration} disabled={isLoading}>
                {isLoading ? <IonSpinner name="crescent" /> : 'Finish Registration'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CompleteSocialRegistration;
