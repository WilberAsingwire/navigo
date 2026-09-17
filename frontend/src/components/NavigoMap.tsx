import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { IonBadge, IonChip } from '@ionic/react';
import { useTheme } from '../context/ThemeContext';
import bodaNew from '../assets/vehicles/boda-new.png';
import goNew from '../assets/vehicles/go-new.png';
import comfortNew from '../assets/vehicles/comfort-new.png';
import xlNew from '../assets/vehicles/xl-new.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

const createIcon = (color: string, emoji: string, size = 36) => L.divIcon({
  className: 'navigo-icon',
  html: `<div style="position:relative;width:${size}px;height:${size}px;">
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;animation:pulse 2s infinite;opacity:0.45;"></div>
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:${size*0.52}px;">${emoji}</div>
  </div><style>@keyframes pulse{0%{transform:scale(1);opacity:0.45}100%{transform:scale(2.3);opacity:0}}</style>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const createVehicleIcon = (url: string, color: string, size = 44) => L.divIcon({
  className: 'navigo-vehicle',
  html: `<div style="position:relative;width:${size}px;height:${size}px;">
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;animation:pulse 2s infinite;opacity:0.3;"></div>
    <div style="position:absolute;inset:0;background:white;border-radius:50%;border:3px solid ${color};box-shadow:0 4px 14px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <img src="${url}" style="width:70%;height:70%;object-fit:contain;"/>
    </div>
  </div>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const pickIcon = createIcon('#FF6B35', '📍', 38);
const destIcon = createIcon('#0F172A', '🎯', 40);

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaNew, color: '#FF6B35' },
  go: { url: goNew, color: '#0EA5E9' },
  comfort: { url: comfortNew, color: '#0F172A' },
  xl: { url: xlNew, color: '#6366F1' },
  economy: { url: goNew, color: '#0EA5E9' },
};

const MapEvents: React.FC<{ onMapClick?: (ll: [number, number]) => void; userLocation: { lat: number; lng: number } | null; followUser: boolean }> = ({ onMapClick, userLocation, followUser }) => {
  const map = useMap();
  useMapEvents({ click(e) { onMapClick?.([e.latlng.lat, e.latlng.lng]); } });
  useEffect(() => {
    if (followUser && userLocation) map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1 });
  }, [userLocation, followUser, map]);
  useEffect(() => {
    const t = [100, 300, 800, 1500].map(ms => setTimeout(() => map.invalidateSize(), ms));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => { t.forEach(clearTimeout); ro.disconnect(); };
  }, [map]);
  return null;
};

interface MapProps {
  userLocation: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  driverType?: string;
  height?: string;
  interactive?: boolean;
  showRoute?: boolean;
  showControls?: boolean;
  followUser?: boolean;
  searchResults?: { lat: number; lng: number; name?: string; address?: string }[];
  onDistanceChange?: (d: number, t: number) => void;
  onMapClick?: (ll: [number, number]) => void;
}

