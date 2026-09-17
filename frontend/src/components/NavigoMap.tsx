import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { IonSpinner, IonBadge, IonChip } from '@ionic/react';
import { useTheme } from '../context/ThemeContext';
import bodaNew from '../assets/vehicles/boda-new.png';
import goNew from '../assets/vehicles/go-new.png';
import comfortNew from '../assets/vehicles/comfort-new.png';
import xlNew from '../assets/vehicles/xl-new.png';

// Fix default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

const createPulsingIcon = (color: string, emoji: string, size: number = 32) => {
  return L.divIcon({
    className: 'navigo-pulsing-icon',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <div style="position:absolute;inset:0;background:${color};border-radius:50%;animation:navigo-pulse 2s infinite;opacity:0.5;"></div>
            <div style="position:absolute;inset:0;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;">${emoji}</div>
           </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createVehicleIcon = (imageUrl: string, color: string, size: number = 42) => {
  return L.divIcon({
    className: 'navigo-vehicle-icon',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <div style="position:absolute;inset:0;background:${color};border-radius:50%;animation:navigo-pulse 2s infinite;opacity:0.28;"></div>
            <div style="position:absolute;inset:0;background:white;border-radius:50%;border:2.5px solid ${color};box-shadow:0 4px 14px rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <img src="${imageUrl}" style="width:70%;height:70%;object-fit:contain;display:block;" />
            </div>
          </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const pickIcon = createPulsingIcon('#FF6B35', '📍', 36);
const destIcon = createPulsingIcon('#0F172A', '🎯', 38);

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaNew, color: '#FF6B35' },
  go: { url: goNew, color: '#0EA5E9' },
  comfort: { url: comfortNew, color: '#0F172A' },
  xl: { url: xlNew, color: '#6366F1' },
  economy: { url: goNew, color: '#0EA5E9' },
};

// Map event handler
const MapEvents: React.FC<{ onMapClick?: (latlng: [number, number]) => void; userLocation: { lat: number; lng: number } | null; followUser: boolean }> = ({ onMapClick, userLocation, followUser }) => {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (followUser && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, { animate: true, duration: 1.2 });
    }
  }, [userLocation, followUser, map]);

  useEffect(() => {
    // Fix Ionic + Leaflet resize issue - invalidate multiple times
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 400),
      setTimeout(() => map.invalidateSize(), 800),
      setTimeout(() => map.invalidateSize(), 1500),
    ];
    const observer = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    if (container) observer.observe(container);
    
    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
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
  onDistanceChange?: (distance: number, duration: number) => void;
  onMapClick?: (latlng: [number, number]) => void;
}

const NavigoMap: React.FC<MapProps> = ({
  userLocation, destination, driverLocation, driverType = 'go',
  height = '350px', interactive = true, showRoute = true,
  showControls = true, followUser = true, searchResults = [],
  onDistanceChange, onMapClick
}) => {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [tilesError, setTilesError] = useState(false);

  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  // Premium tiles - HOT OSM is most reliable and colorful, matches orange brand, never blocked
  // Dark uses Carto dark_all, light uses HOT + OSM direct as fallback
  const tileUrl = mapStyle === 'standard'
    ? theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  const fallbackTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = mapStyle === 'standard'
    ? theme === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>'
    : '&copy; Esri &mdash; Source: Esri';

  // Fetch route
  useEffect(() => {
    if (!showRoute || !userLocation || !destination) {
      setRoutePoints([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const from = `${userLocation.lng},${userLocation.lat}`;
        const to = `${destination.lng},${destination.lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.routes?.length > 0) {
          const route = data.routes[0];
          const points = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRoutePoints(points);
          const d = Math.round(route.distance / 100) / 10;
          const t = Math.round(route.duration / 60);
          setRouteDistance(d); setRouteDuration(t);
          if (onDistanceChange) onDistanceChange(d, t);
          return;
        }
        throw new Error('No route');
      } catch {
        // Fallback straight line
        setRoutePoints([[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]]);
        const map = L as any;
        const d = 0; // Will be calculated by map distance if needed
        // Approximate
        const dist = Math.round(L.latLng(userLocation.lat, userLocation.lng).distanceTo(L.latLng(destination.lat, destination.lng)) / 100) / 10;
        const t = Math.max(1, Math.round((dist / 22) * 60));
        setRouteDistance(dist); setRouteDuration(t);
        if (onDistanceChange) onDistanceChange(dist, t);
      }
    };
    fetchRoute();
  }, [userLocation, destination, showRoute]);

  return (
    <div style={{ position: 'relative', height: height === '100%' ? '100dvh' : height, minHeight: height === '100%' ? '100vh' : height, width: '100%', background: theme === 'dark' ? '#080C14' : '#F8FAFC', overflow: 'hidden' }}>
      {showControls && (
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <IonBadge color="success" style={{ fontSize: 10, padding: '5px 10px', borderRadius: 9999, fontWeight: 800, letterSpacing: 0.5 }}>● LIVE GPS</IonBadge>
          <IonBadge color="warning" style={{ fontSize: 10, padding: '5px 10px', borderRadius: 9999, fontWeight: 800 }}>● REAL-TIME</IonBadge>
          <IonChip outline={mapStyle !== 'standard'} color={mapStyle === 'standard' ? 'warning' : 'medium'}
            onClick={() => setMapStyle('standard')} style={{ fontSize: 11, height: 28, cursor: 'pointer', '--background': mapStyle === 'standard' ? 'rgba(255,107,53,0.18)' : 'rgba(18,24,36,0.85)', fontWeight: 700 }}>
            🗺️ STANDARD
          </IonChip>
          <IonChip outline={mapStyle !== 'satellite'} color={mapStyle === 'satellite' ? 'warning' : 'medium'}
            onClick={() => setMapStyle('satellite')} style={{ fontSize: 11, height: 28, cursor: 'pointer', '--background': mapStyle === 'satellite' ? 'rgba(255,107,53,0.18)' : 'rgba(18,24,36,0.85)', fontWeight: 700 }}>
            🛰️ SATELLITE
          </IonChip>
          {routeDistance > 0 && (
            <IonBadge color="dark" style={{ fontSize: 11, padding: '5px 12px', borderRadius: 9999, fontWeight: 700 }}>{routeDistance}km • {routeDuration}min</IonBadge>
          )}
        </div>
      )}

      <button
        onClick={() => {
          if (userLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
              // This will trigger flyTo via followUser
            });
          }
        }}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          background: '#FF6B35', color: 'white', border: 'none', padding: '8px 14px',
          borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 6
        }}
      >
        📍 My Location
      </button>

      {tilesError && (
        <div style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(13,19,31,0.96)', border: '1px solid rgba(255,107,53,0.4)', borderRadius: 9999, padding: '8px 16px', fontSize: 12, color: '#fff', display: 'flex', gap: 10, alignItems: 'center' }}>
          🗺️ Tiles slow — <button onClick={() => setTilesError(false)} style={{ background: '#FF6B35', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 9999, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', minHeight: height === '100%' ? '100vh' : height, background: theme === 'dark' ? '#0F172A' : '#E2E8F0' }}
        zoomControl={false}
        attributionControl={true}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
      >
        {/* Fallback OSM direct - always loads, underneath */}
        <TileLayer
          url={fallbackTileUrl}
          attribution={tileAttribution}
          maxZoom={19}
          minZoom={3}
        />
        {/* Primary styled layer on top */}
        <TileLayer
          url={tileUrl}
          attribution={tileAttribution}
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={20}
          maxNativeZoom={19}
          minZoom={3}
          tileSize={256}
          eventHandlers={{
            tileerror: () => setTilesError(true),
            load: () => setTilesError(false),
          }}
        />

        {mapStyle === 'satellite' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
            subdomains={['a', 'b', 'c', 'd']}
            maxZoom={20}
            pane="overlayPane"
          />
        )}

        <MapEvents onMapClick={onMapClick} userLocation={userLocation} followUser={followUser} />

        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={pickIcon as any} />
            <Circle center={[userLocation.lat, userLocation.lng]} radius={14} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.15, weight: 1 }} />
          </>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon as any} />
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createVehicleIcon(VEHICLE_ICONS[driverType]?.url || goNew, VEHICLE_ICONS[driverType]?.color || '#0EA5E9') as any} />
        )}

        {routePoints.length > 0 && (
          <Polyline positions={routePoints} pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }} />
        )}

        {searchResults.map((r, idx) => (
          <Marker
            key={`${r.lat}-${r.lng}-${idx}`}
            position={[r.lat, r.lng]}
            icon={L.divIcon({
              className: 'search-result-icon',
              html: `<div style="background:#FF6B35;border:2.5px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;box-shadow:0 3px 10px rgba(0,0,0,0.35);">${idx + 1}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }) as any}
          />
        ))}
      </MapContainer>

      <style>{`
        @keyframes navigo-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.2); opacity: 0; } }
        .leaflet-container { background: ${theme === 'dark' ? '#080C14' : '#F8FAFC'} !important; font-family: var(--font-body); }
        .leaflet-tile { filter: ${theme === 'dark' ? 'brightness(1) contrast(1.05)' : 'none'} !important; opacity: 1 !important; visibility: visible !important; }
        .leaflet-tile-pane { opacity: 1 !important; }
        .leaflet-layer { opacity: 1 !important; }
        .leaflet-control-attribution { background: rgba(8,12,20,0.85) !important; color: #94A3B8 !important; font-size: 10px !important; border-radius: 8px 0 0 0 !important; backdrop-filter: blur(8px); padding: 4px 8px !important; }
        .leaflet-control-attribution a { color: #FF6B35 !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important; border-radius: 12px !important; overflow: hidden; margin-bottom: 20px !important; margin-right: 12px !important; }
        .leaflet-control-zoom a { background: rgba(18,24,36,0.92) !important; color: white !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; width: 38px !important; height: 38px !important; line-height: 38px !important; font-size: 18px !important; font-weight: bold; }
        .leaflet-control-zoom a:hover { background: #FF6B35 !important; color: white !important; }
        body.light .leaflet-control-zoom a { background: white !important; color: #0F172A !important; border-bottom: 1px solid rgba(0,0,0,0.06) !important; }
        .navigo-pulsing-icon, .navigo-vehicle-icon, .search-result-icon { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
};

export default NavigoMap;
