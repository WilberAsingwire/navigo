import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
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

const createIcon = (color: string, emoji: string, size = 40) => L.divIcon({
  className: 'navigo-icon',
  html: `<div style="position:relative;width:${size}px;height:${size}px;">
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;animation:pulse 2s infinite;opacity:0.45;"></div>
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;">${emoji}</div>
  </div><style>@keyframes pulse{0%{transform:scale(1);opacity:0.45}100%{transform:scale(2.4);opacity:0}}</style>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const createVehicleIcon = (url: string, color: string, size = 46) => L.divIcon({
  className: 'navigo-vehicle',
  html: `<div style="position:relative;width:${size}px;height:${size}px;">
    <div style="position:absolute;inset:0;background:${color};border-radius:50%;animation:pulse 2s infinite;opacity:0.32;"></div>
    <div style="position:absolute;inset:0;background:white;border-radius:50%;border:3px solid ${color};box-shadow:0 4px 16px rgba(0,0,0,0.38);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <img src="${url}" style="width:72%;height:72%;object-fit:contain;"/>
    </div>
  </div>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const pickIcon = createIcon('#FF6B35', '📍', 42);
const destIcon = createIcon('#0F172A', '🎯', 44);

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaNew, color: '#FF6B35' },
  go: { url: goNew, color: '#0EA5E9' },
  comfort: { url: comfortNew, color: '#0F172A' },
  xl: { url: xlNew, color: '#6366F1' },
  economy: { url: goNew, color: '#0EA5E9' },
};

