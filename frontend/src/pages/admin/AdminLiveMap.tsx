import React, { useState, useEffect, useCallback } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonBadge, IonSpinner, IonChip, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import { refreshOutline, bicycleOutline, carOutline, personOutline, pauseOutline, playOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import api from '../../services/api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
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
          📍
        </a>
      </div>
    </div>
  );
};

const DemandLayer: React.FC = () => {
  const map = useMap();
  const demandPoints = [
    { lat: 0.3136, lng: 32.5811, intensity: 0.9, label: 'City Center' },
    { lat: 0.3333, lng: 32.5922, intensity: 0.7, label: 'Kololo' },
    { lat: 0.3234, lng: 32.5888, intensity: 0.8, label: 'Nakasero' },
    { lat: 0.3000, lng: 32.5700, intensity: 0.5, label: 'Kiwatule' },
    { lat: 0.3400, lng: 32.5600, intensity: 0.6, label: 'Kazo' },
  ];

  useEffect(() => {
    const layers: L.Layer[] = [];
    demandPoints.forEach(p => {
      const circle = L.circle([p.lat, p.lng], {
        radius: 500 * p.intensity,
        color: p.intensity > 0.7 ? '#ef4444' : p.intensity > 0.5 ? '#f97316' : '#facc15',
        fillColor: p.intensity > 0.7 ? '#ef4444' : p.intensity > 0.5 ? '#f97316' : '#facc15',
        fillOpacity: 0.4,
        weight: 0
      }).addTo(map);
      layers.push(circle);
    });

    return () => {
      layers.forEach(l => map.removeLayer(l));
    };
  }, [map]);

  return null;
};

const AdminLiveMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([0.3476, 32.5825]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'drivers' | 'motorists' | 'riders' | 'heatmap'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapKey, setMapKey] = useState(0);
  const [mapStyle] = useState<'standard' | 'dark'>('dark');
  const [stats, setStats] = useState({ drivers: 0, motorists: 0, riders: 0, activeTrips: 0 });

  const tileUrls: Record<string, string> = {
    standard: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setMapKey(prev => prev + 1);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    try {
      const res = await api.get('/auth/admin/live-locations');
      const fetchedUsers = res.data.map((u: { currentLat: number; currentLng: number; isOnline: boolean; role: string; [k: string]: any }) => ({
        ...u,
        lat: u.currentLat,
        lng: u.currentLng,
        status: u.isOnline ? 'active' : 'idle'
      }));
      setUsers(fetchedUsers);
      setStats({
        drivers: fetchedUsers.filter((u: { role: string }) => u.role === 'driver').length,
        motorists: fetchedUsers.filter((u: { role: string }) => u.role === 'motorist').length,
        riders: fetchedUsers.filter((u: { role: string }) => u.role === 'rider').length,
        activeTrips: 0
      });
    } catch (e) {
      console.error('Failed to fetch live locations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('navigo_token')
      }
    });

    socket.on('connect_error', (err: any) => {
      console.error('❌ Admin Map Socket Auth Error:', err.message);
    });

    socket.on('admin-location-updated', (data: { userId: string; lat: number; lng: number }) => {
      setUsers(prev => {
        const index = prev.findIndex(u => u.id === data.userId);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], lat: data.lat, lng: data.lng };
          return next;
        }
        return prev;
      });
    });

    return () => { socket.disconnect(); };
  }, [autoRefresh]);

  useEffect(() => {
    if (activeFilter === 'all') setFilteredUsers(users);
    else setFilteredUsers(users.filter((u: { role: string }) => activeFilter === 'drivers' ? u.role === 'driver' : activeFilter === 'motorists' ? u.role === 'motorist' : u.role === 'rider'));
  }, [users, activeFilter]);

  const getIcon = (role: string) => role === 'driver' ? carIcon : role === 'motorist' ? bikeIcon : riderIcon;
  const getRoleIcon = (role: string) => role === 'driver' ? carOutline : role === 'motorist' ? bicycleOutline : personOutline;

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonTitle style={{color: '#fff'}}>Live Map</IonTitle>
          <div slot="end" style={{display: 'flex', gap: 4}}>
            <IonButton fill="clear" onClick={() => setAutoRefresh(!autoRefresh)}>
              <IonIcon icon={autoRefresh ? pauseOutline : playOutline} style={{color: autoRefresh ? '#2D6A4F' : '#FF6B35'}} />
            </IonButton>
            <IonButton fill="clear" onClick={loadData}>
              <IonIcon icon={refreshOutline} style={{color: '#FF6B35'}} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto'}}>
          {[{label: 'Drivers', value: stats.drivers, color: '#FF6B35'}, {label: 'Motorists', value: stats.motorists, color: '#FF6B35'}, {label: 'Customers', value: stats.riders, color: '#FF6B35'}, {label: 'Active Trips', value: stats.activeTrips, color: '#FF6B35'}].map(s => (
            <div key={s.label} style={{background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', flex: 1, minWidth: 70}}>
              <div style={{fontSize: 16, fontWeight: 700, color: s.color}}>{s.value}</div>
              <div style={{fontSize: 10, color: '#D1D5DB', whiteSpace: 'nowrap'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{margin: '0 12px 8px'}}>
          <IonSegmentButton value="all"><IonLabel style={{fontSize: 10, color: '#D1D5DB'}}>All</IonLabel></IonSegmentButton>
          <IonSegmentButton value="drivers"><IonLabel style={{fontSize: 10, color: '#D1D5DB'}}>Drivers</IonLabel></IonSegmentButton>
          <IonSegmentButton value="motorists"><IonLabel style={{fontSize: 10, color: '#D1D5DB'}}>Boda</IonLabel></IonSegmentButton>
          <IonSegmentButton value="riders"><IonLabel style={{fontSize: 10, color: '#D1D5DB'}}>Customers</IonLabel></IonSegmentButton>
          <IonSegmentButton value="heatmap"><IonLabel style={{fontSize: 10, color: '#D1D5DB'}}>Demand</IonLabel></IonSegmentButton>
        </IonSegment>

        {loading ? (
          <div style={{height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <IonSpinner name="crescent" color="warning" />
          </div>
        ) : (
          <div style={{height: '45vh', width: '100%', minHeight: 280}}>
            <MapContainer key={mapKey} center={userLocation} zoom={14} style={{height: '100%', width: '100%'}}>
              <TileLayer url={tileUrls[mapStyle]} />
              <FlyToButton center={userLocation} />
              <Marker position={userLocation} icon={riderIcon}><Popup>📍 Your Location</Popup></Marker>
              {filteredUsers.map(u => (
                <Marker key={u.id} position={[u.lat, u.lng]} icon={getIcon(u.role)}><Popup><strong style={{color: '#000'}}>{u.fullName}</strong><br/><span style={{color: '#666'}}>Role: {u.role}</span><br/><span style={{color: '#666'}}>Status: {u.status}</span></Popup></Marker>
              ))}
            </MapContainer>
          </div>
        )}

        <div style={{padding: 14}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
            <h3 style={{color: '#fff', margin: 0, fontSize: 15}}>Active Users ({filteredUsers.length})</h3>
            {autoRefresh && <span style={{color: '#2D6A4F', fontSize: 10}}>● Live</span>}
          </div>
          {filteredUsers.map(u => (
            <div key={u.id} style={{background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10}}>
              <IonIcon icon={getRoleIcon(u.role)} style={{color: u.role === 'driver' ? '#4da6ff' : u.role === 'motorist' ? '#ffab40' : '#00e676', fontSize: 18}} />
              <div style={{flex: 1}}><span style={{color: '#fff', fontSize: 13}}>{u.fullName}</span><p style={{color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2}}>{u.lat?.toFixed(4)}, {u.lng?.toFixed(4)}</p></div>
              <IonBadge style={{background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid #10B981', fontSize: 10}}>{u.status === 'active' ? 'Active' : 'Idle'}</IonBadge>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLiveMap;
