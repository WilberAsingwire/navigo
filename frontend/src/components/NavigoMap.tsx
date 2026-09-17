import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents, ZoomControl, ScaleControl } from 'react-leaflet';
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

// Premium icons - Google Maps style but Navigo branded
const createPickupIcon = () => L.divIcon({
  className: 'pickup-marker',
  html: `<div class="marker-wrap pickup">
    <div class="marker-dot"></div>
    <div class="marker-pulse"></div>
    <div class="marker-label">Pickup</div>
  </div>`,
  iconSize: [40, 48],
  iconAnchor: [20, 42],
});

const createDestIcon = () => L.divIcon({
  className: 'dest-marker',
  html: `<div class="marker-wrap dest">
    <div class="marker-dot"></div>
    <div class="marker-label">Drop</div>
  </div>`,
  iconSize: [40, 48],
  iconAnchor: [20, 42],
});

const createVehicleIcon = (url: string, color: string, bearing = 0, size = 48) => L.divIcon({
  className: 'vehicle-marker',
  html: `<div class="vehicle-wrap" style="transform: rotate(${bearing}deg);">
    <div class="vehicle-pulse" style="background:${color}"></div>
    <div class="vehicle-body" style="border-color:${color}">
      <img src="${url}" alt="" />
      <div class="vehicle-bearing" style="background:${color}"></div>
    </div>
  </div>`,
  iconSize: [size, size],
  iconAnchor: [size/2, size/2],
});

