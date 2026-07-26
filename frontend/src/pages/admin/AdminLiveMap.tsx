import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonBadge, IonSpinner } from '@ionic/react';
import { refreshOutline, bicycleOutline, carOutline, personOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const carIcon = L.divIcon({ html: '<div style="background:#4da6ff;width:20px;height:20px;border-radius:50%;border:3px solid white;font-size:12px;text-align:center;line-height:20px">🚗</div>', iconSize: [26, 26] });
const bikeIcon = L.divIcon({ html: '<div style="background:#ffab40;width:20px;height:20px;border-radius:50%;border:3px solid white;font-size:12px;text-align:center;line-height:20px">🏍️</div>', iconSize: [26, 26] });
const riderIcon = L.divIcon({ html: '<div style="background:#00e676;width:16px;height:16px;border-radius:50%;border:3px solid white"></div>', iconSize: [20, 20] });

const AdminLiveMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([0.3476, 32.5825]);

  const loadData = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
    setUsers([
      { id: '1', name: 'Driver 1', role: 'driver', lat: userLocation[0] + 0.01, lng: userLocation[1] + 0.01 },
      { id: '2', name: 'Motorist 1', role: 'motorist', lat: userLocation[0] - 0.01, lng: userLocation[1] - 0.01 },
      { id: '3', name: 'Rider 1', role: 'rider', lat: userLocation[0] + 0.005, lng: userLocation[1] - 0.005 },
    ]);
    setTimeout(() => setLoading(false), 800);
  };

  useEffect(() => { loadData(); }, []);

  const getIcon = (role: string) => {
    if (role === 'driver') return carIcon;
    if (role === 'motorist') return bikeIcon;
    return riderIcon;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Live Map</IonTitle>
          <IonButton slot="end" fill="clear" onClick={loadData}>
            <IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': '#080c14' } as any}>
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 1000, transform: 'translate(-50%,-50%)' }}>
            <IonSpinner name="crescent" color="warning" />
          </div>
        )}
        <div style={{ height: '50vh', width: '100%', minHeight: '300px' }}>
          <MapContainer center={userLocation} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={userLocation} icon={riderIcon}>
              <Popup>You are here</Popup>
            </Marker>
            {users.map(u => (
              <Marker key={u.id} position={[u.lat, u.lng]} icon={getIcon(u.role)}>
                <Popup>{u.name} ({u.role})</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div style={{ padding: 16 }}>
          <h3 style={{ color: '#fff', marginBottom: 10 }}>Active Users ({users.length})</h3>
          {users.map(u => (
            <div key={u.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <IonIcon icon={u.role === 'driver' ? carOutline : u.role === 'motorist' ? bicycleOutline : personOutline} style={{ color: u.role === 'driver' ? '#4da6ff' : u.role === 'motorist' ? '#ffab40' : '#00e676', fontSize: 20 }} />
              <span style={{ color: '#fff', flex: 1 }}>{u.name}</span>
              <IonBadge color="success">Now</IonBadge>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLiveMap;