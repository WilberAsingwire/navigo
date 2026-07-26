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
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import SOSButton from '../../components/SOSButton';
import ChatBox from '../../components/ChatBox';
import 'leaflet/dist/leaflet.css';
import './DriverActiveRide.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const driverCarIcon = L.divIcon({ html: '<div style="background:#FF6B35;width:28px;height:28px;border-radius:50%;border:3px solid white;font-size:14px;text-align:center;line-height:28px;box-shadow:0 0 14px rgba(255,107,53,0.8)">🚗</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
const riderPinIcon = L.divIcon({ html: '<div style="background:#00e676;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,230,118,0.6)"></div>', iconSize: [26, 26], iconAnchor: [13, 13] });

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 15); }, [center, map]);
  return null;
};

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
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ color: '#fff' }}>
            {rideStatus === 'heading' ? 'Heading to Pickup' : rideStatus === 'arrived' ? 'Trip in Progress' : 'Completed'}
          </IonTitle>
          <IonBadge slot="end" color={rideStatus === 'heading' ? 'warning' : rideStatus === 'arrived' ? 'primary' : 'success'} style={{ marginRight: 10 }}>
            {rideStatus === 'heading' ? 'En Route' : rideStatus === 'arrived' ? 'Active' : 'Done'}
          </IonBadge>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        {/* Map */}
        <div style={{ height: '40vh', width: '100%', position: 'relative' }}>
          <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />
            <MapController center={pos} />
            <Marker position={pos} icon={driverCarIcon}><Popup>🚗 Your Location</Popup></Marker>
            <Marker position={rideData.destinationPos} icon={riderPinIcon}><Popup>📍 {rideData.riderName}</Popup></Marker>
            <Polyline positions={[pos, rideData.destinationPos]} color="#FF6B35" weight={3} opacity={0.6} dashArray="8, 6" />
          </MapContainer>
          
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
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <IonAvatar style={{ width: 48, height: 48 }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(rideData.riderName)}&background=FF6B35&color=fff&size=64`} alt={rideData.riderName} />
            </IonAvatar>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>{rideData.riderName}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>
                <IonIcon icon={starOutline} style={{ color: '#FFC107', fontSize: 12 }} /> {rideData.riderRating} • {rideData.rideType}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <IonButton fill="clear" size="small" onClick={() => window.open(`tel:${rideData.riderPhone}`, '_system')}>
                <IonIcon icon={callOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
              </IonButton>
              <IonButton fill="clear" size="small" onClick={() => setShowChat(true)}>
                <IonIcon icon={chatbubbleEllipsesOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
              </IonButton>
            </div>
          </div>

          {/* Route Details */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IonIcon icon={locationOutline} style={{ color: '#2D6A4F', fontSize: 16 }} />
              <span style={{ color: '#fff', fontSize: 13 }}>Pickup: {rideData.pickup}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IonIcon icon={flagOutline} style={{ color: '#E85D75', fontSize: 16 }} />
              <span style={{ color: '#fff', fontSize: 13 }}>Destination: {rideData.destination}</span>
            </div>
          </div>

          {/* Trip Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={mapOutline} style={{ color: '#4da6ff', fontSize: 18 }} />
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '4px 0' }}>{rideData.distance}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Distance</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={timeOutline} style={{ color: '#FFC107', fontSize: 18 }} />
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '4px 0' }}>{rideData.estimatedTime}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>ETA</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
              <IonIcon icon={cashOutline} style={{ color: '#00e676', fontSize: 18 }} />
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '4px 0' }}>{rideData.fare}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Fare</span>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div style={{ background: 'linear-gradient(135deg, rgba(45,106,79,0.1), rgba(45,106,79,0.03))', borderRadius: 14, padding: 12, marginBottom: 12, border: '1px solid rgba(45,106,79,0.15)' }}>
            <h4 style={{ color: '#2D6A4F', margin: '0 0 8px', fontSize: 13 }}>💰 Your Earnings</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              <span>Total Fare</span><span>UGX {earnings.fare.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <span>Commission (10%)</span><span>-UGX {earnings.commission.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#00e676', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
              <span>You Earn</span><span>UGX {earnings.net.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {rideStatus === 'heading' && (
            <IonButton expand="block" className="main-btn" onClick={() => updateStatus('arrived')} style={{ '--background': '#FF6B35', '--border-radius': 14, height: 48, fontWeight: 700 } as any}>
              <IonIcon icon={checkmarkCircleOutline} slot="start" /> I Have Arrived 📍
            </IonButton>
          )}
          {rideStatus === 'arrived' && (
            <IonButton expand="block" color="success" onClick={() => updateStatus('completed')} style={{ '--border-radius': 14, height: 48, fontWeight: 700 } as any}>
              <IonIcon icon={checkmarkCircleOutline} slot="start" /> Complete Trip ✅
            </IonButton>
          )}

          {/* SOS Button */}
          <SOSButton userLocation={{ lat: pos[0], lng: pos[1] }} userName="Driver" variant="compact" />

          {rideStatus === 'completed' && (
            <div style={{ textAlign: 'center', padding: 20, color: '#2D6A4F' }}>
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 48 }} />
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