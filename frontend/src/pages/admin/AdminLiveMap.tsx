import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonBadge } from '@ionic/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import './AdminLiveMap.css';

// Custom Markers
const carIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [35, 35] });
const bikeIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3418/3418139.png', iconSize: [35, 35] });

const AdminLiveMap: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const socket = io('http://localhost:5000');

  useEffect(() => {
    // 1. Fetch initial active drivers
    fetch('http://localhost:5000/api/admin/active-drivers')
      .then(res => res.json())
      .then(data => setDrivers(data));

    // 2. Listen for Live Updates
    socket.on('driver_location_update', (updatedDriver) => {
      setDrivers(prev => {
        const index = prev.findIndex(d => d.id === updatedDriver.id);
        if (index !== -1) {
          const newDrivers = [...prev];
          newDrivers[index] = updatedDriver;
          return newDrivers;
        }
        return [...prev, updatedDriver];
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle className="sora-font">Live Monitor</IonTitle>
          <IonBadge slot="end" color="success" className="ion-margin-end">{drivers.length} Online</IonBadge>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MapContainer center={[0.3476, 32.5825]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {drivers.map(d => (
            <Marker key={d.id} position={[d.lat, d.lng]} icon={d.type === 'car' ? carIcon : bikeIcon}>
              <Popup>
                <div style={{ color: 'black' }}>
                  <strong>{d.name}</strong> <br />
                  Status: {d.status} <br />
                  <small>Last seen: {new Date().toLocaleTimeString()}</small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </IonContent>
    </IonPage>
  );
};

export default AdminLiveMap;