const MapEvents: React.FC<{ 
  onMapClick?: (ll: [number, number]) => void; 
  userLocation: { lat: number; lng: number } | null; 
  followUser: boolean;
  onZoomChange?: (zoom: number) => void;
}> = ({ onMapClick, userLocation, followUser, onZoomChange }) => {
  const map = useMap();
  useMapEvents({ 
    click(e) { onMapClick?.([e.latlng.lat, e.latlng.lng]); },
    zoomend() { onZoomChange?.(map.getZoom()); }
  });
  useEffect(() => {
    if (followUser && userLocation) map.flyTo([userLocation.lat, userLocation.lng], map.getZoom(), { duration: 1 });
  }, [userLocation, followUser, map]);
  useEffect(() => {
    const timers = [100, 400, 900, 1600].map(ms => setTimeout(() => map.invalidateSize(), ms));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => { timers.forEach(clearTimeout); ro.disconnect(); };
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
  const [mapZoom, setMapZoom] = useState(15);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);

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

  // FIXED: Correct Google embed params - t=m roadmap, t=k satellite
  // Using explicit t param and correct z from state
  const googleEmbedUrl = `https://maps.google.com/maps?q=${center[0]},${center[1]}&z=${mapZoom}&t=m&ie=UTF8&iwloc=&output=embed`;
  const googleEmbedUrlSat = `https://maps.google.com/maps?q=${center[0]},${center[1]}&z=${mapZoom}&t=k&ie=UTF8&iwloc=&output=embed`;

  // FIXED: Correct filter - standard dark needs invert, satellite dark should NOT invert (was causing opposite look)
  const getIframeFilter = () => {
    if (theme === 'light') return 'none';
    if (mapStyle === 'satellite') {
      // Satellite: keep natural colors, just darken slightly - NO invert
      return 'brightness(0.88) contrast(1.15) saturate(1.1)';
    }
    // Standard roadmap: light -> dark via invert
    return 'invert(0.88) hue-rotate(180deg) brightness(0.95) contrast(1.1) saturate(1.2)';
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onMapClick?.([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
    try { if ('vibrate' in navigator) navigator.vibrate(10); } catch {}
  };

  const handleZoomIn = () => setMapZoom(z => Math.min(20, z + 1));
  const handleZoomOut = () => setMapZoom(z => Math.max(3, z - 1));

  return (
    <div style={{ position: 'relative', height: height === '100%' ? '100dvh' : height, minHeight: '100vh', width: '100%', background: '#0F172A', overflow: 'hidden' }}>
      {/* Google Maps iframe - guaranteed, zoom synced */}
      <iframe
        key={`${mapStyle}-${mapZoom}-${center[0]}-${center[1]}`}
        title="Navigo Map"
        src={mapStyle === 'satellite' ? googleEmbedUrlSat : googleEmbedUrl}
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, border: 0, filter: getIframeFilter() }}
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Transparent Leaflet overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <MapContainer
          center={center}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', background: 'transparent' }}
          zoomControl={false}
          attributionControl={false}
          dragging={interactive}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
        >
          <MapEvents onMapClick={onMapClick} userLocation={userLocation} followUser={followUser} onZoomChange={setMapZoom} />
          {userLocation && <><Marker position={[userLocation.lat, userLocation.lng]} icon={pickIcon as any} /><Circle center={[userLocation.lat, userLocation.lng]} radius={18} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.2, weight: 2 }} /></>}
          {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon as any} />}
          {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createVehicleIcon(VEHICLE_ICONS[driverType]?.url || goNew, VEHICLE_ICONS[driverType]?.color || '#0EA5E9') as any} />}
          {routePoints.length > 0 && <Polyline positions={routePoints} pathOptions={{ color: '#FF6B35', weight: 6, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} />}
          {searchResults.map((r, i) => (
            <Marker key={`${r.lat}-${r.lng}-${i}`} position={[r.lat, r.lng]} icon={L.divIcon({ className: 'search-icon', html: `<div style="background:#FF6B35;border:3px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;color:white;box-shadow:0 4px 14px rgba(0,0,0,0.4);font-size:13px;">${i+1}</div>`, iconSize: [32,32], iconAnchor: [16,16] }) as any} />
          ))}
        </MapContainer>
      </div>

      {/* Premium Controls */}
      <div className="map-controls-top">
        <div className="map-controls-left">
          <div className="map-badge live">● LIVE GPS</div>
          <div className="map-badge realtime">● REAL-TIME</div>
          <div className="map-style-toggle">
            <button className={`map-style-btn ${mapStyle === 'standard' ? 'active' : ''}`} onClick={() => { setMapStyle('standard'); try { if ('vibrate' in navigator) navigator.vibrate(8); } catch {} }}>🗺️ STANDARD</button>
            <button className={`map-style-btn ${mapStyle === 'satellite' ? 'active' : ''}`} onClick={() => { setMapStyle('satellite'); try { if ('vibrate' in navigator) navigator.vibrate(8); } catch {} }}>🛰️ SATELLITE</button>
          </div>
          {routeDistance > 0 && <div className="map-badge route">{routeDistance}km • {routeDuration}min</div>}
        </div>
        <button className="my-location-btn" onClick={handleMyLocation}>📍 My Location</button>
      </div>

      {/* Custom Zoom Controls - FIXED: Now syncs iframe zoom */}
      <div className="custom-zoom-controls">
        <button className="zoom-btn" onClick={handleZoomIn} aria-label="Zoom in">+</button>
        <button className="zoom-btn" onClick={handleZoomOut} aria-label="Zoom out">−</button>
      </div>

      <style>{`
        .leaflet-container { background: transparent !important; }
        .leaflet-tile-pane { display: none !important; }
        .navigo-icon, .navigo-vehicle, .search-icon { background: transparent !important; border: none !important; }
        .custom-zoom-controls {
          position: absolute;
          bottom: 90px;
          right: 16px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.32);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .zoom-btn {
          width: 44px;
          height: 44px;
          background: rgba(15,23,42,0.92);
          color: white;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-size: 22px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(16px);
          transition: all 0.2s ease;
        }
        .zoom-btn:last-child { border-bottom: none; }
        .zoom-btn:hover { background: #FF6B35 !important; color: white !important; }
        .zoom-btn:active { transform: scale(0.92); }
      `}</style>
    </div>
  );
};

export default NavigoMap;
