import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonButton, IonIcon, IonProgressBar,
  useIonToast, IonText, IonBadge, IonAvatar, IonCard, IonCardContent
} from '@ionic/react';
import {
  locationOutline, flagOutline, starOutline, timeOutline,
  cashOutline, closeOutline, checkmarkCircleOutline,
  personOutline, mapOutline
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import './IncomingRequest.css';

const IncomingRequest: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [presentToast] = useIonToast();
  const [timeLeft, setTimeLeft] = useState(20);
  const [isAccepting, setIsAccepting] = useState(false);
  const [pulseAnim, setPulseAnim] = useState(true);

  const requestData = (location.state as any)?.request || {
    id: 'ride_001',
    pickup: 'Kampala Road, City Center',
    destination: 'Acacia Mall, Kololo',
    fare: 8500,
    distance: '3.2 km',
    estimatedTime: '12 min',
    riderName: 'Alice Nakamya',
    riderRating: 4.8,
    riderTrips: 45,
    rideType: 'NAVIGO Go',
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      history.replace('/driver/home');
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      presentToast({ message: '✅ Ride accepted! Navigate to pickup.', color: 'success', duration: 2000 });
      setTimeout(() => history.push('/driver/active-ride'), 800);
    } catch (e: any) {
      presentToast({ message: 'Ride no longer available', color: 'danger', duration: 3000 });
      history.replace('/driver/home');
    }
  };

  const handleDecline = () => {
    presentToast({ message: 'Ride declined', color: 'medium', duration: 1500 });
    history.replace('/driver/home');
  };

  const progressPercent = (timeLeft / 20) * 100;

  return (
    <IonPage>
      <IonContent className="request-bg" scrollY={false}>
        <div className="request-container">
          
          {/* Timer Section */}
          <div className="timer-section">
            <div className={`timer-circle ${pulseAnim ? 'pulse' : ''}`}>
              <h1 className="sora-font" style={{ color: timeLeft <= 5 ? '#ff5252' : '#FF6B35' }}>{timeLeft}</h1>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>sec</span>
            </div>
            <h2 className="sora-font" style={{ color: '#fff', margin: '8px 0' }}>🔔 New Ride Request!</h2>
            <IonProgressBar value={progressPercent / 100} color={timeLeft <= 5 ? 'danger' : 'success'} style={{ height: 6, borderRadius: 3, maxWidth: 200, margin: '0 auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '6px 0 0' }}>
              {timeLeft <= 5 ? '⏰ Hurry! Request expires soon' : 'Accept before time runs out'}
            </p>
          </div>

          {/* Rider Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <IonAvatar style={{ width: 44, height: 44 }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(requestData.riderName)}&background=FF6B35&color=fff&size=64`} alt={requestData.riderName} />
            </IonAvatar>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>{requestData.riderName}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>
                <IonIcon icon={starOutline} style={{ color: '#FFC107', fontSize: 12 }} /> {requestData.riderRating} • {requestData.rideType}
              </p>
            </div>
            <IonBadge color="warning" style={{ fontSize: 10 }}>{requestData.riderTrips} trips</IonBadge>
          </div>

          {/* Route Card */}
          <div className="route-card">
            <div className="route-item">
              <IonIcon icon={locationOutline} style={{ color: '#2D6A4F', fontSize: 20 }} />
              <div className="route-text">
                <label>PICKUP</label>
                <p>{requestData.pickup}</p>
              </div>
            </div>
            <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.1)', marginLeft: 9 }} />
            <div className="route-item">
              <IonIcon icon={flagOutline} style={{ color: '#E85D75', fontSize: 20 }} />
              <div className="route-text">
                <label>DESTINATION</label>
                <p>{requestData.destination}</p>
              </div>
            </div>
          </div>

          {/* Trip Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={mapOutline} style={{ color: '#4da6ff', fontSize: 16, marginBottom: 4 }} />
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 2 }}>{requestData.distance}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Distance</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={timeOutline} style={{ color: '#FFC107', fontSize: 16, marginBottom: 4 }} />
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 2 }}>{requestData.estimatedTime}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>ETA</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={cashOutline} style={{ color: '#00e676', fontSize: 16, marginBottom: 4 }} />
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 2 }}>UGX {requestData.fare.toLocaleString()}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Fare</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-grid">
            <IonButton expand="block" fill="outline" color="light" onClick={handleDecline} disabled={isAccepting}
              style={{ '--border-radius': 14, height: 50, fontSize: 15, fontWeight: 600 } as any}>
              <IonIcon icon={closeOutline} slot="start" /> Decline
            </IonButton>
            <IonButton expand="block" className="accept-btn" onClick={handleAccept} disabled={isAccepting}
              style={{ '--border-radius': 14, height: 50, fontSize: 15, fontWeight: 700 } as any}>
              {isAccepting ? 'Accepting...' : 'Accept Ride'}
              <IonIcon icon={checkmarkCircleOutline} slot="end" />
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default IncomingRequest;