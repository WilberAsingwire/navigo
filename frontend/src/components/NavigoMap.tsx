import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { IonSpinner } from '@ionic/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Vite: use CDN for marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapProps {
  userLocation: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  height?: string;
  interactive?: boolean;
}

const pickIcon = L.divIcon({ html: '<div style="background:#2D6A4F;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(45,106,79,0.6)"></div>', iconSize: [16, 16] });
const destIcon = L.divIcon({ html: '<div style="background:#E85D75;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(232,93,117,0.6)"></div>', iconSize: [20, 20] });
const driverIcon = L.divIcon({ html: '<div style="background:#FF6B35;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 15px rgba(255,107,53,0.8)"></div>', iconSize: [24, 24] });

const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 15); }, [center]);
  return null;
};

const NavigoMap: React.FC<MapProps> = ({ userLocation, destination, driverLocation, height = '300px', interactive = true }) => {
  const [loading, setLoading] = useState(true);
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 1000, transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.7)', padding: 16, borderRadius: 12 }}>
          <IonSpinner name="crescent" color="warning" />
        </div>
      )}
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={true} dragging={interactive} scrollWheelZoom={interactive} touchZoom={interactive} attributionControl={true}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterMap center={center} />
        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={pickIcon}><Popup>You are here</Popup></Marker>}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon}><Popup>Destination</Popup></Marker>}
        {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}><Popup>Driver</Popup></Marker>}
        {userLocation && <Circle center={[userLocation.lat, userLocation.lng]} radius={10} color="#2D6A4F" fillOpacity={0.2} />}
      </MapContainer>
    </div>
  );
};

export default NavigoMap;