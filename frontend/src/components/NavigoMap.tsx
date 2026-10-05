import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';
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
           <div class="nv-shadow"></div>
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
  const mapRef = React.useRef<L.Map | null>(null);

  const getValidCenter = (): [number, number] => {
    if (isValidLatLng(userLocation)) return [userLocation!.lat, userLocation!.lng];
    if (isValidLatLng({ lat: mapCenter[0], lng: mapCenter[1] })) return mapCenter;
    return [0.3476, 32.5825];
  };
  const center = getValidCenter();

  // Track zoom changes

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

  // Google Maps embed URL generator
  // t=m roadmap, t=k satellite, t=h hybrid, t=p terrain
  const getGoogleEmbedUrl = (
    c: [number, number],
    z: number,
    style: 'standard' | 'satellite'
  ) => {
    const typeParam = style === 'satellite' ? 'k' : 'm';
    return `https://maps.google.com/maps?q=${c[0].toFixed(5)},${c[1].toFixed(5)}&z=${z}&t=${typeParam}&output=embed&hl=en&iwloc=near`;
  };

  // Double-buffer iframes to eliminate white flash during zoom / pan / style changes
  const [activeBuffer, setActiveBuffer] = useState<0 | 1>(0);
  const [bufferUrls, setBufferUrls] = useState<[string, string]>(() => {
    const init = getGoogleEmbedUrl(center, mapZoom, mapStyle);
    return [init, init];
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingUpdateRef = React.useRef<{
    center: [number, number];
    zoom: number;
    style: 'standard' | 'satellite';
  } | null>(null);
  const updateTimerRef = React.useRef<any>(null);

  const scheduleBufferUpdate = (
    c: [number, number],
    z: number,
    s: 'standard' | 'satellite',
    delay = 320
  ) => {
    pendingUpdateRef.current = { center: c, zoom: z, style: s };
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);

    updateTimerRef.current = setTimeout(() => {
      if (!pendingUpdateRef.current) return;
      const { center: targetCenter, zoom: targetZoom, style: targetStyle } = pendingUpdateRef.current;
      const nextBuffer = activeBuffer === 0 ? 1 : 0;
      const nextUrl = getGoogleEmbedUrl(targetCenter, targetZoom, targetStyle);

      setBufferUrls((prev) => {
        const next: [string, string] = [...prev];
        next[nextBuffer] = nextUrl;
        return next;
      });
      setIsTransitioning(true);
    }, delay);
  };

  const handleBufferLoad = (bufferIndex: 0 | 1) => {
    if (bufferIndex !== activeBuffer && isTransitioning) {
      setActiveBuffer(bufferIndex);
      setIsTransitioning(false);
    }
  };

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
          scheduleBufferUpdate(ll, 16, mapStyle, 100);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(mapZoom + 1, 20);
    if (nextZoom === mapZoom) return;

    setMapZoom(nextZoom);

    // 2. Animate Leaflet overlay pins smoothly
    if (mapRef.current) {
      try {
        mapRef.current.setZoom(nextZoom, { animate: true });
      } catch { /* noop */ }
    }

    // 3. Update background buffer URL debounced
    scheduleBufferUpdate(center, nextZoom, mapStyle, 320);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(mapZoom - 1, 5);
    if (nextZoom === mapZoom) return;

    setMapZoom(nextZoom);

    // 2. Animate Leaflet overlay pins smoothly
    if (mapRef.current) {
      try {
        mapRef.current.setZoom(nextZoom, { animate: true });
      } catch { /* noop */ }
    }

    // 3. Update background buffer URL debounced
    scheduleBufferUpdate(center, nextZoom, mapStyle, 320);
  };

  const handleStyleChange = (newStyle: 'standard' | 'satellite') => {
    if (newStyle === mapStyle) return;
    setMapStyle(newStyle);
    scheduleBufferUpdate(center, mapZoom, newStyle, 50);
  };

  const getIframeStyle = (bufferIndex: 0 | 1): React.CSSProperties => {
    const isActive = bufferIndex === activeBuffer;
    return {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      border: 0,
      pointerEvents: 'none',
      zIndex: isActive ? 1 : 0,
      opacity: isActive ? 1 : 0,
      transformOrigin: 'center center',
      transition: isActive
        ? 'opacity 0.3s ease-in-out'
        : 'opacity 0.3s ease-in-out',
      willChange: 'opacity',
    };
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
      {/* DOUBLE-BUFFERED GOOGLE MAPS IFRAMES — Zero white flash on zoom, smooth animated scale */}
      <iframe
        src={bufferUrls[0]}
        style={getIframeStyle(0)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Google Maps Primary"
        onLoad={() => handleBufferLoad(0)}
      />
      <iframe
        src={bufferUrls[1]}
        style={getIframeStyle(1)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Google Maps Secondary"
        onLoad={() => handleBufferLoad(1)}
      />

      {loading && (
        <div className="map-overlay-state loading">
          <div className="map-state-card">
            <div className="map-spinner"></div>
            <p>Loading map layers...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="map-overlay-state error">
          <div className="map-state-card">
            <div className="map-error-icon">⚠️</div>
            <p>{error}</p>
            <button className="map-retry-btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}

      {/* LEAFLET OVERLAY — Transparent, only for markers, route polyline, and touch events */}
      <MapContainer
        center={center}
        zoom={mapZoom}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        style={{
          height: '100%',
          width: '100%',
          background: 'transparent',
          zIndex: 2,
        }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef as any}
      >
        <MapEvents
          onMapClick={onMapClick}
          userLocation={userLocation}
          followUser={followUser}
          onMove={(c, z) => {
            if (!isNaN(c[0]) && !isNaN(c[1])) {
              setMapCenter(c);
              scheduleBufferUpdate(c, z, mapStyle, 600);
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
          <div className="map-badge live"><span className="bdot"></span> LIVE GPS</div>
          <div className="map-badge rt">● REAL-TIME</div>
          <div className="map-style-toggle">
            <button className={`ms-btn ${mapStyle === 'standard' ? 'active' : ''}`} onClick={() => handleStyleChange('standard')}>STANDARD</button>
            <button className={`ms-btn ${mapStyle === 'satellite' ? 'active' : ''}`} onClick={() => handleStyleChange('satellite')}>SATELLITE</button>
          </div>
          {routeDistance > 0 && <div className="map-badge route">{routeDistance}km • {routeDuration}min</div>}
          {nearbyDrivers.length > 0 && <div className="map-badge drv">🚗 {nearbyDrivers.length} nearby</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <div className="map-zoom-controls">
            <button className="mz-btn" onClick={handleZoomIn}>+</button>
            <button className="mz-btn" onClick={handleZoomOut}>−</button>
          </div>
          <button className="my-location-btn" onClick={handleMyLocation}>📍 My Location</button>
        </div>
      </div>

      <div className="boda-safe-badge">🛡️ Boda Safe™ • 1km</div>

      <style>{`
        .navigo-map-root .leaflet-container { font-family: var(--font-body); background: transparent !important; }
        .navigo-map-root .leaflet-tile-pane { display: none; }
        .navigo-map-root .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 20px rgba(0,0,0,0.25) !important; border-radius: 14px !important; overflow: hidden; margin: 0 16px 24px 0 !important; }
        .navigo-map-root .leaflet-control-zoom a { background: rgba(15,23,42,0.92) !important; color: white !important; width: 44px !important; height: 44px !important; line-height: 44px !important; font-size: 20px !important; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
        .navigo-map-root .leaflet-control-zoom a:hover { background: #FF6B35 !important; }
        .np-wrap, .nd-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
        .np-dot { width: 18px; height: 18px; background: #FF6B35; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(255,107,53,0.5); z-index: 2; position: relative; }
        .nd-dot { width: 18px; height: 18px; background: #0F172A; border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 12px rgba(0,0,0,0.4); z-index: 2; position: relative; }
        .np-pulse { position: absolute; inset: 0; background: #FF6B35; border-radius: 50%; animation: npPulse 2s infinite; }
        @keyframes npPulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.8); opacity: 0; } }
        .nv-wrap { position: relative; width: 40px; height: 40px; perspective: 500px; }
        .nv-shadow {
          position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
          width: 24px; height: 8px; background: rgba(0,0,0,0.2);
          border-radius: 50%; filter: blur(2px); z-index: 1;
          animation: nvShadow 3s ease-in-out infinite;
        }
        .nv-body {
          width: 40px; height: 40px; background: white; border-radius: 50%; border: 3px solid;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35); z-index: 2; position: relative;
          animation: nvFloat 3s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .nv-body img {
          width: 70%; height: 70%; object-fit: contain;
          animation: nvTilt 3s ease-in-out infinite;
        }
        @keyframes nvTilt {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(5deg) scale(1.1); }
        }
        @keyframes nvFloat {
          0% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          25% { transform: translateY(-4px) rotateX(15deg) rotateY(5deg) rotateZ(2deg); }
          50% { transform: translateY(-8px) rotateX(0deg) rotateY(15deg) rotateZ(-2deg); }
          75% { transform: translateY(-4px) rotateX(-15deg) rotateY(5deg) rotateZ(2deg); }
          100% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
        }
        @keyframes nvShadow {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.3; }
          50% { transform: translateX(-50%) scale(0.7); opacity: 0.15; }
        }
        .ns-pin { width: 28px; height: 28px; background: #FF6B35; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.35); }
        .map-controls-top { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000; display: flex; justify-content: space-between; gap: 12px; pointer-events: none; }
        .map-controls-left { display: flex; flex-wrap: wrap; gap: 8px; pointer-events: auto; align-items: center; }
        .map-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 2px 10px rgba(0,0,0,0.12); background: rgba(255,255,255,0.95); color: #0F172A; }
        .map-badge.live { background: rgba(16,185,129,0.12); color: #059669; }
        .map-badge.rt { background: rgba(245,158,11,0.12); color: #D97706; }
        .map-badge.route { background: rgba(15,23,42,0.9); color: white; }
        .map-badge.drv { background: rgba(14,165,233,0.12); color: #0284C7; }
        .bdot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; animation: bdot 1.5s infinite; }
        @keyframes bdot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .map-style-toggle { display: flex; background: rgba(255,255,255,0.95); border: 1px solid rgba(0,0,0,0.08); border-radius: 9999px; padding: 3px; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
        .ms-btn { padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: none; background: transparent; color: #64748B; cursor: pointer; }
        .ms-btn.active { background: #FF6B35; color: white; }
        .map-zoom-controls { display: flex; flex-direction: column; background: rgba(255,255,255,0.95); border: 1px solid rgba(0,0,0,0.08); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .mz-btn { width: 44px; height: 44px; border: none; background: white; color: #0F172A; font-size: 20px; font-weight: 800; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .mz-btn:last-child { border-bottom: none; }
        .mz-btn:hover { background: #FF6B35; color: white; }
        .my-location-btn { pointer-events: auto; background: #FF6B35; color: white; border: none; padding: 10px 16px; border-radius: 12px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 4px 16px rgba(255,107,53,0.35); align-self: flex-start; }
        .boda-safe-badge { position: absolute; bottom: 20px; left: 16px; z-index: 1000; background: rgba(255,255,255,0.95); border: 1px solid rgba(255,107,53,0.2); color: #FF6B35; padding: 7px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
};

export default NavigoMap;
