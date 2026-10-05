import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonButton, IonIcon, IonProgressBar,
  useIonToast, IonText, IonBadge, IonAvatar, IonCard, IonCardContent, IonSpinner
} from '@ionic/react';
import {
  locationOutline, flagOutline, starOutline, timeOutline,
  cashOutline, closeOutline, checkmarkCircleOutline,
  personOutline, mapOutline
} from 'ionicons/icons';
import InitialsAvatar from '../../components/InitialsAvatar';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socketService';
import api from '../../services/api';
import './IncomingRequest.css';

const VEHICLE_LABELS: Record<string, string> = {
  boda: 'Boda Boda', go: 'NAVIGO Go', economy: 'NAVIGO Go', comfort: 'NAVIGO Comfort', xl: 'NAVIGO XL',
};

const IncomingRequest: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [presentToast] = useIonToast();
  const [timeLeft, setTimeLeft] = useState(20);
  const [isAccepting, setIsAccepting] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      history.replace('/login');
      return;
    }

    const socket = socketService.connect(user.id);

    socket.on('ride-requested', async (data: any) => {
      console.log('New ride request received', data);
      // Start (or restart) the decision timer only when a request actually arrives
      setTimeLeft(20);
      try {
        const res = await api.get(`/rides/details/${data.rideId}`);
        setRequestData({
          ...res.data,
          riderName: res.data.rider?.fullName || 'Customer',
          riderRating: res.data.rider?.rating || 5.0,
          riderTrips: res.data.rider?.totalTrips || 0,
        });
      } catch {
        setRequestData({
          id: data.rideId,
          pickup: { address: 'Pickup location unavailable', lat: 0, lng: 0 },
          destination: { address: 'Destination unavailable', lat: 0, lng: 0 },
          fareRecommended: null,
          fareFinal: null,
          riderName: 'Customer',
          riderRating: 5.0,
          riderTrips: 0,
        });
      }
    });

    return () => socket.off('ride-requested');
  }, [user]);

  useEffect(() => {
    // Only count down while a request is on screen
    if (!requestData) return;
    if (timeLeft <= 0) {
      setRequestData(null);
      history.replace('/driver/home');
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, requestData, history]);

  const handleAccept = async () => {
    const socket = socketService.getSocket();
    const rideId = requestData?.id;
    if (!socket || !rideId) {
      presentToast({ message: 'Connection lost. Please try again.', color: 'danger', duration: 3000 });
      return;
    }

    setIsAccepting(true);

    // Wait for the server to CONFIRM the acceptance — another driver may win
    // the race, in which case we get an 'error' event instead.
    let settled = false;
    const cleanup = () => {
      socket.off('accept-confirmed', onConfirmed);
      socket.off('error', onError);
      clearTimeout(timer);
    };

    const onConfirmed = (d: { rideId: string }) => {
      if (settled || d.rideId !== rideId) return;
      settled = true;
      cleanup();
      presentToast({ message: 'Ride accepted — navigate to pickup', color: 'success', duration: 2000 });
      history.push('/driver/active-ride');
    };

    const onError = (e: { message?: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      setIsAccepting(false);
      presentToast({ message: e?.message || 'Ride no longer available', color: 'danger', duration: 3000 });
      setRequestData(null);
      history.replace('/driver/home');
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      setIsAccepting(false);
      presentToast({ message: 'No response from server. Please try again.', color: 'warning', duration: 3000 });
    }, 10000);

    socket.on('accept-confirmed', onConfirmed);
    socket.on('error', onError);
    socket.emit('accept-ride', { driverId: user?.id, rideId });
  };

  const handleDecline = () => {
    presentToast({ message: 'Ride declined', color: 'medium', duration: 1500 });
    history.replace('/driver/home');
  };

  if (!requestData) {
    return (
      <IonPage>
        <IonContent className="request-bg incoming-wrapper" style={{'--background': 'var(--nav-bg)',  display: 'flex', justifyContent: 'center', alignItems: 'center' } as any}>
          <div style={{ textAlign: 'center', color: 'var(--nav-text)' }}>
            <IonSpinner name="crescent" />
            <p>Waiting for ride requests...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const progressPercent = (timeLeft / 20) * 100;

  return (
    <IonPage>
      <IonContent className="request-bg incoming-wrapper" scrollY={false} style={{'--background': 'var(--nav-bg)'} as any}>
        <div className="request-container">
          <div className="timer-section">
            <div className={`timer-circle pulse`}>
              <h1 className="sora-font" style={{ color: timeLeft <= 5 ? 'var(--nav-danger)' : 'var(--navigo-orange)' }}>{timeLeft}</h1>
              <span style={{ fontSize: 10, color: 'var(--nav-text-secondary)' }}>sec</span>
            </div>
            <h2 className="sora-font" style={{ color: 'var(--nav-text)', margin: '8px 0' }}>New ride request</h2>
            <IonProgressBar value={progressPercent / 100} color={timeLeft <= 5 ? 'danger' : 'success'} style={{ height: 6, borderRadius: 3, maxWidth: 200, margin: '0 auto' }} />
            <p style={{ color: 'var(--nav-text-dim)', fontSize: 11, margin: '6px 0 0' }}>
              {timeLeft <= 5 ? 'Request expires soon' : 'Accept before time runs out'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nav-card-soft)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <IonAvatar style={{ width: 44, height: 44 }}>
              <InitialsAvatar name={requestData.riderName} size={44} />
            </IonAvatar>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 15 }}>
                {requestData.riderName}
                {requestData.serviceType === 'delivery' && (
                  <IonBadge color="light" style={{ marginLeft: 8, fontSize: 9, verticalAlign: 'middle' }}>DELIVERY</IonBadge>
                )}
              </h3>
              <p style={{ color: 'var(--nav-text-secondary)', fontSize: 11, margin: 2 }}>
                <IonIcon icon={starOutline} style={{ color: '#FFC107', fontSize: 12 }} /> {Number(requestData.riderRating || 5).toFixed(1)}
                {VEHICLE_LABELS[requestData.vehicleType] ? ` • ${VEHICLE_LABELS[requestData.vehicleType]}` : requestData.rideType ? ` • ${requestData.rideType}` : ''}
              </p>
            </div>
            {Number(requestData.riderTrips) > 0 && <IonBadge color="warning" style={{ fontSize: 10 }}>{requestData.riderTrips} trips</IonBadge>}
          </div>

          {requestData.serviceType === 'delivery' && (
            <div style={{ background: 'rgba(77,166,255,0.08)', border: '1px solid rgba(77,166,255,0.25)', borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 12 }}>
              <p style={{ color: 'var(--nav-text)', margin: 0, fontWeight: 600 }}>Package: {requestData.packageDetails || '—'}</p>
              <p style={{ color: 'var(--nav-text-secondary)', margin: '4px 0 0' }}>
                Hand to: {requestData.receiverName || '—'} {requestData.receiverPhone ? `• ${requestData.receiverPhone}` : ''}
              </p>
            </div>
          )}

          <div className="route-card">
            <div className="route-item">
              <IonIcon icon={locationOutline} style={{ color: '#2D6A4F', fontSize: 20 }} />
              <div className="route-text">
                <label>PICKUP</label>
                <p>{requestData.pickup?.address || requestData.pickup}</p>
              </div>
            </div>
            <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.1)', marginLeft: 9 }} />
            <div className="route-item">
              <IonIcon icon={flagOutline} style={{ color: '#E85D75', fontSize: 20 }} />
              <div className="route-text">
                <label>DESTINATION</label>
                <p>{requestData.destination?.address || requestData.destination}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'var(--nav-card-soft)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={mapOutline} style={{ color: '#4da6ff', fontSize: 16, marginBottom: 4 }} />
              <p style={{ color: 'var(--nav-text)', fontSize: 12, fontWeight: 600, margin: 2 }}>
                {requestData.distanceKm ? `${requestData.distanceKm} km` : (requestData.distance || '—')}
              </p>
              <span style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Distance</span>
            </div>
            <div style={{ background: 'var(--nav-card-soft)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={timeOutline} style={{ color: '#FFC107', fontSize: 16, marginBottom: 4 }} />
              <p style={{ color: 'var(--nav-text)', fontSize: 12, fontWeight: 600, margin: 2 }}>
                {requestData.durationMin ? `${requestData.durationMin} min` : (requestData.estimatedTime || '—')}
              </p>
              <span style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>ETA</span>
            </div>
            <div style={{ background: 'var(--nav-card-soft)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={cashOutline} style={{ color: '#00e676', fontSize: 16, marginBottom: 4 }} />
              <p style={{ color: 'var(--nav-text)', fontSize: 12, fontWeight: 600, margin: 2 }}>UGX {(requestData.fareFinal || requestData.fareRecommended || requestData.fare || 0).toLocaleString()}</p>
              <span style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Fare</span>
            </div>
          </div>

          <div className="action-grid">
            <IonButton expand="block" fill="outline" color="light" onClick={handleDecline} disabled={isAccepting}
              style={{ '--border-radius': 12, height: 50, fontSize: 15, fontWeight: 600 } as any}>
              <IonIcon icon={closeOutline} slot="start" /> Decline
            </IonButton>
            <IonButton expand="block" className="accept-btn" onClick={handleAccept} disabled={isAccepting}
              style={{ '--border-radius': 12, height: 50, fontSize: 15, fontWeight: 700 } as any}>
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
