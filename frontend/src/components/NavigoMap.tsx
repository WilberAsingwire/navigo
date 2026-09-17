import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';
import bodaNew from '../assets/vehicles/boda-new.png';
import goNew from '../assets/vehicles/go-new.png';
import comfortNew from '../assets/vehicles/comfort-new.png';
import xlNew from '../assets/vehicles/xl-new.png';

// Fix default icon URLs - use CDN to avoid Vite bundling issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Premium icons without <style> tags
const pickupIcon = L.divIcon({
  className: 'navigo-pickup',
  html: `<div class="np-wrap"><div class="np-dot"></div><div class="np-pulse"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destIcon = L.divIcon({
  className: 'navigo-dest',
  html: `<div class="nd-wrap"><div class="nd-dot"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createVehicleIcon = (url: string, color: string) => L.divIcon({
  className: 'navigo-vehicle',
  html: `<div class="nv-wrap"><div class="nv-body" style="border-color:${color}"><img src="${url}" alt=""/></div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const createSearchIcon = (n: number) => L.divIcon({
  className: 'navigo-search',
  html: `<div class="ns-pin">${n}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaNew, color: '#FF6B35' },
  go: { url: goNew, color: '#0EA5E9' },
  comfort: { url: comfortNew, color: '#0F172A' },
  xl: { url: xlNew, color: '#6366F1' },
  economy: { url: goNew, color: '#0EA5E9' },
};

const isValidLatLng = (ll: { lat: number; lng: number } | null | undefined): boolean => {
  if (!ll) return false;
  const { lat, lng } = ll;
  return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Tile providers - ordered by reliability (least blocked first)
// OSM is NEVER blocked by adblock, Google is rarely blocked, Carto/Esri often blocked
const TILE_PROVIDERS = {
  standard: [
    {
      id: 'osm',
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    },
    {
      id: 'google-roadmap',
      name: 'Google',
      url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    },
    {
      id: 'esri-street',
      name: 'Esri Street',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      subdomains: [],
      attribution: '&copy; Esri',
      maxZoom: 19,
    },
  ],
  satellite: [
    {
      id: 'esri-sat',
      name: 'Esri Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      subdomains: [],
      attribution: '&copy; Esri, Maxar',
      maxZoom: 19,
    },
    {
      id: 'google-hybrid',
      name: 'Google Satellite',
      url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google',
      maxZoom: 20,
    },
    {
      id: 'osm', // fallback
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    },
  ],
  terrain: [
    {
      id: 'opentopo',
      name: 'OpenTopo',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenTopoMap',
      maxZoom: 17,
    },
    {
      id: 'google-terrain',
      name: 'Google Terrain',
      url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google',
      maxZoom: 20,
    },
    {
      id: 'osm',
      name: 'OSM',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    },
  ],
};

const MapEvents: React.FC<{
  onMapClick?: (ll: [number, number]) => void;
  userLocation: { lat: number; lng: number } | null;
  followUser: boolean;
  onMove?: (c: [number, number], z: number) => void;
}> = ({ onMapClick, userLocation, followUser, onMove }) => {
  const map = useMap();
  useMapEvents({
    click(e) {
      const ll = e.latlng;
      if (!isNaN(ll.lat) && !isNaN(ll.lng)) onMapClick?.([ll.lat, ll.lng]);
    },
    moveend() {
      try {
        const c = map.getCenter();
        if (!isNaN(c.lat) && !isNaN(c.lng)) onMove?.([c.lat, c.lng], map.getZoom());
      } catch {}
    },
  });
  useEffect(() => {
    if (followUser && isValidLatLng(userLocation)) {
      try {
        map.flyTo([userLocation!.lat, userLocation!.lng], 15, { duration: 1 });
      } catch (e) {
        console.warn('flyTo failed:', e);
      }
    }
  }, [userLocation, followUser, map]);
  useEffect(() => {
    const t = setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 200);
    return () => clearTimeout(t);
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
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.3476, 32.5825]);
  const [nearbyDrivers, setNearbyDrivers] = useState<{ id: string; lat: number; lng: number; type: string }[]>([]);
  const [tileProviderIndex, setTileProviderIndex] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);

  const getValidCenter = (): [number, number] => {
    if (isValidLatLng(userLocation)) return [userLocation!.lat, userLocation!.lng];
    if (isValidLatLng({ lat: mapCenter[0], lng: mapCenter[1] })) return mapCenter;
    return [0.3476, 32.5825];
  };

  const center = getValidCenter();

  // Reset provider index when mapStyle changes
  useEffect(() => {
    setTileProviderIndex(0);
    setTileErrors(0);
  }, [mapStyle]);

  const providers = TILE_PROVIDERS[mapStyle];
  const currentProvider = providers[Math.min(tileProviderIndex, providers.length - 1)];

  const handleTileError = useCallback(() => {
    setTileErrors(prev => {
      const next = prev + 1;
      // If more than 3 tile errors, switch provider
      if (next > 3 && tileProviderIndex < providers.length - 1) {
        console.warn(`Tiles failing for ${currentProvider.id}, switching to ${providers[tileProviderIndex + 1].id}`);
        setTileProviderIndex(i => i + 1);
        return 0;
      }
      return next;
    });
  }, [tileProviderIndex, providers, currentProvider]);

  useEffect(() => {
    if (!showNearbyDrivers || !isValidLatLng(userLocation)) return;
    setNearbyDrivers([
      { id: '1', lat: userLocation!.lat + 0.005, lng: userLocation!.lng + 0.003, type: 'boda' },
      { id: '2', lat: userLocation!.lat - 0.003, lng: userLocation!.lng + 0.005, type: 'go' },
      { id: '3', lat: userLocation!.lat + 0.002, lng: userLocation!.lng - 0.004, type: 'comfort' },
      { id: '4', lat: userLocation!.lat - 0.006, lng: userLocation!.lng - 0.002, type: 'boda' },
    ]);
  }, [showNearbyDrivers, userLocation]);

  useEffect(() => {
    if (!showRoute || !isValidLatLng(userLocation) || !isValidLatLng(destination as any)) { setRoutePoints([]); return; }
    const fetchRoute = async () => {
      try {
        const from = `${userLocation!.lng},${userLocation!.lat}`;
        const to = `${destination!.lng},${destination!.lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.routes?.length) {
          const pts = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
          setRoutePoints(pts);
          const d = Math.round(data.routes[0].distance / 100) / 10;
          const t = Math.round(data.routes[0].duration / 60);
          setRouteDistance(d); setRouteDuration(t);
          onDistanceChange?.(d, t);
          return;
        }
        throw new Error('no route');
      } catch {
        if (isValidLatLng(userLocation) && isValidLatLng(destination as any)) {
          setRoutePoints([[userLocation!.lat, userLocation!.lng], [destination!.lat, destination!.lng]]);
          try {
            const dist = Math.round(L.latLng(userLocation!.lat, userLocation!.lng).distanceTo(L.latLng(destination!.lat, destination!.lng)) / 100) / 10;
            const t = Math.max(1, Math.round((dist / 22) * 60));
            setRouteDistance(dist); setRouteDuration(t);
            onDistanceChange?.(dist, t);
          } catch {}
        }
      }
    };
    fetchRoute();
  }, [userLocation, destination, showRoute]);

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setMapCenter(ll);
          onMapClick?.(ll);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Determine filter for dark mode - OSM light needs invert, satellite should not be inverted
  const getTileFilter = () => {
    if (theme !== 'dark') return 'none';
    if (mapStyle === 'satellite') return 'brightness(0.9) contrast(1.1) saturate(1.1)';
    // For standard OSM, invert to dark mode but keep readable
    if (currentProvider.id === 'osm') return 'invert(0.92) hue-rotate(180deg) brightness(0.9) contrast(1.1) saturate(0.8)';
    // Google and others
    return 'brightness(0.9) contrast(1.1)';
  };

  return (
    <div className="navigo-map-root" style={{ height: height === '100%' ? '100vh' : height, width: '100%', position: 'relative', background: '#0F172A' }}>
      {/* Base background that shows if tiles fail - visible grid */}
      <div style={{ position: 'absolute', inset: 0, background: theme === 'dark' ? '#1E293B' : '#E2E8F0', backgroundImage: `radial-gradient(circle at 1px 1px, ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} 1px, transparent 0)`, backgroundSize: '24px 24px', zIndex: 0 }} />
      
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 1, background: 'transparent' }}
        zoomControl={true}
        attributionControl={true}
      >
        {/* Primary tile layer - with auto fallback on error */}
        <TileLayer
          key={`${mapStyle}-${currentProvider.id}`}
          url={currentProvider.url}
          attribution={currentProvider.attribution}
          subdomains={currentProvider.subdomains.length ? currentProvider.subdomains : undefined}
          maxZoom={currentProvider.maxZoom}
          maxNativeZoom={currentProvider.maxZoom}
          eventHandlers={{
            tileerror: handleTileError,
          }}
        />

        {/* For satellite, add labels overlay if using Esri satellite */}
        {mapStyle === 'satellite' && currentProvider.id === 'esri-sat' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={19}
          />
        )}

        <MapEvents onMapClick={onMapClick} userLocation={userLocation} followUser={followUser} onMove={(c) => { if (!isNaN(c[0]) && !isNaN(c[1])) setMapCenter(c); }} />

        {isValidLatLng(userLocation) && (
          <>
            <Marker position={[userLocation!.lat, userLocation!.lng]} icon={pickupIcon} draggable={!!onPickupDrag} eventHandlers={{ dragend: (e: any) => { try { const ll = e.target.getLatLng(); if (!isNaN(ll.lat) && !isNaN(ll.lng)) onPickupDrag?.([ll.lat, ll.lng]); } catch {} } }} />
            <Circle center={[userLocation!.lat, userLocation!.lng]} radius={1000} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.04, weight: 1, dashArray: '8 8', opacity: 0.35 }} />
            <Circle center={[userLocation!.lat, userLocation!.lng]} radius={20} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.2, weight: 2 }} />
          </>
        )}

        {isValidLatLng(destination as any) && (
          <Marker position={[destination!.lat, destination!.lng]} icon={destIcon} draggable={!!onDestDrag} eventHandlers={{ dragend: (e: any) => { try { const ll = e.target.getLatLng(); if (!isNaN(ll.lat) && !isNaN(ll.lng)) onDestDrag?.([ll.lat, ll.lng]); } catch {} } }} />
        )}

        {isValidLatLng(driverLocation as any) && <Marker position={[driverLocation!.lat, driverLocation!.lng]} icon={createVehicleIcon(VEHICLE_ICONS[driverType]?.url || goNew, VEHICLE_ICONS[driverType]?.color || '#0EA5E9')} />}

        {nearbyDrivers.filter(d => isValidLatLng(d as any)).map(d => (
          <Marker key={d.id} position={[d.lat, d.lng]} icon={createVehicleIcon(VEHICLE_ICONS[d.type]?.url || goNew, VEHICLE_ICONS[d.type]?.color || '#0EA5E9')} />
        ))}

        {routePoints.length > 0 && routePoints.every(([lat, lng]) => !isNaN(lat) && !isNaN(lng)) && (
          <>
            <Polyline positions={routePoints} pathOptions={{ color: '#0F172A', weight: 8, opacity: 0.25, lineJoin: 'round', lineCap: 'round' }} />
            <Polyline positions={routePoints} pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} />
          </>
        )}

        {searchResults.filter(r => isValidLatLng(r as any)).map((r, i) => (
          <Marker key={`${r.lat}-${r.lng}-${i}`} position={[r.lat, r.lng]} icon={createSearchIcon(i+1)} />
        ))}
      </MapContainer>

      {/* Controls */}
      <div className="map-controls-top">
        <div className="map-controls-left">
          <div className="map-badge live"><span className="bdot"></span> LIVE GPS</div>
          <div className="map-badge rt">● REAL-TIME</div>
          <div className="map-style-toggle">
            <button className={`ms-btn ${mapStyle === 'standard' ? 'active' : ''}`} onClick={() => setMapStyle('standard')}>STANDARD</button>
            <button className={`ms-btn ${mapStyle === 'satellite' ? 'active' : ''}`} onClick={() => setMapStyle('satellite')}>SATELLITE</button>
            <button className={`ms-btn ${mapStyle === 'terrain' ? 'active' : ''}`} onClick={() => setMapStyle('terrain')}>TERRAIN</button>
          </div>
          {routeDistance > 0 && <div className="map-badge route">{routeDistance}km • {routeDuration}min</div>}
          {nearbyDrivers.length > 0 && <div className="map-badge drv">🚗 {nearbyDrivers.length} nearby</div>}
          <div className="map-badge" style={{ fontSize: '9px', opacity: 0.7 }}>{currentProvider.name} {tileErrors > 0 ? `(${tileErrors} err)` : ''}</div>
        </div>
        <button className="my-location-btn" onClick={handleMyLocation}>📍 My Location</button>
      </div>

      <div className="boda-safe-badge">🛡️ Boda Safe™ • 1km</div>

      <style>{`
        .navigo-map-root .leaflet-container { font-family: var(--font-body); background: transparent !important; }
        .navigo-map-root .leaflet-tile-pane { filter: ${getTileFilter()}; transition: filter 0.3s ease; }
        .navigo-map-root .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important; border-radius: 14px !important; overflow: hidden; margin: 0 16px 24px 0 !important; }
        .navigo-map-root .leaflet-control-zoom a { background: rgba(15,23,42,0.92) !important; color: white !important; width: 44px !important; height: 44px !important; line-height: 44px !important; font-size: 20px !important; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.08) !important; backdrop-filter: blur(16px); }
        .navigo-map-root .leaflet-control-zoom a:hover { background: #FF6B35 !important; }
        .navigo-map-root .leaflet-control-attribution { background: rgba(15,23,42,0.85) !important; color: #94A3B8 !important; font-size: 10px !important; border-radius: 8px 0 0 0 !important; backdrop-filter: blur(8px); }
        .navigo-map-root .leaflet-control-attribution a { color: #FF6B35 !important; }
        .np-wrap, .nd-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
        .np-dot { width: 18px; height: 18px; background: #FF6B35; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(255,107,53,0.5); z-index: 2; position: relative; }
        .nd-dot { width: 18px; height: 18px; background: #0F172A; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(0,0,0,0.4); z-index: 2; position: relative; }
        .np-pulse { position: absolute; inset: 0; background: #FF6B35; border-radius: 50%; animation: npPulse 2s infinite; }
        @keyframes npPulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.8); opacity: 0; } }
        .nv-wrap { position: relative; width: 40px; height: 40px; }
        .nv-body { width: 40px; height: 40px; background: white; border-radius: 50%; border: 3px solid; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); }
        .nv-body img { width: 70%; height: 70%; object-fit: contain; }
        .ns-pin { width: 28px; height: 28px; background: #FF6B35; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.35); }
        .map-controls-top { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000; display: flex; justify-content: space-between; gap: 12px; pointer-events: none; }
        .map-controls-left { display: flex; flex-wrap: wrap; gap: 8px; pointer-events: auto; align-items: center; }
        .map-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        .map-badge.live { background: rgba(16,185,129,0.18); color: #10B981; border-color: rgba(16,185,129,0.3); }
        .map-badge.rt { background: rgba(245,158,11,0.18); color: #F59E0B; }
        .map-badge.route { background: rgba(15,23,42,0.9); color: white; }
        .map-badge.drv { background: rgba(14,165,233,0.18); color: #0EA5E9; }
        .bdot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; animation: bdot 1.5s infinite; }
        @keyframes bdot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .map-style-toggle { display: flex; background: rgba(15,23,42,0.9); border: 1px solid rgba(255,255,255,0.12); border-radius: 9999px; padding: 3px; }
        .ms-btn { padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: none; background: transparent; color: #94A3B8; cursor: pointer; }
        .ms-btn.active { background: #FF6B35; color: white; }
        .my-location-btn { pointer-events: auto; background: #FF6B35; color: white; border: none; padding: 10px 16px; border-radius: 12px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 4px 16px rgba(255,107,53,0.35); }
        .my-location-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .boda-safe-badge { position: absolute; bottom: 20px; left: 16px; z-index: 1000; background: rgba(15,23,42,0.9); border: 1px solid rgba(255,107,53,0.25); color: #FF6B35; padding: 7px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; backdrop-filter: blur(12px); }
        @media (max-width: 768px) { .map-controls-top { flex-direction: column; } }
      `}</style>
    </div>
  );
};

export default NavigoMap;
