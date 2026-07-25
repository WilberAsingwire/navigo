import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonButton, IonIcon, IonProgressBar, useIonToast, IonText } from '@ionic/react';
import { locationOutline, flagOutline } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './IncomingRequest.css';

const IncomingRequest: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [presentToast] = useIonToast();
  const [timeLeft, setTimeLeft] = useState(15);
  const requestData = location.state?.request || {
    pickup: "Unknown Location",
    destination: "Unknown Destination",
    fare: 0
  };

  useEffect(() => {
    const timer = timeLeft > 0 && setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    if (timeLeft === 0) history.replace('/driver/home');
    return () => clearInterval(timer as any);
  }, [timeLeft]);

  const handleAccept = async () => {
    try {
      // Notify backend that ride is accepted
      await api.post('/rides/accept', {
        rideId: requestData.id,
        driverId: localStorage.getItem('userId')
      });
      history.push('/driver/active-ride');
    } catch (e: any) {
      presentToast({ message: 'Ride already taken or server error', color: 'danger', duration: 3000 });
      history.replace('/driver/home');
    }
  };

  return (
    <IonPage>
      <IonContent className="request-bg" scrollY={false}>
        <div className="request-container">
          <div className="timer-section">
            <div className="timer-circle"><h1 className="sora-font">{timeLeft}</h1></div>
            <h2 className="sora-font">New Request!</h2>
            <IonProgressBar value={timeLeft / 15} color="success" />
          </div>

          <div className="route-card">
             <div className="route-item">
                <IonIcon icon={locationOutline} color="primary" />
                <div className="route-text"><label>PICKUP</label><p>{requestData.pickup}</p></div>
             </div>
             <div className="route-item">
                <IonIcon icon={flagOutline} color="success" />
                <div className="route-text"><label>DROP-OFF</label><p>{requestData.destination}</p></div>
             </div>
             <div className="fare-row ion-text-center ion-padding">
                <IonText color="medium">Estimated Fare: <strong style={{color: '#00e676'}}>{requestData.fare} UGX</strong></IonText>
             </div>
          </div>

          <div className="action-grid">
            <IonButton expand="block" fill="clear" color="light" onClick={() => history.replace('/driver/home')}>Decline</IonButton>
            <IonButton expand="block" className="accept-btn" onClick={handleAccept}>ACCEPT RIDE</IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default IncomingRequest;