const createSearchIcon = (num: number) => L.divIcon({
  className: 'search-marker',
  html: `<div class="search-pin">${num}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const pickupIcon = createPickupIcon();
const destIcon = createDestIcon();

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaNew, color: '#FF6B35' },
  go: { url: goNew, color: '#0EA5E9' },
  comfort: { url: comfortNew, color: '#0F172A' },
  xl: { url: xlNew, color: '#6366F1' },
  economy: { url: goNew, color: '#0EA5E9' },
};

// Map events with all features
const MapController: React.FC<{
  onMapClick?: (ll: [number, number]) => void;
  userLocation: { lat: number; lng: number } | null;
  followUser: boolean;
  onMove?: (center: [number, number], zoom: number) => void;
  onZoomChange?: (zoom: number) => void;
}> = ({ onMapClick, userLocation, followUser, onMove, onZoomChange }) => {
  const map = useMap();
  
  useMapEvents({
    click(e) { onMapClick?.([e.latlng.lat, e.latlng.lng]); },
    moveend() { 
      const c = map.getCenter();
      onMove?.([c.lat, c.lng], map.getZoom());
    },
    zoomend() { onZoomChange?.(map.getZoom()); },
  });

  useEffect(() => {
    if (followUser && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], Math.max(15, map.getZoom()), { duration: 1.2 });
    }
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
  showNearbyDrivers?: boolean;
  searchResults?: { lat: number; lng: number; name?: string; address?: string }[];
  onDistanceChange?: (d: number, t: number) => void;
  onMapClick?: (ll: [number, number]) => void;
  onPickupDrag?: (ll: [number, number]) => void;
  onDestDrag?: (ll: [number, number]) => void;
}

const NavigoMap: React.FC<MapProps> = ({
  userLocation, destination, driverLocation, driverType = 'go',
  height = '100%', interactive = true, showRoute = true,
  showControls = true, followUser = true, showNearbyDrivers = false,
  searchResults = [], onDistanceChange, onMapClick, onPickupDrag, onDestDrag
}) => {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [mapZoom, setMapZoom] = useState(15);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.3476, 32.5825]);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<{ id: string; lat: number; lng: number; type: string; bearing: number }[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : mapCenter;

  // Mock nearby drivers for demo - in real app from socket
  useEffect(() => {
    if (!showNearbyDrivers || !userLocation) return;
    const drivers = [
      { id: '1', lat: userLocation.lat + 0.005, lng: userLocation.lng + 0.003, type: 'boda', bearing: 45 },
      { id: '2', lat: userLocation.lat - 0.003, lng: userLocation.lng + 0.005, type: 'go', bearing: 120 },
      { id: '3', lat: userLocation.lat + 0.002, lng: userLocation.lng - 0.004, type: 'comfort', bearing: 200 },
      { id: '4', lat: userLocation.lat - 0.006, lng: userLocation.lng - 0.002, type: 'boda', bearing: 300 },
      { id: '5', lat: userLocation.lat + 0.008, lng: userLocation.lng + 0.001, type: 'xl', bearing: 80 },
    ];
    setNearbyDrivers(drivers);
    
    // Animate drivers slightly
    const interval = setInterval(() => {
      setNearbyDrivers(prev => prev.map(d => ({
        ...d,
        lat: d.lat + (Math.random() - 0.5) * 0.0002,
        lng: d.lng + (Math.random() - 0.5) * 0.0002,
        bearing: d.bearing + (Math.random() - 0.5) * 10,
      })));
    }, 3000);
    
    return () => clearInterval(interval);
  }, [showNearbyDrivers, userLocation]);

  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);

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

  // Tile URLs - reliable providers
  const getTileLayers = () => {
    const isDark = theme === 'dark';
    
    if (mapStyle === 'satellite') {
      return [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri', maxZoom: 19 },
        { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO', subdomains: 'abcd', pane: 'overlayPane', maxZoom: 19 },
      ];
    }
    
    if (mapStyle === 'terrain') {
      return [
        { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap & OSM', subdomains: 'abc', maxZoom: 17 },
      ];
    }
    
    // Standard - Carto Voyager for light, Dark Matter for dark - premium and reliable
    if (isDark) {
      return [
        { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 20 },
      ];
    }
    
    return [
      { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 20 },
    ];
  };

  const tileLayers = getTileLayers();

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setMapCenter(newLoc);
          onMapClick?.(newLoc);
          setIsMapMoved(false);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
    try { if ('vibrate' in navigator) navigator.vibrate(10); } catch {}
  };

  const handleRecenter = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setIsMapMoved(false);
    }
  };

  return (
    <div className="navigo-map-container" style={{ height: height === '100%' ? '100dvh' : height, minHeight: '100vh', width: '100%', background: theme === 'dark' ? '#0F172A' : '#F1F5F9' }}>
      <MapContainer
        ref={mapRef as any}
        center={center}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#0F172A' : '#F1F5F9' }}
        zoomControl={false}
        attributionControl={false}
        dragging={interactive}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        keyboard={true}
      >
        {tileLayers.map((tile, idx) => (
          <TileLayer
            key={`${tile.url}-${idx}-${theme}-${mapStyle}`}
            url={tile.url}
            attribution={tile.attribution}
            subdomains={tile.subdomains as any}
            maxZoom={tile.maxZoom}
            maxNativeZoom={19}
            minZoom={3}
            pane={tile.pane as any}
          />
        ))}

        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" imperial={false} />

        <MapController 
          onMapClick={onMapClick} 
          userLocation={userLocation} 
          followUser={followUser}
          onMove={(c, z) => { setMapCenter(c); setMapZoom(z); if (userLocation && (Math.abs(c[0]-userLocation.lat) > 0.001 || Math.abs(c[1]-userLocation.lng) > 0.001)) setIsMapMoved(true); }}
          onZoomChange={setMapZoom}
        />

        {/* Boda Safe Zone - 1km radius around user */}
        {userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={1000}
            pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.04, weight: 1, dashArray: '8 8', opacity: 0.4 }}
          />
        )}

        {/* User location */}
        {userLocation && (
          <>
            <Marker 
              position={[userLocation.lat, userLocation.lng]} 
              icon={pickupIcon as any}
              draggable={!!onPickupDrag}
              eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onPickupDrag?.([ll.lat, ll.lng]); } }}
            />
            <Circle center={[userLocation.lat, userLocation.lng]} radius={20} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.2, weight: 2 }} />
          </>
        )}

        {/* Destination */}
        {destination && (
          <Marker 
            position={[destination.lat, destination.lng]} 
            icon={destIcon as any}
            draggable={!!onDestDrag}
            eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onDestDrag?.([ll.lat, ll.lng]); } }}
          />
        )}

        {/* Driver */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createVehicleIcon(VEHICLE_ICONS[driverType]?.url || goNew, VEHICLE_ICONS[driverType]?.color || '#0EA5E9') as any} />
        )}

        {/* Nearby drivers - Navigo specific */}
        {nearbyDrivers.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.lat, driver.lng]}
            icon={createVehicleIcon(VEHICLE_ICONS[driver.type]?.url || goNew, VEHICLE_ICONS[driver.type]?.color || '#0EA5E9', driver.bearing, 40) as any}
          />
        ))}

        {/* Route */}
        {routePoints.length > 0 && (
          <>
            <Polyline positions={routePoints} pathOptions={{ color: '#0F172A', weight: 8, opacity: 0.3, lineJoin: 'round', lineCap: 'round' }} />
            <Polyline positions={routePoints} pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} />
          </>
        )}

        {/* Search results */}
        {searchResults.map((r, i) => (
          <Marker key={`${r.lat}-${r.lng}-${i}`} position={[r.lat, r.lng]} icon={createSearchIcon(i+1) as any} />
        ))}
      </MapContainer>

      {/* Premium Controls - Google Maps style but Navigo branded */}
      <div className="map-controls-top">
        <div className="map-controls-left">
          <div className="map-badge live"><span className="badge-dot live"></span> LIVE GPS</div>
          <div className="map-badge realtime"><span className="badge-dot realtime"></span> REAL-TIME</div>
          <div className="map-style-toggle">
            <button className={`map-style-btn ${mapStyle === 'standard' ? 'active' : ''}`} onClick={() => setMapStyle('standard')}>🗺️ STANDARD</button>
            <button className={`map-style-btn ${mapStyle === 'satellite' ? 'active' : ''}`} onClick={() => setMapStyle('satellite')}>🛰️ SATELLITE</button>
            <button className={`map-style-btn ${mapStyle === 'terrain' ? 'active' : ''}`} onClick={() => setMapStyle('terrain')}>⛰️ TERRAIN</button>
          </div>
          {routeDistance > 0 && <div className="map-badge route">📍 {routeDistance}km • ⏱️ {routeDuration}min</div>}
          {nearbyDrivers.length > 0 && <div className="map-badge drivers">🚗 {nearbyDrivers.length} drivers nearby</div>}
        </div>
        <div className="map-controls-right">
          {isMapMoved && <button className="recenter-btn" onClick={handleRecenter}>🎯 Recenter</button>}
          <button className="my-location-btn" onClick={handleMyLocation}>📍 My Location</button>
        </div>
      </div>

      {/* Boda Safe indicator */}
      <div className="boda-safe-indicator">
        <span className="safe-icon">🛡️</span>
        <span>Boda Safe™ Zone • 1km</span>
      </div>

      <style>{`
        .navigo-map-container { position: relative; overflow: hidden; }
        .leaflet-container { font-family: var(--font-body); background: ${theme === 'dark' ? '#0F172A' : '#F1F5F9'} !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important; border-radius: 14px !important; overflow: hidden; margin: 0 16px 24px 0 !important; }
        .leaflet-control-zoom a { background: rgba(15,23,42,0.92) !important; color: white !important; width: 44px !important; height: 44px !important; line-height: 44px !important; font-size: 20px !important; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.08) !important; backdrop-filter: blur(16px); }
        .leaflet-control-zoom a:hover { background: #FF6B35 !important; }
        .leaflet-control-scale { margin: 0 0 12px 16px !important; }
        .leaflet-control-scale-line { background: rgba(15,23,42,0.85) !important; color: white !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 6px; backdrop-filter: blur(12px); font-weight: 700; font-size: 11px; }
        .leaflet-control-attribution { background: rgba(15,23,42,0.85) !important; color: #94A3B8 !important; font-size: 10px !important; border-radius: 8px 0 0 0 !important; backdrop-filter: blur(12px); padding: 4px 8px !important; margin: 0 !important; }
        .leaflet-control-attribution a { color: #FF6B35 !important; }

        .marker-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
        .marker-wrap.pickup .marker-dot { width: 18px; height: 18px; background: #FF6B35; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(255,107,53,0.5); position: relative; z-index: 2; }
        .marker-wrap.dest .marker-dot { width: 18px; height: 18px; background: #0F172A; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(0,0,0,0.4); position: relative; z-index: 2; }
        .marker-pulse { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 18px; height: 18px; background: #FF6B35; border-radius: 50%; animation: markerPulse 2s infinite; opacity: 0.5; }
        .marker-label { margin-top: 6px; background: rgba(15,23,42,0.9); color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.12); white-space: nowrap; letter-spacing: 0.02em; }
        @keyframes markerPulse { 0% { transform: translateX(-50%) scale(1); opacity: 0.5; } 100% { transform: translateX(-50%) scale(2.5); opacity: 0; } }

        .vehicle-wrap { position: relative; }
        .vehicle-pulse { position: absolute; inset: 0; border-radius: 50%; animation: markerPulse 2s infinite; opacity: 0.3; }
        .vehicle-body { width: 100%; height: 100%; background: white; border-radius: 50%; border: 3px solid; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.35); position: relative; overflow: hidden; }
        .vehicle-body img { width: 68%; height: 68%; object-fit: contain; }
        .vehicle-bearing { position: absolute; top: -2px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; }

        .search-pin { width: 32px; height: 32px; background: #FF6B35; border: 3px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 13px; box-shadow: 0 4px 14px rgba(0,0,0,0.35); }
        .search-pin::after { content: attr(data-num); transform: rotate(45deg); }

        .map-controls-top { position: absolute; top: max(12px, env(safe-area-inset-top)); left: 12px; right: 12px; z-index: 1000; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; pointer-events: none; }
        .map-controls-left { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; pointer-events: auto; }
        .map-controls-right { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; pointer-events: auto; }
        .map-badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 2px 12px rgba(0,0,0,0.25); letter-spacing: 0.03em; }
        .map-badge.live { background: rgba(16,185,129,0.18); color: #10B981; border-color: rgba(16,185,129,0.3); }
        .map-badge.realtime { background: rgba(245,158,11,0.18); color: #F59E0B; border-color: rgba(245,158,11,0.3); }
        .map-badge.route { background: rgba(15,23,42,0.9); color: #F5F7FA; }
        .map-badge.drivers { background: rgba(14,165,233,0.18); color: #0EA5E9; border-color: rgba(14,165,233,0.3); }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; animation: dotPulse 1.5s infinite; }
        .badge-dot.live { background: #10B981; }
        .badge-dot.realtime { background: #F59E0B; }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .map-style-toggle { display: flex; background: rgba(15,23,42,0.88); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12); border-radius: 9999px; padding: 3px; box-shadow: 0 2px 12px rgba(0,0,0,0.25); }
        .map-style-btn { padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; background: transparent; color: #94A3B8; transition: all 0.2s ease; }
        .map-style-btn.active { background: #FF6B35; color: white; box-shadow: 0 2px 8px rgba(255,107,53,0.3); }
        .map-style-btn:hover:not(.active) { background: rgba(255,255,255,0.08); color: #F5F7FA; }
        .my-location-btn, .recenter-btn { background: #FF6B35; color: white; border: none; padding: 10px 16px; border-radius: 12px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 4px 16px rgba(255,107,53,0.35); display: flex; align-items: center; gap: 6px; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); white-space: nowrap; }
        .recenter-btn { background: rgba(15,23,42,0.9); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(16px); }
        .my-location-btn:hover, .recenter-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 24px rgba(255,107,53,0.45); }
        .my-location-btn:active, .recenter-btn:active { transform: scale(0.96); }
        .boda-safe-indicator { position: absolute; bottom: 90px; left: 16px; z-index: 1000; background: rgba(15,23,42,0.9); backdrop-filter: blur(16px); border: 1px solid rgba(255,107,53,0.25); color: #FF6B35; padding: 8px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
        .safe-icon { font-size: 14px; }

        @media (max-width: 768px) {
          .map-controls-top { flex-direction: column; align-items: stretch; }
          .map-controls-left { justify-content: flex-start; }
          .map-controls-right { flex-direction: row; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
};

export default NavigoMap;
