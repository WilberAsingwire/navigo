import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import { IonSpinner, IonBadge, IonChip } from '@ionic/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createPulsingIcon = (color: string, emoji: string, size: number = 28) => {
  return L.divIcon({
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 0 15px ${color};font-size:${size*0.5}px;text-align:center;line-height:${size}px">${emoji}</div>`,
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2],
  });
};

const pickIcon = createPulsingIcon('#2D6A4F', '📍', 30);
const destIcon = createPulsingIcon('#E85D75', '🎯', 32);
const driverIcon = createPulsingIcon('#FF6B35', '🚗', 34);
const bikeIcon = createPulsingIcon('#ffab40', '🏍️', 34);

interface MapProps {
  userLocation: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  driverType?: 'car' | 'bike';
  height?: string;
  interactive?: boolean;
  showRoute?: boolean;
  showControls?: boolean;
  followUser?: boolean;
  onDistanceChange?: (distance: number, duration: number) => void;
}

const MapController: React.FC<{ center: [number, number]; follow: boolean }> = ({ center, follow }) => {
  const map = useMap();
  useEffect(() => {
    if (follow) map.setView(center, 16, { animate: true, duration: 1 });
  }, [center, follow, map]);
  return null;
};

const LocateButton: React.FC = () => {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <a onClick={() => map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true })}
          style={{ cursor: 'pointer', padding: '8px 12px', display: 'block', background: '#FF6B35', color: '#fff', fontWeight: 'bold', fontSize: 12, border: 'none', textDecoration: 'none', borderRadius: 4 }}>
          📍 My Location
        </a>
      </div>
    </div>
  );
};

const NavigoMap: React.FC<MapProps> = ({
  userLocation, destination, driverLocation, driverType = 'car',
  height = '350px', interactive = true, showRoute = true,
  showControls = true, followUser = true, onDistanceChange
}) => {
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('dark');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  const tileUrls: Record<string, { url: string; attribution: string }> = {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Source: Esri'
    },
  };

  useEffect(() => {
    if (!userLocation || !destination || !showRoute) { setRoutePoints([]); return; }
    const fetchRoute = async () => {
      try {
        const from = `${userLocation.lng},${userLocation.lat}`;
        const to = `${destination.lng},${destination.lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes?.length > 0) {
          const route = data.routes[0];
          setRoutePoints(route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
          const d = Math.round(route.distance / 100) / 10;
          const t = Math.round(route.duration / 60);
          setRouteDistance(d); setRouteDuration(t);
          if (onDistanceChange) onDistanceChange(d, t);
        }
      } catch {
        setRoutePoints([[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]]);
      }
    };
    fetchRoute();
  }, [userLocation, destination, showRoute]);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const openInGoogleMaps = () => {
    if (userLocation && destination) window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}`, '_blank');
  };

  return (
    <div style={{ position: 'relative' }}>
      {showControls && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center', padding: '0 4px' }}>
          {Object.keys(tileUrls).map(style => (
            <IonChip key={style} outline={mapStyle !== style} color={mapStyle === style ? 'warning' : 'medium'}
              onClick={() => setMapStyle(style as any)} style={{ fontSize: 10, cursor: 'pointer', padding: '2px 8px' }}>
              {style === 'standard' ? '🗺️' : style === 'dark' ? '🌙' : '🛰️'} {style}
            </IonChip>
          ))}
          {userLocation && destination && (
            <>
              <IonChip outline color="primary" onClick={openInGoogleMaps} style={{ fontSize: 10, cursor: 'pointer' }}>📍 Navigate</IonChip>
              {routeDistance > 0 && <IonBadge color="warning" style={{ fontSize: 10 }}>{routeDistance}km • {routeDuration}min</IonBadge>}
            </>
          )}
        </div>
      )}
      <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', border: '2px solid rgba(255,255,255,0.08)' }}>
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 1000, transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.8)', padding: 16, borderRadius: 12 }}>
            <IonSpinner name="crescent" color="warning" />
          </div>
        )}
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={true} dragging={interactive} scrollWheelZoom={interactive} touchZoom={interactive} attributionControl={true}>
          <TileLayer url={tileUrls[mapStyle].url} attribution={tileUrls[mapStyle].attribution} />
          <MapController center={center} follow={followUser} />
          <LocateButton />
          {userLocation && <><Marker position={[userLocation.lat, userLocation.lng]} icon={pickIcon}><Popup>📍 You</Popup></Marker><Circle center={[userLocation.lat, userLocation.lng]} radius={8} color="#2D6A4F" fillOpacity={0.1} /></>}
          {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon}><Popup>🎯 Destination</Popup></Marker>}
          {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverType === 'bike' ? bikeIcon : driverIcon}><Popup>{driverType === 'bike' ? '🏍️' : '🚗'} Driver</Popup></Marker>}
          {routePoints.length > 1 && <Polyline positions={routePoints} color="#FF6B35" weight={4} opacity={0.7} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default NavigoMap;