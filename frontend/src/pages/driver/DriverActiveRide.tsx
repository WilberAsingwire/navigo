import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonText, useIonToast, IonCard, IonCardContent, IonAvatar
} from '@ionic/react';
import { flagOutline, locationOutline, checkmarkCircleOutline, callOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import './DriverActiveRide.css';

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 15); }, [center, map]);
  return null;
};

const DriverActiveRide: React.FC = () => {
  const history = useHistory();
  const [presentToast] = useIonToast();
  const [rideStatus, setRideStatus] = useState<'heading' | 'arrived' | 'completed'>('heading');
  const [rideData, setRideData] = useState<any>(null);
  const [pos, setPos] = useState<[number, number]>([0.3476, 32.5825]);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const { data } = await api.get('/rides/active');
        setRideData(data);
      } catch (e) {
        history.replace('/driver/home');
      }
    };
    fetchRide();

    navigator.geolocation.watchPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  const updateStatus = async (status: 'arrived' | 'completed') => {
    try {
      await api.patch('/rides/active', { status });
      setRideStatus(status);
      if (status === 'completed') {
        presentToast({ message: 'Ride completed! Payment processed. 💰', color: 'success', duration: 3000 });
        history.push('/driver/home');
      }
    } catch (e) {
      presentToast({ message: 'Error updating status', color: 'danger', duration: 2000 });
    }
  };

  if (!rideData) return <div className="ion-padding">Loading ride...</div>;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="active-ride-toolbar">
          <IonTitle className="sora-font">Trip in Progress</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false}>
        <div className="map-container" style={{ height: '100%' }}>
          <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <MapController center={pos} />
            <Marker position={pos} icon={new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [30, 30] })} />
            <Marker position={rideData.destinationPos || [0.3550, 32.5850]} icon={new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/647/647643.png', iconSize: [30, 30] })} />
          </MapContainer>
        </div>

        <div className="ride-control-card">
          <div className="Rider-info">
            <IonAvatar><img src={`https://i.pravatar.cc/100?u=${rideData.RiderId}`} alt="rider" /></IonAvatar>
            <div className="details">
              <h3>{rideData.RiderName}</h3>
              <p>{rideData.rideType} • {rideData.fare} UGX</p>
            </div>
            <div className="contact-btns">
              <IonButton fill="clear" onClick={() => window.open(`tel:${rideData.RiderPhone}`)}><IonIcon icon={callOutline} /></IonButton>
              <IonButton fill="clear" onClick={() => window.open(`https://wa.me/${rideData.RiderPhone}`, '_blank')}><IonIcon icon={chatbubbleEllipsesOutline} /></IonButton>
            </div>
          </div>

          <div className="status-section">
            <div className="route-summary">
              <div className="route-point"><IonIcon icon={locationOutline} /> <span>Pickup: {rideData.pickup}</span></div>
              <div className="route-point"><IonIcon icon={flagOutline} /> <span>Dest: {rideData.destination}</span></div>
            </div>

            {rideStatus === 'heading' && (
              <IonButton expand="block" className="main-btn" onClick={() => updateStatus('arrived')}>
                I Have Arrived 📍
              </IonButton>
            )}
            {rideStatus === 'arrived' && (
              <IonButton expand="block" className="main-btn" color="success" onClick={() => updateStatus('completed')}>
                Complete Trip ✅
              </IonButton>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverActiveRide;
