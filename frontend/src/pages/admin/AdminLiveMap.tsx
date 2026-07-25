import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonBadge, IonToast, IonSpinner } from '@ionic/react';
import { locateOutline, refreshOutline, bicycleOutline, carOutline, personOutline } from 'ionicons/icons';
import './AdminLiveMap.css';

interface User {
  id: string;
  name: string;
  role: string;
  lat: number;
  lng: number;
  lastSeen: string;
}

const AdminLiveMap: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    getRealLocation();
    loadDemoUsers();
  }, []);

  const getRealLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setError('GPS not available. Showing demo data.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const loadDemoUsers = () => {
    setUsers([
      { id: '1', name: 'Driver 1', role: 'driver', lat: (userLocation?.lat || 0.3136) + 0.01, lng: (userLocation?.lng || 32.5811) + 0.01, lastSeen: 'Now' },
      { id: '2', name: 'Motorist 1', role: 'motorist', lat: (userLocation?.lat || 0.3136) - 0.01, lng: (userLocation?.lng || 32.5811) - 0.01, lastSeen: '2 min ago' },
      { id: '3', name: 'Rider 1', role: 'rider', lat: (userLocation?.lat || 0.3136) + 0.005, lng: (userLocation?.lng || 32.5811) - 0.005, lastSeen: '5 min ago' },
    ]);
    setLoading(false);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'driver') return carOutline;
    if (role === 'motorist') return bicycleOutline;
    return personOutline;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Live Map</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => { getRealLocation(); loadDemoUsers(); }}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': '#080c14', '--color': '#fff8f0' } as any}>
        {error && <div style={{ padding: 8, background: 'rgba(232,93,117,0.2)', color: '#E85D75', textAlign: 'center', fontSize: 12 }}>{error}</div>}
        
        <div style={{ padding: 16 }}>
          {userLocation ? (
            <div style={{ background: 'linear-gradient(135deg, #1B4965, #0d2137)', borderRadius: 16, padding: 16, textAlign: 'center', marginBottom: 16 }}>
              <IonIcon icon={locateOutline} style={{ fontSize: 40, color: '#FF6B35' }} />
              <h3 style={{ color: '#fff' }}>Your Location</h3>
              <p style={{ color: 'rgba(255,248,240,0.7)', fontSize: 14 }}>
                Lat: {userLocation.lat.toFixed(4)} | Lng: {userLocation.lng.toFixed(4)}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <IonSpinner />
              <p style={{ color: 'rgba(255,248,240,0.5)' }}>Getting your location...</p>
            </div>
          )}

          <h3 style={{ color: '#fff', marginBottom: 12 }}>Active Users ({users.length})</h3>
          
          {users.map(user => (
            <div key={user.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <IonIcon icon={getRoleIcon(user.role)} style={{ fontSize: 24, color: user.role === 'driver' ? '#4da6ff' : user.role === 'motorist' ? '#ffab40' : '#00e676' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#fff' }}>{user.name}</strong>
                <p style={{ color: 'rgba(255,248,240,0.5)', fontSize: 12, margin: 2 }}>Lat: {user.lat.toFixed(4)} Lng: {user.lng.toFixed(4)}</p>
              </div>
              <IonBadge color="success">{user.lastSeen}</IonBadge>
            </div>
          ))}
        </div>

        <IonToast isOpen={!!error} onDidDismiss={() => setError('')} message={error} duration={3000} position="top" color="danger" />
      </IonContent>
    </IonPage>
  );
};

export default AdminLiveMap;