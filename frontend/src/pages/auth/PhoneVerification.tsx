import React, { useState } from 'react';
import {
  IonContent, IonPage, IonItem, IonInput, IonButton,
  IonText, useIonLoading, useIonToast
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';

const PhoneVerification: React.FC = () => {
  const history = useHistory();
  const [otp, setOtp] = useState('');
  const [presentLoading, dismissLoading] = useIonLoading();
  const [presentToast] = useIonToast();

  const handleVerify = async () => {
    const email = localStorage.getItem('temp_email');
    if (!email) {
      return presentToast({ message: 'No registration session found. Please register again.', color: 'danger', duration: 3000 });
    }

    await presentLoading({ message: 'Verifying Identity...' });

    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });

      await dismissLoading();

      localStorage.removeItem('temp_otp');
      localStorage.removeItem('temp_email');

      presentToast({ message: 'Account Verified! 🛡️', color: 'success', duration: 2000 });

      // User role decides the home page
      const role = data.user?.role || 'rider';
      if (role === 'admin') history.push('/admin/dashboard');
      else if (role === 'driver' || role === 'motorist') history.push('/driver/home');
      else history.push('/rider/home');

    } catch (error: any) {
      await dismissLoading();
      const message = error.response?.data?.message || 'Invalid verification code';
      presentToast({ message, color: 'danger', duration: 3000 });
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding auth-bg">
        <div className="auth-container">
          <div className="header-section">
            <h1 className="sora-font brand-text">Verify Account</h1>
            <p className="tagline">Check your email for the 6-digit code 📧</p>
          </div>

          <div className="input-group ion-margin-top">
            <IonItem className="custom-input">
              <IonInput
                type="number"
                placeholder="0 0 0 0 0 0"
                value={otp}
                onIonChange={e => setOtp(e.detail.value!)}
              />
            </IonItem>
          </div>

          <IonButton expand="block" className="main-btn ion-margin-top" onClick={handleVerify}>Verify Account</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PhoneVerification;
