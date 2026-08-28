import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonText, IonCard, IonCardContent, IonAvatar,
  IonBadge, IonModal, IonToast, IonSpinner
} from '@ionic/react';
import {
  flagOutline, locationOutline, checkmarkCircleOutline, callOutline,
  chatbubbleEllipsesOutline, navigateOutline, closeOutline,
  cashOutline, timeOutline, starOutline, shieldCheckmarkOutline,
  mapOutline, arrowForwardOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import NavigoMap from '../../components/NavigoMap';
import SOSButton from '../../components/SOSButton';
import ChatBox from '../../components/ChatBox';
import './DriverActiveRide.css';

const DriverActiveRide: React.FC = () => {
  const history = useHistory();
  const [rideStatus, setRideStatus] = useState<'heading' | 'arrived' | 'completed'>('heading');
  const [pos, setPos] = useState<[number, number]>([0.3476, 32.5825]);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({ fare: 8500, commission: 850, net: 7650 });

  // Mock ride data
  const rideData = {
    riderName: 'Alice Nakamya',
    riderPhone: '+256772123456',
    pickup: 'Kampala Road, City Center',
    destination: 'Acacia Mall, Kololo',
    rideType: 'NAVIGO Go',
    fare: 'UGX 8,500',
    destinationPos: [0.3550, 32.5850] as [number, number],
    estimatedTime: '8 min',
    distance: '3.2 km',
    riderRating: 4.8,
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (p) => setPos([p.coords.latitude, p.coords.longitude]),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const updateStatus = (status: 'arrived' | 'completed') => {
    setRideStatus(status);
    if (status === 'completed') {
      setTimeout(() => history.push('/driver/home'), 2000);
    }
  };

  const openNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${pos[0]},${pos[1]}&destination=${rideData.destinationPos[0]},${rideData.destinationPos[1]}`, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent style={{'--background': '#080c14'} as any}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
            <IonSpinner name="crescent" color="warning" />
            <p style={{ color: '#fff' }}>Loading trip details...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonTitle style={{color: '#fff'}}>
            {rideStatus === 'heading' ? 'Heading to Pickup' : rideStatus === 'arrived' ? 'Trip in Progress' : 'Completed'}
          </IonTitle>
          <IonBadge slot="end" color={rideStatus === 'heading' ? 'warning' : rideStatus === 'arrived' ? 'primary' : 'success'} style={{ marginRight: 10 }}>
            {rideStatus === 'heading' ? 'En Route' : rideStatus === 'arrived' ? 'Active' : 'Done'}
          </IonBadge>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-active-container">
        {/* Map */}
        <div style={{ height: '40vh', width: '100%', position: 'relative' }}>
          <NavigoMap
            userLocation={{ lat: pos[0], lng: pos[1] }}
            destination={{ lat: rideData.destinationPos[0], lng: rideData.destinationPos[1] }}
            height="100%"
            showRoute={true}
            driverType="go"
          />
          {/* Floating Navigate Button */}
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000 }}>
            <IonButton color="light" size="small" onClick={openNavigation}>
              <IonIcon icon={navigateOutline} slot="start" /> Navigate
            </IonButton>
          </div>
        </div>

        {/* Trip Info */}
        <div style={{ padding: 14 }}>
          {/* Rider Card */}
          <div className="rider-info-card">
            <IonAvatar style={{ width: 48, height: 48 }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(rideData.riderName)}&background=FF6B35&color=fff&size=64`} alt={rideData.riderName} />
            </IonAvatar>
            <div className="rider-details">
              <h3>{rideData.riderName}</h3>
              <p><IonIcon icon={starOutline} style={{ color: '#FFC107', fontSize: 12 }} /> {rideData.riderRating} • {rideData.rideType}</p>
            </div>
            <div className="rider-actions">
              <IonButton fill="clear" size="small" onClick={() => window.open(`tel:${rideData.riderPhone}`, '_system')}>
                <IonIcon icon={callOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
              </IonButton>
              <IonButton fill="clear" size="small" onClick={() => setShowChat(true)}>
                <IonIcon icon={chatbubbleEllipsesOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
              </IonButton>
            </div>
          </div>

          {/* Route Details */}
          <div className="route-info-card">
            <div className="route-point">
              <IonIcon icon={locationOutline} style={{ color: '#2D6A4F', fontSize: 16 }} />
              <span>Pickup: {rideData.pickup}</span>
            </div>
            <div className="route-point">
              <IonIcon icon={flagOutline} style={{ color: '#E85D75', fontSize: 16 }} />
              <span>Destination: {rideData.destination}</span>
            </div>
          </div>

          {/* Trip Stats */}
          <div className="trip-stats-grid">
            <div className="trip-stat-card">
              <IonIcon icon={mapOutline} className="trip-stat-icon" style={{ color: '#4da6ff' }} />
              <p className="trip-stat-value">{rideData.distance}</p>
              <span className="trip-stat-label">Distance</span>
            </div>
            <div className="trip-stat-card">
              <IonIcon icon={timeOutline} className="trip-stat-icon" style={{ color: '#FFC107' }} />
              <p className="trip-stat-value">{rideData.estimatedTime}</p>
              <span className="trip-stat-label">ETA</span>
            </div>
            <div className="trip-stat-card">
              <IonIcon icon={cashOutline} className="trip-stat-icon" style={{ color: '#00e676' }} />
              <p className="trip-stat-value">{rideData.fare}</p>
              <span className="trip-stat-label">Fare</span>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div className="earnings-card">
            <h4 className="earnings-title">
              <IonIcon icon={cashOutline} /> Your Earnings
            </h4>
            <div className="earnings-row">
              <span>Total Fare</span><span>UGX {earnings.fare.toLocaleString()}</span>
            </div>
            <div className="earnings-row">
              <span>Commission (10%)</span><span>-UGX {earnings.commission.toLocaleString()}</span>
            </div>
            <div className="earnings-total">
              <span>You Earn</span><span>UGX {earnings.net.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {rideStatus === 'heading' && (
            <IonButton expand="block" className="main-action-btn" onClick={() => updateStatus('arrived')}>
              <IonIcon icon={checkmarkCircleOutline} slot="start" /> I Have Arrived 📍
            </IonButton>
          )}
          {rideStatus === 'arrived' && (
            <IonButton expand="block" className="complete-action-btn" onClick={() => updateStatus('completed')}>
              <IonIcon icon={checkmarkCircleOutline} slot="start" /> Complete Trip ✅
            </IonButton>
          )}

          {/* SOS Button */}
          <SOSButton userLocation={{ lat: pos[0], lng: pos[1] }} userName="Driver" variant="compact" />

          {rideStatus === 'completed' && (
            <div className="completion-state">
              <IonIcon icon={checkmarkCircleOutline} />
              <h3>Trip Completed!</h3>
              <p>You earned UGX {earnings.net.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Chat Modal */}
        <IonModal isOpen={showChat} onDidDismiss={() => setShowChat(false)}>
          <ChatBox
            rideId="ride_001"
            currentUser={{ id: 'driver_001', name: 'You', role: 'driver' }}
            otherUser={{ id: 'rider_001', name: rideData.riderName, role: 'rider' }}
            onClose={() => setShowChat(false)}
          />
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default DriverActiveRide;
