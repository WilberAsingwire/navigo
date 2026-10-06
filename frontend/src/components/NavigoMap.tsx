import React, { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { locateOutline, warningOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// FREE MAP STACK: OpenStreetMap tiles for the standard view and Esri World
// Imagery for satellite — both free, no API key, no Google dependency. The
// paid upgrade path (Google/Mapbox tiles) is a one-line TileLayer URL swap.
const TILE_LAYERS = {
  standard: [
    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
    { url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  ],
  satellite: [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics' },
    { url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics' },
  ],
} as const;
import bodaNew from '../assets/vehicles/boda-new.png';
import goNew from '../assets/vehicles/go-new.png';
import comfortNew from '../assets/vehicles/comfort-new.png';
import xlNew from '../assets/vehicles/xl-new.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  html: `<div class="nv-wrap">
           
           <div class="nv-body" style="border-color:${color}"><img src="${url}" alt=""/></div>
         </div>`,
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

const MapEvents: React.FC<{
  onMapClick?: (ll: [number, number]) => void;
  userLocation: { lat: number; lng: number } | null;
  followUser: boolean;
  onMove?: (c: [number, number], z: number) => void;
}> = ({ onMapClick, userLocation, followUser, onMove }) => {
  const map = useMap();
  useMapEvents({
    click(e) { const ll = e.latlng; if (!isNaN(ll.lat) && !isNaN(ll.lng)) onMapClick?.([ll.lat, ll.lng]); },
    move(e) { try { const c = map.getCenter(); if (!isNaN(c.lat) && !isNaN(c.lng)) onMove?.([c.lat, c.lng], map.getZoom()); } catch { /* noop */ } },
    zoom(e) { try { const c = map.getCenter(); if (!isNaN(c.lat) && !isNaN(c.lng)) onMove?.([c.lat, c.lng], map.getZoom()); } catch { /* noop */ } },
  });
  useEffect(() => {
    if (followUser && isValidLatLng(userLocation)) { try { map.flyTo([userLocation!.lat, userLocation!.lng], 15, { duration: 1 }); } catch { /* noop */ } }
  }, [userLocation, followUser, map]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      try { map.invalidateSize(); } catch { /* noop */ }
    });

    const container = document.querySelector('.navigo-map-root');
    if (container) observer.observe(container);

    return () => observer.disconnect();
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
  loading?: boolean;
  error?: string;
}

const NavigoMap: React.FC<MapProps> = ({
  userLocation, destination, driverLocation, driverType = 'go',
  height = '100%', showRoute = true,
  showControls = true, followUser = true, showNearbyDrivers = false,
  searchResults = [], onDistanceChange, onMapClick, onPickupDrag, onDestDrag,
  loading, error
}) => {
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.3476, 32.5825]);
  const [mapZoom, setMapZoom] = useState(15);
  const [nearbyDrivers, setNearbyDrivers] = useState<{ id: string; lat: number; lng: number; type: string }[]>([]);
  const [tileError, setTileError] = useState(false);
  const [tileReloadKey, setTileReloadKey] = useState(0);
  const [tileProviderIndex, setTileProviderIndex] = useState(0);
  const tileFallbackRef = React.useRef(false);
  const mapRef = React.useRef<L.Map | null>(null);

  const getValidCenter = (): [number, number] => {
    if (isValidLatLng(userLocation)) return [userLocation!.lat, userLocation!.lng];
    if (isValidLatLng({ lat: mapCenter[0], lng: mapCenter[1] })) return mapCenter;
    return [0.3476, 32.5825];
  };
  const center = getValidCenter();

  // Track zoom changes

  // REAL nearby drivers (was: 4 hardcoded fake markers). Refreshes every 15 s
  // while the map is visible; silently shows none if the request fails.
  const nearbyKey = isValidLatLng(userLocation)
    ? `${userLocation!.lat.toFixed(3)},${userLocation!.lng.toFixed(3)}`
    : null;
  useEffect(() => {
    if (!showNearbyDrivers || !nearbyKey) { setNearbyDrivers([]); return; }
    let cancelled = false;
    const [lat, lng] = nearbyKey.split(',').map(Number);
    const load = async () => {
      try {
        const res = await api.get('/drivers/nearby', { params: { lat, lng } });
        if (!cancelled) setNearbyDrivers(res.data?.drivers || []);
      } catch {
        if (!cancelled) setNearbyDrivers([]);
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [showNearbyDrivers, nearbyKey]);

  useEffect(() => {
    if (!showRoute || !isValidLatLng(userLocation) || !isValidLatLng(destination as any)) { setRoutePoints([]); return; }
    const fetchRoute = async () => {
      try {
        const from = `${userLocation!.lng},${userLocation!.lat}`;
        const to = `${destination!.lng},${destination!.lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.routes?.length) {
          const pts = data.routes[0].geometry.coordinates
            .map((c: number[]): [number, number] => [c[1], c[0]])
            .filter(([lat, lng]: [number, number]) => !isNaN(lat) && !isNaN(lng));
          setRoutePoints(pts);
          const d = Math.round(data.routes[0].distance / 100) / 10;
          const t = Math.round(data.routes[0].duration / 60);
          setRouteDistance(d); setRouteDuration(t);
          onDistanceChange?.(d, t);
          return;
        }
        throw new Error('no route');
      } catch {
        // Removed straight-line fallback to avoid misleading users with non-road routes.
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
          if (mapRef.current) {
            try { mapRef.current.flyTo(ll, 16, { duration: 1 }); } catch { /* noop */ }
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(mapZoom + 1, 19);
    if (nextZoom === mapZoom) return;
    setMapZoom(nextZoom);
    if (mapRef.current) {
      try { mapRef.current.setZoom(nextZoom, { animate: true }); } catch { /* noop */ }
    }
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(mapZoom - 1, 5);
    if (nextZoom === mapZoom) return;
    setMapZoom(nextZoom);
    if (mapRef.current) {
      try { mapRef.current.setZoom(nextZoom, { animate: true }); } catch { /* noop */ }
    }
  };

  const handleStyleChange = (newStyle: 'standard' | 'satellite') => {
    setMapStyle(newStyle);
    setTileProviderIndex(0);
    tileFallbackRef.current = false;
    setTileError(false);
    setTileReloadKey(k => k + 1);
  };

  const retryMapTiles = () => {
    setTileProviderIndex(0);
    tileFallbackRef.current = false;
    setTileError(false);
    setTileReloadKey(k => k + 1);
  };

  const activeTileLayer = TILE_LAYERS[mapStyle][tileProviderIndex] || TILE_LAYERS[mapStyle][0];

  const handleTileError = () => {
    if (tileFallbackRef.current) return;
    tileFallbackRef.current = true;
    const nextProvider = tileProviderIndex + 1;
    if (nextProvider < TILE_LAYERS[mapStyle].length) {
      setTileError(false);
      setTileProviderIndex(nextProvider);
      setTileReloadKey(k => k + 1);
    } else {
      setTileError(true);
    }
  };

  return (
    <div
      className="navigo-map-root"
      style={{
        height: height,
        width: '100%',
        position: 'relative',
        background: mapStyle === 'satellite' ? '#0c1524' : '#e5e7eb',
        minHeight: '100%',
        flex: '1 1 auto',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <div className="map-overlay-state loading">
          <div className="map-state-card">
            <div className="map-spinner"></div>
            <p>Loading map layers...</p>
          </div>
        </div>
      )}

      {tileError && !error && (
        <div className="map-overlay-state error" style={{ zIndex: 1100 }}>
          <div className="map-state-card">
            <div className="map-error-icon"><IonIcon icon={warningOutline} /></div>
            <p>Map tiles could not be loaded. Check your internet connection and try again.</p>
            <button className="map-retry-btn" onClick={retryMapTiles}>Retry map</button>
          </div>
        </div>
      )}

      {error && (
        <div className="map-overlay-state error">
          <div className="map-state-card">
            <div className="map-error-icon"><IonIcon icon={warningOutline} /></div>
            <p>{error}</p>
            <button className="map-retry-btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}

      {/* LEAFLET MAP — real OSM/Esri tiles + markers, routes, and touch events */}
      <MapContainer
        center={center}
        zoom={mapZoom}
        maxZoom={19}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        style={{
          height: '100%',
          width: '100%',
          minHeight: 240,
          zIndex: 2,
          position: 'relative',
        }}
        zoomControl={false}
        attributionControl={true}
        ref={mapRef as any}
      >
        <TileLayer
          key={`${mapStyle}-${tileProviderIndex}-${tileReloadKey}`}
          url={activeTileLayer.url}
          attribution={activeTileLayer.attribution}
          maxZoom={19}
          eventHandlers={{
            tileerror: handleTileError,
            load: () => {
              tileFallbackRef.current = false;
              setTileError(false);
            },
          }}
        />
        <MapEvents
          onMapClick={onMapClick}
          userLocation={userLocation}
          followUser={followUser}
          onMove={(c, z) => {
            if (!isNaN(c[0]) && !isNaN(c[1])) {
              setMapCenter(c);
              setMapZoom(z);
            }
          }}
        />

        {isValidLatLng(userLocation) && (
          <>
            <Marker position={[userLocation!.lat, userLocation!.lng]} icon={pickupIcon} draggable={!!onPickupDrag} eventHandlers={{ dragend: (e: any) => { try { const ll = e.target.getLatLng(); if (!isNaN(ll.lat) && !isNaN(ll.lng)) onPickupDrag?.([ll.lat, ll.lng]); } catch { /* noop */ } } }} />
            <Circle center={[userLocation!.lat, userLocation!.lng]} radius={1000} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.06, weight: 1, dashArray: '8 8', opacity: 0.5 }} />
            <Circle center={[userLocation!.lat, userLocation!.lng]} radius={20} pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.25, weight: 2 }} />
          </>
        )}

        {isValidLatLng(destination as any) && (
          <Marker position={[destination!.lat, destination!.lng]} icon={destIcon} draggable={!!onDestDrag} eventHandlers={{ dragend: (e: any) => { try { const ll = e.target.getLatLng(); if (!isNaN(ll.lat) && !isNaN(ll.lng)) onDestDrag?.([ll.lat, ll.lng]); } catch { /* noop */ } } }} />
        )}

        {isValidLatLng(driverLocation as any) && <Marker position={[driverLocation!.lat, driverLocation!.lng]} icon={createVehicleIcon(VEHICLE_ICONS[driverType]?.url || goNew, VEHICLE_ICONS[driverType]?.color || '#0EA5E9')} />}

        {nearbyDrivers.filter(d => isValidLatLng(d as any)).map(d => (
          <Marker key={d.id} position={[d.lat, d.lng]} icon={createVehicleIcon(VEHICLE_ICONS[d.type]?.url || goNew, VEHICLE_ICONS[d.type]?.color || '#0EA5E9')} />
        ))}

        {routePoints.length > 0 && routePoints.every(([lat, lng]) => !isNaN(lat) && !isNaN(lng)) && (
          <>
            <Polyline positions={routePoints} pathOptions={{ color: '#0F172A', weight: 8, opacity: 0.35, lineJoin: 'round', lineCap: 'round' }} />
            <Polyline positions={routePoints} pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} />
          </>
        )}

        {searchResults.filter(r => isValidLatLng(r as any)).map((r, i) => (
          <Marker key={`${r.lat}-${r.lng}-${i}`} position={[r.lat, r.lng]} icon={createSearchIcon(i+1)} />
        ))}
      </MapContainer>

      <div className="map-controls-top">
        <div className="map-controls-left">
          <div className="map-style-toggle">
            <button className={`ms-btn ${mapStyle === 'standard' ? 'active' : ''}`} onClick={() => handleStyleChange('standard')}>Map</button>
            <button className={`ms-btn ${mapStyle === 'satellite' ? 'active' : ''}`} onClick={() => handleStyleChange('satellite')}>Satellite</button>
          </div>
          {routeDistance > 0 && <div className="map-badge route">{routeDistance} km · {routeDuration} min</div>}
          {nearbyDrivers.length > 0 && <div className="map-badge drv">{nearbyDrivers.length} driver{nearbyDrivers.length > 1 ? 's' : ''} nearby</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <div className="map-zoom-controls">
            <button className="mz-btn" aria-label="Zoom in" onClick={handleZoomIn}>+</button>
            <button className="mz-btn" aria-label="Zoom out" onClick={handleZoomOut}>−</button>
          </div>
          <button className="my-location-btn" onClick={handleMyLocation}>
            <IonIcon icon={locateOutline} aria-hidden="true" /> My location
          </button>
        </div>
      </div>

      <style>{`
        .navigo-map-root .leaflet-container { font-family: var(--font-body); background: ${mapStyle === 'satellite' ? '#0c1524' : '#e5e7eb'} !important; }
        .navigo-map-root .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,0.75); }
        .navigo-map-root .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 20px rgba(0,0,0,0.25) !important; border-radius: 14px !important; overflow: hidden; margin: 0 16px 24px 0 !important; }
        .navigo-map-root .leaflet-control-zoom a { background: rgba(15,23,42,0.92) !important; color: white !important; width: 44px !important; height: 44px !important; line-height: 44px !important; font-size: 20px !important; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
        .navigo-map-root .leaflet-control-zoom a:hover { background: #FF6B35 !important; }
        .np-wrap, .nd-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
        .np-dot { width: 18px; height: 18px; background: #FF6B35; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 2; position: relative; }
        .nd-dot { width: 18px; height: 18px; background: #0F172A; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(0,0,0,0.4); z-index: 2; position: relative; }
        .np-pulse { position: absolute; inset: 0; background: #FF6B35; border-radius: 50%; animation: npPulse 2s infinite; }
        @keyframes npPulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.8); opacity: 0; } }
        .nv-wrap { position: relative; width: 40px; height: 40px; }
        .nv-body {
          width: 40px; height: 40px; background: white; border-radius: 50%; border: 3px solid;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35); z-index: 2; position: relative;
        }
        .nv-body img { width: 70%; height: 70%; object-fit: contain; }
        .ns-pin { width: 28px; height: 28px; background: #FF6B35; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.35); }
        .map-controls-top { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000; display: flex; justify-content: space-between; gap: 12px; pointer-events: none; }
        .map-controls-left { display: flex; flex-wrap: wrap; gap: 8px; pointer-events: auto; align-items: center; }
        .map-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.12); background: #ffffff; color: #0F172A; }
        .map-badge.route { background: #0F172A; border-color: #0F172A; color: white; font-variant-numeric: tabular-nums; }
        .map-style-toggle { display: flex; background: #ffffff; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        .ms-btn { padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; border: none; background: transparent; color: #64748B; cursor: pointer; }
        .ms-btn.active { background: #0F172A; color: white; }
        .map-zoom-controls { display: flex; flex-direction: column; background: #ffffff; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        .mz-btn { width: 40px; height: 40px; border: none; background: transparent; color: #0F172A; font-size: 18px; font-weight: 600; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.08); }
        .mz-btn:last-child { border-bottom: none; }
        .mz-btn:hover { background: rgba(0,0,0,0.05); }
        .my-location-btn { pointer-events: auto; display: inline-flex; align-items: center; gap: 6px; background: #ffffff; color: #0F172A; border: 1px solid rgba(0,0,0,0.1); padding: 10px 14px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.12); align-self: flex-start; }
        .my-location-btn ion-icon { color: #FF6B35; font-size: 15px; }
        .my-location-btn:hover { background: #F8FAFC; }
      `}</style>
    </div>
  );
};

export default NavigoMap;