const NavigoMap: React.FC<MapProps> = ({
  userLocation, destination, driverLocation, driverType = 'go',
  height = '100%', interactive = true, showRoute = true,
  showControls = true, followUser = true, searchResults = [],
  onDistanceChange, onMapClick
}) => {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  useEffect(() => {
    if (!showRoute || !userLocation || !destination) { setRoutePoints([]); return; }
    const fetchRoute = async () => {
      try {
        const from = `${userLocation.lng},${userLocation.lat}`;
        const to = `${destination.lng},${destination.lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.routes?.length) {
          const pts = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRoutePoints(pts);
          const d = Math.round(data.routes[0].distance / 100) / 10;
          const t = Math.round(data.routes[0].duration / 60);
          setRouteDistance(d); setRouteDuration(t);
          onDistanceChange?.(d, t);
          return;
        }
        throw new Error('no route');
      } catch {
        setRoutePoints([[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]]);
        const dist = Math.round(L.latLng(userLocation.lat, userLocation.lng).distanceTo(L.latLng(destination.lat, destination.lng)) / 100) / 10;
        const t = Math.max(1, Math.round((dist / 22) * 60));
        setRouteDistance(dist); setRouteDuration(t);
        onDistanceChange?.(dist, t);
      }
    };
    fetchRoute();
  }, [userLocation, destination, showRoute]);

  // If tiles fail after 4s, switch to iframe fallback (guaranteed to work)
  useEffect(() => {
    const t = setTimeout(() => {
      // Check if any tile images loaded
      const tiles = document.querySelectorAll('.leaflet-tile');
      if (tiles.length === 0 || Array.from(tiles).every((img: any) => !img.complete || img.naturalWidth === 0)) {
        console.warn('Leaflet tiles not loaded, switching to iframe fallback');
        setUseFallback(true);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const googleRoadUrl = 'https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&s=Ga';
  const osmHotUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
  const osmDirectUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const cartoDarkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const primaryUrl = mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' 
    : theme === 'dark' ? cartoDarkUrl : googleRoadUrl;

  const primaryAttribution = mapStyle === 'satellite' ? '&copy; Esri' : theme === 'dark' ? '&copy; OSM &copy; CARTO' : '&copy; Google & OSM';

  // Fallback iframe - OpenStreetMap embed that always works
  if (useFallback) {
    const bbox = `${center[1]-0.02},${center[0]-0.02},${center[1]+0.02},${center[0]+0.02}`;
    return (
      <div style={{ position: 'relative', height: height === '100%' ? '100dvh' : height, minHeight: '100vh', width: '100%', background: '#0F172A', overflow: 'hidden' }}>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          style={{ border: 0, filter: theme === 'dark' ? 'invert(0.9) hue-rotate(180deg) brightness(0.9)' : 'none' }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center[0]},${center[1]}`}
        />
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8 }}>
          <IonBadge color="success" style={{ borderRadius: 9999, padding: '5px 10px', fontWeight: 800 }}>● LIVE GPS (Fallback)</IonBadge>
          <IonChip color="warning" onClick={() => setUseFallback(false)} style={{ height: 28, cursor: 'pointer', fontWeight: 700 }}>🔄 Try Interactive</IonChip>
        </div>
        <button onClick={() => setUseFallback(false)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: '#FF6B35', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>📍 My Location</button>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(to top, rgba(8,12,20,0.9), transparent)', pointerEvents: 'none' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: height === '100%' ? '100dvh' : height, minHeight: '100vh', width: '100%', background: theme === 'dark' ? '#0F172A' : '#F1F5F9', overflow: 'hidden' }}>
      {showControls && (
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <IonBadge color="success" style={{ borderRadius: 9999, padding: '5px 10px', fontWeight: 800, fontSize: 10 }}>● LIVE GPS</IonBadge>
          <IonBadge color="warning" style={{ borderRadius: 9999, padding: '5px 10px', fontWeight: 800, fontSize: 10 }}>● REAL-TIME</IonBadge>
          <IonChip outline={mapStyle !== 'standard'} color={mapStyle === 'standard' ? 'warning' : 'medium'} onClick={() => setMapStyle('standard')} style={{ height: 28, fontWeight: 700, fontSize: 11, cursor: 'pointer', '--background': mapStyle === 'standard' ? 'rgba(255,107,53,0.18)' : 'rgba(18,24,36,0.85)' } as any}>🗺️ STANDARD</IonChip>
          <IonChip outline={mapStyle !== 'satellite'} color={mapStyle === 'satellite' ? 'warning' : 'medium'} onClick={() => setMapStyle('satellite')} style={{ height: 28, fontWeight: 700, fontSize: 11, cursor: 'pointer', '--background': mapStyle === 'satellite' ? 'rgba(255,107,53,0.18)' : 'rgba(18,24,36,0.85)' } as any}>🛰️ SATELLITE</IonChip>
          {routeDistance > 0 && <IonBadge color="dark" style={{ borderRadius: 9999, padding: '5px 12px', fontWeight: 700, fontSize: 11 }}>{routeDistance}km • {routeDuration}min</IonBadge>}
        </div>
      )}

      <button style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, background: '#FF6B35', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>📍 My Location</button>

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', minHeight: '100vh', background: theme === 'dark' ? '#0F172A' : '#E2E8F0' }}
        zoomControl={false}
        attributionControl={true}
        dragging={interactive}
        scrollWheelZoom={interactive}
      >
        {/* Base OSM - guaranteed */}
        <TileLayer url={osmDirectUrl} attribution='&copy; OSM' maxZoom={19} />
        {/* HOT overlay */}
        <TileLayer url={osmHotUrl} attribution='&copy; OSM HOT' subdomains={['a','b','c']} maxZoom={19} opacity={theme === 'dark' ? 0 : 1} />
        {/* Primary */}
        <TileLayer url={primaryUrl} attribution={primaryAttribution} subdomains={['a','b','c','d']} maxZoom={20} maxNativeZoom={19} />
        {mapStyle === 'satellite' && <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' subdomains={['a','b','c','d']} maxZoom={20} pane="overlayPane" />}

        <MapEvents onMapClick={onMapClick} userLocation={userLocation} followUser={followUser} />

        {userLocation && <><Marker position={[userLocation.lat, userLocation.lng]} icon={pickIcon as any} /><Circle center={[userLocation.lat, userLocation.lng]} radius={14} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.15, weight: 1 }} /></>}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon as any} />}
        {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createVehicleIcon(VEHICLE_ICONS[driverType]?.url || goNew, VEHICLE_ICONS[driverType]?.color || '#0EA5E9') as any} />}
        {routePoints.length > 0 && <Polyline positions={routePoints} pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.9 }} />}
        {searchResults.map((r, i) => (
          <Marker key={`${r.lat}-${r.lng}-${i}`} position={[r.lat, r.lng]} icon={L.divIcon({ className: 'search-icon', html: `<div style="background:#FF6B35;border:2.5px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;color:white;box-shadow:0 3px 10px rgba(0,0,0,0.35);">${i+1}</div>`, iconSize: [28,28], iconAnchor: [14,14] }) as any} />
        ))}
      </MapContainer>

      <style>{`
        .leaflet-container { background: ${theme === 'dark' ? '#0F172A' : '#E2E8F0'} !important; }
        .leaflet-tile { opacity: 1 !important; visibility: visible !important; }
        .leaflet-control-attribution { background: rgba(8,12,20,0.85) !important; color: #94A3B8 !important; font-size: 10px !important; border-radius: 8px 0 0 0 !important; }
        .leaflet-control-attribution a { color: #FF6B35 !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important; border-radius: 12px !important; overflow: hidden; margin: 0 12px 20px 0 !important; }
        .leaflet-control-zoom a { background: rgba(18,24,36,0.92) !important; color: white !important; width: 38px !important; height: 38px !important; line-height: 38px !important; }
        .leaflet-control-zoom a:hover { background: #FF6B35 !important; }
        .navigo-icon, .navigo-vehicle, .search-icon { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
};

export default NavigoMap;
