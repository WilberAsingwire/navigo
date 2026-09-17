import React, { useEffect, useState, useRef } from 'react';
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

// Fix Leaflet default icons for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

const createPulsingIcon = (color: string, emoji: string, size: number = 28) => {
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <div style="position:absolute;width:100%;height:100%;background:${color};border-radius:50%;animation:navigo-pulse 2s infinite;opacity:0.5;"></div>
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;z-index:1;">${emoji}</div>
           </div>
           <style>@keyframes navigo-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.2); opacity: 0; } }</style>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createVehicleIcon = (imageUrl: string, color: string, size: number = 38) => {
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <div style="position:absolute;width:100%;height:100%;background:${color};border-radius:50%;animation:navigo-pulse 2s infinite;opacity:0.3;"></div>
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:white;border-radius:50%;border:2px solid ${color};box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:1;overflow:hidden;">
              <img src="${imageUrl}" style="width:72%;height:72%;object-fit:contain;" />
            </div>
          </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const pickIcon = createPulsingIcon('#FF6B35', '📍', 32);
const destIcon = createPulsingIcon('#0F172A', '🎯', 34);
const poiIcon = (emoji: string) => L.divIcon({
  html: `<div style="background:#121824; border:1px solid rgba(255,255,255,0.18); border-radius:50%; width:28px; height:28px; display:flex; align-items:center;justify-content:center; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.4);">${emoji}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaNew, color: '#FF6B35' },
  go: { url: goNew, color: '#0EA5E9' },
  comfort: { url: comfortNew, color: '#0F172A' },
  xl: { url: xlNew, color: '#6366F1' },
  economy: { url: goNew, color: '#0EA5E9' },
};

interface MapProps {
  userLocation: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  driverType?: 'boda' | 'go' | 'comfort' | 'xl' | string;
  height?: string;
  interactive?: boolean;
  showRoute?: boolean;
  showControls?: boolean;
  followUser?: boolean;
  searchResults?: { lat: number; lng: number; name?: string; address?: string }[];
  onDistanceChange?: (distance: number, duration: number) => void;
  onMapClick?: (latlng: [number, number]) => void;
}

const NavigoMap: React.FC<MapProps> = React.memo(({
  userLocation, destination, driverLocation, driverType = 'go',
  height = '350px', interactive = true, showRoute = true,
  showControls = true, followUser = true, searchResults = [],
  onDistanceChange, onMapClick
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [tilesError, setTilesError] = useState(false);
  const [tileProvider, setTileProvider] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker | L.Polyline | L.Circle }>({});
  const poiMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const animationRef = useRef<number | null>(null);

  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825]; // Kampala

  // Premium tile providers - Carto is most reliable, OSM as fallback
  const getTileConfig = () => {
    const isDark = theme === 'dark';
    
    const providers = [
      // Primary: CartoDB - most reliable CDN, premium look
      {
        standard: {
          url: isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
        },
        satellite: {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; Source: Esri',
          subdomains: '',
        }
      },
      // Fallback 1: OSM direct
      {
        standard: {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: 'abc',
        },
        satellite: {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri',
          subdomains: '',
        }
      },
      // Fallback 2: Stadia Maps (no API key for light usage)
      {
        standard: {
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth{retina}/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenMapTiles &copy; OSM',
          subdomains: '',
        },
        satellite: {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri',
          subdomains: '',
        }
      }
    ];
    
    return providers[Math.min(tileProvider, providers.length - 1)];
  };

  const animateMarker = (marker: L.Marker, startPos: [number, number], endPos: [number, number], duration = 1000) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * ease;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * ease;
      marker.setLatLng([currentLat, currentLng]);
      if (progress < 1) animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || loading) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: true,
      preferCanvas: false,
    }).setView(center, 15);

    mapInstanceRef.current = map;

    (L.control as any).zoom({ position: 'bottomright' }).addTo(map);

    // Custom locate control
    const locateControl = (L.control as any)({ position: 'topright' });
    locateControl.onAdd = function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const btn = L.DomUtil.create('a', '', container);
      btn.innerHTML = '📍 My Location';
      btn.href = '#';
      btn.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 14px;background:#FF6B35;color:#fff;font-weight:700;font-size:12px;border-radius:8px;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;';
      L.DomEvent.on(btn, 'click', (e: any) => {
        L.DomEvent.stop(e);
        map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
      });
      return container;
    };
    locateControl.addTo(map);

    map.on('click', (e) => {
      if (onMapClick) onMapClick([e.latlng.lat, e.latlng.lng]);
    });

    // Aggressive invalidateSize to fix 0-height issues
    const invalidate = () => map.invalidateSize();
    setTimeout(invalidate, 100);
    setTimeout(invalidate, 300);
    setTimeout(invalidate, 600);
    setTimeout(invalidate, 1200);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    if (mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      // Don't remove map here, keep instance for style switches
    };
  }, [loading, interactive]);

  // Tile layer management - with fallback
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || loading) return;

    // Remove old tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const config = getTileConfig();
    const currentTileConfig = config[mapStyle];
    
    let errorCount = 0;
    const tileLayer = L.tileLayer(currentTileConfig.url, {
      attribution: currentTileConfig.attribution,
      subdomains: currentTileConfig.subdomains as any,
      maxZoom: 20,
      maxNativeZoom: 19,
      minZoom: 3,
      tileSize: 256,
      zoomOffset: 0,
      crossOrigin: true,
      detectRetina: true,
    } as any);

    tileLayer.on('tileload', () => {
      setTilesError(false);
      errorCount = 0;
    });

    tileLayer.on('tileerror', (e: any) => {
      errorCount++;
      console.warn(`Map tile error ${errorCount}:`, e?.tile?.src || 'unknown');
      if (errorCount >= 6) {
        // Try next provider
        if (tileProvider < 2) {
          console.log(`Switching to fallback tile provider ${tileProvider + 1}`);
          setTileProvider(p => p + 1);
        } else {
          setTilesError(true);
        }
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Satellite labels
    if (mapStyle === 'satellite') {
      const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
        maxNativeZoom: 19,
        pane: 'overlayPane',
      } as any);
      labels.addTo(map);
    }

    // Force refresh after adding tiles
    setTimeout(() => map.invalidateSize(), 100);

  }, [loading, mapStyle, tileProvider, theme]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && followUser && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, { animate: true, duration: 1.2 });
    }
  }, [userLocation, followUser]);

  // Markers & Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (!markersRef.current['user']) {
        markersRef.current['user'] = L.marker([userLocation.lat, userLocation.lng], { icon: pickIcon, draggable: interactive }).addTo(map).bindPopup('📍 You');
        markersRef.current['userCircle'] = L.circle([userLocation.lat, userLocation.lng], { radius: 12, color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.12, weight: 1 }).addTo(map);
      } else {
        const marker = markersRef.current['user'] as L.Marker;
        const circle = markersRef.current['userCircle'] as L.Circle;
        const oldPos = marker.getLatLng();
        if (Math.abs(oldPos.lat - userLocation.lat) > 0.00005 || Math.abs(oldPos.lng - userLocation.lng) > 0.00005) {
          animateMarker(marker, [oldPos.lat, oldPos.lng], [userLocation.lat, userLocation.lng], 800);
        }
        circle.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }

    if (destination) {
      if (!markersRef.current['dest']) {
        markersRef.current['dest'] = L.marker([destination.lat, destination.lng], { icon: destIcon, draggable: interactive }).addTo(map).bindPopup('🎯 Destination');
      } else {
        (markersRef.current['dest'] as L.Marker).setLatLng([destination.lat, destination.lng]);
      }
    } else if (markersRef.current['dest']) {
      map.removeLayer(markersRef.current['dest']);
      delete markersRef.current['dest'];
    }

    if (driverLocation) {
      const vehicleCfg = VEHICLE_ICONS[driverType] || VEHICLE_ICONS['go'];
      const dIcon = createVehicleIcon(vehicleCfg.url, vehicleCfg.color);
      if (!markersRef.current['driver']) {
        markersRef.current['driver'] = L.marker([driverLocation.lat, driverLocation.lng], { icon: dIcon }).addTo(map).bindPopup(`${driverType.toUpperCase()} Driver`);
      } else {
        const marker = markersRef.current['driver'] as L.Marker;
        const oldPos = marker.getLatLng();
        if (oldPos.lat !== driverLocation.lat || oldPos.lng !== driverLocation.lng) {
          animateMarker(marker, [oldPos.lat, oldPos.lng], [driverLocation.lat, driverLocation.lng], 1200);
        }
      }
    } else if (markersRef.current['driver']) {
      map.removeLayer(markersRef.current['driver']);
      delete markersRef.current['driver'];
    }

    if (showRoute && userLocation && destination) {
      const fetchRoute = async () => {
        try {
          const from = `${userLocation.lng},${userLocation.lat}`;
          const to = `${destination.lng},${destination.lat}`;
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) });
          const data = await res.json();
          if (data.routes?.length > 0) {
            const route = data.routes[0];
            const points = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
            if (!markersRef.current['route']) {
              markersRef.current['route'] = L.polyline(points, { color: '#FF6B35', weight: 5, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }).addTo(map);
            } else {
              (markersRef.current['route'] as L.Polyline).setLatLngs(points);
            }
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
            const d = Math.round(route.distance / 100) / 10;
            const t = Math.round(route.duration / 60);
            setRouteDistance(d); setRouteDuration(t);
            if (onDistanceChange) onDistanceChange(d, t);
            return;
          }
          throw new Error('No route');
        } catch {
          if (markersRef.current['route']) {
            map.removeLayer(markersRef.current['route'] as any);
            delete markersRef.current['route'];
          }
          const fallbackLine = L.polyline([[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]], { color: '#FF6B35', weight: 4, opacity: 0.6, dashArray: '10 10' }).addTo(map);
          markersRef.current['route'] = fallbackLine;
          const d = Math.round(map.distance([userLocation.lat, userLocation.lng], [destination.lat, destination.lng]) / 100) / 10;
          const t = Math.max(1, Math.round((d / 22) * 60));
          setRouteDistance(d); setRouteDuration(t);
          if (onDistanceChange) onDistanceChange(d, t);
        }
      };
      fetchRoute();
    } else if (markersRef.current['route']) {
      map.removeLayer(markersRef.current['route']);
      delete markersRef.current['route'];
    }
  }, [userLocation, destination, driverLocation, driverType, showRoute, interactive]);

  // Search results
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const prev = (mapInstanceRef.current as any)?._searchMarkers || [];
    prev.forEach((m: L.Marker) => { if (map && m) map.removeLayer(m); });
    const tempMarkers: L.Marker[] = [];
    searchResults.forEach((r, idx) => {
      const marker = L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          html: `<div style="background:#FF6B35; border:2px solid white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:white; box-shadow:0 3px 10px rgba(0,0,0,0.35);">${idx + 1}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        })
      }).addTo(map).bindPopup(`<b>${r.name || r.address || 'Location'}</b>`);
      tempMarkers.push(marker);
    });
    (mapInstanceRef.current as any)._searchMarkers = tempMarkers;
    return () => { tempMarkers.forEach((m) => { if (map && m) map.removeLayer(m); }); };
  }, [searchResults]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: theme === 'dark' ? '#080C14' : '#F8FAFC' }}>
      {showControls && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '0 4px', position: 'absolute', top: 12, left: 12, zIndex: 1000 }}>
          <IonBadge color="success" style={{ fontSize: 10, padding: '4px 10px', borderRadius: 9999, fontWeight: 800 }}>● LIVE GPS</IonBadge>
          <IonBadge color="warning" style={{ fontSize: 10, padding: '4px 10px', borderRadius: 9999, fontWeight: 800 }}>● REAL-TIME</IonBadge>
          <IonChip outline={mapStyle !== 'standard'} color={mapStyle === 'standard' ? 'warning' : 'medium'}
            onClick={() => setMapStyle('standard')} style={{ fontSize: 11, cursor: 'pointer', '--background': mapStyle === 'standard' ? 'rgba(255,107,53,0.15)' : 'rgba(18,24,36,0.8)', height: 28 }}>
            🗺️ STANDARD
          </IonChip>
          <IonChip outline={mapStyle !== 'satellite'} color={mapStyle === 'satellite' ? 'warning' : 'medium'}
            onClick={() => setMapStyle('satellite')} style={{ fontSize: 11, cursor: 'pointer', '--background': mapStyle === 'satellite' ? 'rgba(255,107,53,0.15)' : 'rgba(18,24,36,0.8)', height: 28 }}>
            🛰️ SATELLITE
          </IonChip>
          {userLocation && destination && routeDistance > 0 && (
            <IonBadge color="dark" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999 }}>{routeDistance}km • {routeDuration}min</IonBadge>
          )}
        </div>
      )}
      
      <div
        ref={mapContainerRef}
        style={{
          height: height === '100%' ? '100%' : height,
          minHeight: height === '100%' ? '100vh' : height,
          width: '100%',
          borderRadius: showControls ? 0 : 16,
          overflow: 'hidden',
          position: 'relative',
          background: theme === 'dark' 
            ? 'radial-gradient(120% 90% at 50% 0%, #101a2c 0%, #0a101c 55%, #070b12 100%)'
            : 'radial-gradient(120% 90% at 50% 0%, #f1f5f9 0%, #e2e8f0 55%, #cbd5e1 100%)',
        }}
      >
        {tilesError && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 900, background: 'rgba(13,19,31,0.95)', border: '1px solid rgba(255,107,53,0.4)', borderRadius: 9999, padding: '8px 16px', fontSize: 12, color: '#F5F7FA', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <span>🗺️</span> Map tiles slow — retrying...
            <button onClick={() => { setTileProvider(0); setTilesError(false); }} style={{ background: '#FF6B35', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        )}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', background: theme === 'dark' ? 'radial-gradient(120% 90% at 50% 0%, #101a2c 0%, #0a101c 60%, #070b12 100%)' : '#F8FAFC' }}>
            <IonSpinner name="crescent" color="warning" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 12, color: '#94A3B8', letterSpacing: 1, fontWeight: 700 }}>LOADING MAP</span>
          </div>
        )}
      </div>

      <style>{`
        .leaflet-container { background: transparent !important; font-family: var(--font-body); }
        .leaflet-tile-pane { filter: ${theme === 'dark' ? 'brightness(0.92) contrast(1.05) saturate(1.1)' : 'none'}; }
        .leaflet-control-attribution { background: rgba(8,12,20,0.75) !important; color: #94A3B8 !important; font-size: 10px !important; border-radius: 6px 0 0 0; backdrop-filter: blur(8px); }
        .leaflet-control-attribution a { color: #FF6B35 !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important; border-radius: 12px !important; overflow: hidden; }
        .leaflet-control-zoom a { background: rgba(18,24,36,0.9) !important; color: white !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 16px !important; }
        .leaflet-control-zoom a:hover { background: rgba(255,107,53,0.9) !important; }
        body.light .leaflet-control-zoom a { background: rgba(255,255,255,0.95) !important; color: #0F172A !important; border-bottom: 1px solid rgba(0,0,0,0.06) !important; }
      `}</style>
    </div>
  );
});

export default NavigoMap;
