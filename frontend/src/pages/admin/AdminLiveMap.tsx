import React, { useState, useEffect, useCallback } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonBadge, IonSpinner, IonChip, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import { refreshOutline, bicycleOutline, carOutline, personOutline, locateOutline, funnelOutline, pauseOutline, playOutline, statsChartOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const carIcon = L.divIcon({ html: '<div style="background:#4da6ff;width:22px;height:22px;border-radius:50%;border:3px solid white;font-size:12px;text-align:center;line-height:22px;box-shadow:0 0 10px rgba(77,166,255,0.6)">🚗</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
const bikeIcon = L.divIcon({ html: '<div style="background:#ffab40;width:22px;height:22px;border-radius:50%;border:3px solid white;font-size:12px;text-align:center;line-height:22px;box-shadow:0 0 10px rgba(255,171,64,0.6)">🏍️</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
const riderIcon = L.divIcon({ html: '<div style="background:#00e676;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(0,230,118,0.6)"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

const FlyToButton: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <a onClick={() => map.flyTo(center, 15, { duration: 1 })}
          style={{ cursor: 'pointer', padding: '6px 10px', display: 'block', background: '#FF6B35', color: '#fff', fontWeight: 'bold', fontSize: 11, border: 'none', textDecoration: 'none' }}>
          📍 My Location
        </a>
      </div>
    </div>
  );
};

const AdminLiveMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([0.3476, 32.5825]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'drivers' | 'motorists' | 'riders'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark'>('dark');
  const [stats, setStats] = useState({ drivers: 0, motorists: 0, riders: 0, activeTrips: 0 });

  const tileUrls: Record<string, string> = {
    standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  };

  const generateUsers = useCallback(() => {
    const newUsers = [];
    for (let i = 1; i <= 8; i++) {
      const roles = ['driver', 'motorist', 'rider'];
      const role = roles[i % 3];
      newUsers.push({
        id: `${i}`,
        name: `${role === 'driver' ? 'Driver' : role === 'motorist' ? 'Motorist' : 'Rider'} ${i}`,
        role,
        lat: userLocation[0] + (Math.random() - 0.5) * 0.04,
        lng: userLocation[1] + (Math.random() - 0.5) * 0.04,
        status: Math.random() > 0.2 ? 'active' : 'idle',
        tripTo: role !== 'rider' ? {
          lat: userLocation[0] + (Math.random() - 0.5) * 0.06,
          lng: userLocation[1] + (Math.random() - 0.5) * 0.06,
        } : undefined,
      });
    }
    setUsers(newUsers);
    setStats({
      drivers: newUsers.filter(u => u.role === 'driver').length,
      motorists: newUsers.filter(u => u.role === 'motorist').length,
      riders: newUsers.filter(u => u.role === 'rider').length,
      activeTrips: newUsers.filter(u => u.status === 'active' && u.role !== 'rider').length,
    });
  }, [userLocation]);

  const loadData = useCallback(() => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
    setTimeout(() => {
      generateUsers();
      setLoading(false);
    }, 600);
  }, [generateUsers]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(generateUsers, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, generateUsers]);

  useEffect(() => {
    if (activeFilter === 'all') setFilteredUsers(users);
    else setFilteredUsers(users.filter(u => 
      activeFilter === 'drivers' ? u.role === 'driver' : 
      activeFilter === 'motorists' ? u.role === 'motorist' : u.role === 'rider'
    ));
  }, [users, activeFilter]);

  const getIcon = (role: string) => {
    if (role === 'driver') return carIcon;
    if (role === 'motorist') return bikeIcon;
    return riderIcon;
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
          <div slot="end" style={{ display: 'flex', gap: 4 }}>
            <IonButton fill="clear" onClick={() => setAutoRefresh(!autoRefresh)}>
              <IonIcon icon={autoRefresh ? pauseOutline : playOutline} style={{ color: autoRefresh ? '#2D6A4F' : '#FF6B35' }} />
            </IonButton>
            <IonButton fill="clear" onClick={loadData}>
              <IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#080c14' } as any}>
        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto' }}>
          {[
            { label: 'Drivers', value: stats.drivers, color: '#4da6ff' },
            { label: 'Motorists', value: stats.motorists, color: '#ffab40' },
            { label: 'Riders', value: stats.riders, color: '#00e676' },
            { label: 'Active Trips', value: stats.activeTrips, color: '#FF6B35' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', flex: 1, minWidth: 70 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Map Style & Filter */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <IonChip outline={mapStyle !== 'dark'} color="medium" onClick={() => setMapStyle('dark')} style={{ fontSize: 10, cursor: 'pointer' }}>🌙 Dark</IonChip>
            <IonChip outline={mapStyle !== 'standard'} color="medium" onClick={() => setMapStyle('standard')} style={{ fontSize: 10, cursor: 'pointer' }}>🗺️ Light</IonChip>
          </div>
          <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{ maxWidth: 280 }}>
            <IonSegmentButton value="all"><IonLabel style={{ fontSize: 10 }}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="drivers"><IonLabel style={{ fontSize: 10 }}>Drivers</IonLabel></IonSegmentButton>
            <IonSegmentButton value="motorists"><IonLabel style={{ fontSize: 10 }}>Boda</IonLabel></IonSegmentButton>
            <IonSegmentButton value="riders"><IonLabel style={{ fontSize: 10 }}>Riders</IonLabel></IonSegmentButton>
          </IonSegment>
        </div>

        {/* Map */}
        {loading ? (
          <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IonSpinner name="crescent" color="warning" />
          </div>
        ) : (
          <div style={{ height: '45vh', width: '100%', minHeight: 280 }}>
            <MapContainer center={userLocation} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url={tileUrls[mapStyle]} />
              <FlyToButton center={userLocation} />
              <Marker position={userLocation} icon={riderIcon}><Popup>📍 Your Location</Popup></Marker>
              {filteredUsers.map(u => (
                <React.Fragment key={u.id}>
                  <Marker position={[u.lat, u.lng]} icon={getIcon(u.role)}>
                    <Popup>
                      <strong>{u.name}</strong><br/>
                      Role: {u.role}<br/>
                      Status: {u.status}
                    </Popup>
                  </Marker>
                  {u.tripTo && (
                    <Polyline positions={[[u.lat, u.lng], [u.tripTo.lat, u.tripTo.lng]]} 
                      color={u.role === 'driver' ? '#4da6ff' : '#ffab40'} weight={2} opacity={0.4} dashArray="6, 4" />
                  )}
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        )}

        {/* User List */}
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>Active Users ({filteredUsers.length})</h3>
            {autoRefresh && <span style={{ color: '#2D6A4F', fontSize: 10 }}>● Live</span>}
          </div>
          {filteredUsers.map(u => (
            <div key={u.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <IonIcon icon={getRoleIcon(u.role)} style={{ color: u.role === 'driver' ? '#4da6ff' : u.role === 'motorist' ? '#ffab40' : '#00e676', fontSize: 18 }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#fff', fontSize: 13 }}>{u.name}</span>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>
                  {u.lat.toFixed(4)}, {u.lng.toFixed(4)}
                </p>
              </div>
              <IonBadge color={u.status === 'active' ? 'success' : 'medium'} style={{ fontSize: 10 }}>
                {u.status === 'active' ? 'Active' : 'Idle'}
              </IonBadge>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLiveMap;