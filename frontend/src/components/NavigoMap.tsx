import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import { IonSpinner, IonButton, IonIcon, IonBadge, IonChip } from '@ionic/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  showRoute?: boolean;
  showControls?: boolean;
  onDistanceChange?: (distance: number) => void;
}

const pickIcon = L.divIcon({ html: '<div style="background:#2D6A4F;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(45,106,79,0.8);font-size:10px;text-align:center;line-height:18px;color:white">📍</div>', iconSize: [24, 24], iconAnchor: [12, 12] });
const destIcon = L.divIcon({ html: '<div style="background:#E85D75;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 14px rgba(232,93,117,0.8);font-size:12px;text-align:center;line-height:22px">🎯</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
const driverIcon = L.divIcon({ html: '<div style="background:#FF6B35;width:26px;height:26px;border-radius:50%;border:3px solid white;box-shadow:0 0 16px rgba(255,107,53,0.9);font-size:14px;text-align:center;line-height:26px">🚗</div>', iconSize: [32, 32], iconAnchor: [16, 16] });

const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 15); }, [center]);
  return null;
};

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  const flyTo = () => map.flyTo(center, 16, { duration: 1.5 });
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <a onClick={flyTo} style={{ cursor: 'pointer', padding: '6px 10px', display: 'block', background: '#FF6B35', color: '#fff', fontWeight: 'bold', fontSize: 12, border: 'none', textDecoration: 'none' }} title="My Location">📍 My Location</a>
      </div>
    </div>
  );
};

const NavigoMap: React.FC<MapProps> = ({ userLocation, destination, driverLocation, height = '350px', interactive = true, showRoute = true, showControls = true, onDistanceChange }) => {
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('standard');
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  const tileUrls: Record<string, string> = {
    standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const routeLine: [number, number][] = [];
  if (userLocation && destination && showRoute) {
    routeLine.push([userLocation.lat, userLocation.lng]);
    routeLine.push([destination.lat, destination.lng]);
  }

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const openInGoogleMaps = () => {
    if (userLocation && destination) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}`, '_blank');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Map Controls */}
      {showControls && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {(['standard', 'dark', 'satellite'] as const).map(style => (
            <IonChip key={style} outline={mapStyle !== style} color={mapStyle === style ? 'warning' : 'medium'}
              onClick={() => setMapStyle(style)}
              style={{ fontSize: 11, cursor: 'pointer', padding: '2px 10px' }}>
              {style === 'standard' ? '🗺️ Map' : style === 'dark' ? '🌙 Dark' : '🛰️ Satellite'}
            </IonChip>
          ))}
          {userLocation && destination && (
            <IonChip outline color="primary" onClick={openInGoogleMaps} style={{ fontSize: 11, cursor: 'pointer' }}>
              📍 Open in Maps
            </IonChip>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', border: '2px solid rgba(255,255,255,0.08)' }}>
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 1000, transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.8)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IonSpinner name="crescent" color="warning" />
            <span style={{ color: '#fff', fontSize: 13 }}>Loading map...</span>
          </div>
        )}
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={true} dragging={interactive} scrollWheelZoom={interactive} touchZoom={interactive} attributionControl={true}>
          <TileLayer url={tileUrls[mapStyle]} />
          <RecenterMap center={center} />
          {showControls && <MapController center={center} />}
          
          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={pickIcon}>
                <Popup>
                  <strong>📍 Your Location</strong><br/>
                  <small>{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</small>
                </Popup>
              </Marker>
              <Circle center={[userLocation.lat, userLocation.lng]} radius={15} color="#2D6A4F" fillOpacity={0.15} weight={2} />
            </>
          )}
          
          {destination && (
            <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
              <Popup>
                <strong>🎯 Destination</strong><br/>
                <small>{destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</small>
              </Popup>
            </Marker>
          )}
          
          {driverLocation && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
              <Popup>
                <strong>🚗 Driver</strong><br/>
                <small>Moving towards pickup</small>
              </Popup>
            </Marker>
          )}
          
          {routeLine.length === 2 && (
            <Polyline positions={routeLine} color="#FF6B35" weight={3} opacity={0.7} dashArray="10, 6" />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default NavigoMap;