import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { IonSpinner, IonBadge, IonChip } from '@ionic/react';
import api from '../services/api';
import bodaImg from '../assets/vehicles/boda.png';
import goImg from '../assets/vehicles/go.png';
import comfortImg from '../assets/vehicles/comfort.png';
import xlImg from '../assets/vehicles/xl.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

const createPulsingIcon = (color: string, emoji: string, size: number = 28) => {
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <div style="position:absolute;width:100%;height:100%;background:${color};border-radius:50%;animation:pulse 2s infinite;opacity:0.6;"></div>
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;z-index:1;">${emoji}</div>
           </div>
           <style>
            @keyframes pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2); opacity: 0; } }
           </style>
          `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createVehicleIcon = (imageUrl: string, color: string, size: number = 32) => {
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <div style="position:absolute;width:100%;height:100%;background:${color};border-radius:50%;animation:pulse 2s infinite;opacity:0.3;"></div>
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1;overflow:hidden;">
              <img src="${imageUrl}" style="width:70%; height:70%; object-fit:contain; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));" />
            </div>
          </div>
          <style>
            @keyframes pulse { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(2); opacity: 0; } }
          </style>
        `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const pickIcon = createPulsingIcon('#2D6A4F', '📍', 30);
const destIcon = createPulsingIcon('#E85D75', '🎯', 32);
const poiIcon = (emoji: string) => L.divIcon({
  html: `<div style="background:#121824; border:1px solid rgba(255,255,255,0.2); border-radius:50%; width:24px; height:24px; display:flex; align-items:center;justify-content:center; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.5);">${emoji}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const VEHICLE_ICONS: Record<string, { url: string; color: string }> = {
  boda: { url: bodaImg, color: '#ffab40' },
  go: { url: goImg, color: '#4285F4' },
  comfort: { url: comfortImg, color: '#4CAF50' },
  xl: { url: xlImg, color: '#2196F3' },
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
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [tilesHealthy, setTilesHealthy] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker | L.Polyline | L.Circle }>({});
  const poiMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const animationRef = useRef<number | null>(null);
  const poiFetchTimeoutRef = useRef<any>(null);

  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  const tileUrls: Record<string, { url: string; attribution: string }> = {
    standard: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri &mdash; Source: Esri' },
  };

  // --- Smooth Movement Logic ---
  const animateMarker = (marker: L.Marker, startPos: [number, number], endPos: [number, number], duration = 1000) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * ease;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * ease;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  };

  const fetchNearbyPOIs = async (map: L.Map, radius: number, isPriority: boolean = true) => {
    const center = map.getCenter();

    if (isPriority) {
      console.log(`🚀 Priority Fetch: POIs around ${center.lat}, ${center.lng} (Radius: ${radius}m)`);
    } else {
      console.log(`☁️ Background Fetch: POIs around ${center.lat}, ${center.lng} (Radius: ${radius}m)`);
    }

    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["amenity"](around:${radius},${center.lat},${center.lng});
        way["amenity"](around:${radius},${center.lat},${center.lng});
        relation["amenity"](around:${radius},${center.lat},${center.lng});
        node["shop"](around:${radius},${center.lat},${center.lng});
        way["shop"](around:${radius},${center.lat},${center.lng});
        relation["shop"](around:${radius},${center.lat},${center.lng});
        node["office"](around:${radius},${center.lat},${center.lng});
        way["office"](around:${radius},${center.lat},${center.lng});
        node["leisure"](around:${radius},${center.lat},${center.lng});
        way["leisure"](around:${radius},${center.lat},${center.lng});
        node["tourism"](around:${radius},${center.lat},${center.lng});
        way["tourism"](around:${radius},${center.lat},${center.lng});
        node["building"](around:${radius},${center.lat},${center.lng});
        way["building"](around:${radius},${center.lat},${center.lng});
        node["place"](around:${radius},${center.lat},${center.lng});
        way["place"](around:${radius},${center.lat},${center.lng});
      );
      out center;
    `;

    const queryUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    try {
      const res = await fetch(queryUrl, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();

      if (isPriority) {
        // For priority loads, we clear existing POIs to keep the map clean
        Object.values(poiMarkersRef.current).forEach(m => map.removeLayer(m));
        poiMarkersRef.current = {};
      }

      const poiEmojiMap: Record<string, string> = {
        restaurant: '🍴', cafe: '☕', bar: '🍺', pub: '🍻', fast_food: '🍔',
        police: '👮', bank: '🏦', atm: '🏧', hospital: '🏥', pharmacy: '💊',
        school: '🎓', university: '🎓', college: '🎓', library: '📚',
        supermarket: '🛒', grocery: '🛒', market: '🛒', mall: '🛍️', shop: '🏪',
        office: '🏢', government: '🏛️', post_office: '📮', townhall: '🏛️',
        park: '🌳', garden: '🌷', playground: '🎡', stadium: '⚽', sports_centre: '🏋️',
        hotel: '🏨', hostel: '🏠', guest_house: '🏡', motel: '🏨',
        museum: '🏛️', art_gallery: '🎨', cinema: '🎬', theatre: '🎭',
        church: '⛪', mosque: '🕌', temple: '🕉️',
        bus_station: '🚌', taxi: '🚕', train_station: '🚂', airport: '✈️',
        fuel: '⛽', parking: '🅿️', charging_station: '⚡',
        default: '📍'
      };

      if (data.elements && data.elements.length > 0) {
        data.elements.forEach((element: any) => {
          // Avoid duplicate markers
          if (poiMarkersRef.current[element.id]) return;

          const tags = element.tags || {};
          const amenity = tags.amenity || tags.shop || tags.office || tags.leisure || tags.tourism || tags.building || tags.place || 'other';
          const name = tags.name || tags.operator || 'Unnamed Spot';
          const emoji = poiEmojiMap[amenity] || poiEmojiMap.default || '📍';

          const lat = element.lat || element.center?.lat;
          const lon = element.lon || element.center?.lon;
          if (!lat || !lon) return;

          const marker = L.marker([lat, lon], { icon: poiIcon(emoji) })
            .addTo(map)
            .bindPopup(`<b>${emoji} ${name}</b><br/>${amenity}`);

          poiMarkersRef.current[element.id] = marker;
        });
      }
    } catch (e) {
      console.error('❌ POI Fetch Error (Overpass):', e);
    }
  };

  const loadPOIsInRings = async (map: L.Map) => {
    // Ring 1: Immediate (1km) - High Priority
    await fetchNearbyPOIs(map, 1000, true);

    // Ring 2: Local (5km) - Background
    setTimeout(() => fetchNearbyPOIs(map, 5000, false), 1000);

    // Ring 3: Regional (25km) - Background
    setTimeout(() => fetchNearbyPOIs(map, 25000, false), 3000);
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || loading) return;

    // ONLY initialize the map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // We'll add it manually to control position
        dragging: interactive,
        scrollWheelZoom: interactive,
        touchZoom: interactive,
        attributionControl: true,
      }).setView(center, 15);

      mapInstanceRef.current = map;

      // MOVE ZOOM CONTROL TO BOTTOM RIGHT
      (L.control as any).zoom({ position: 'bottomright' }).addTo(map);

      const locateControl = (L.control as any)({ position: 'topright' });
      locateControl.onAdd = function() {
        const btn = L.DomUtil.create('a', 'leaflet-control-locate');
        btn.innerHTML = '📍 My Location';
        btn.style.cssText = 'cursor:pointer; padding:8px 12px; background:#4285F4; color:#fff; font-weight:bold; font-size:12px; border:none; text-decoration:none; border-radius:4px;';
        btn.onclick = () => {
          map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
        };
        return btn;
      };
      locateControl.addTo(map);

      // POI Auto-Discovery: Fetch nearby businesses whenever the map moves or zooms
      map.on('moveend', () => {
        if (poiFetchTimeoutRef.current) clearTimeout(poiFetchTimeoutRef.current);
        poiFetchTimeoutRef.current = setTimeout(() => loadPOIsInRings(map), 1500);
      });

      map.on('click', (e) => {
        if (onMapClick) onMapClick([e.latlng.lat, e.latlng.lng]);
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current!);
    }

    const map = mapInstanceRef.current;
    console.log(`Updating map style to: ${mapStyle}, URL: ${tileUrls[mapStyle].url}`);

    // UPDATE TILE LAYER WITHOUT RECREATING MAP
    // Remove existing tile layers first
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileErrors = { count: 0 };
    const tileLayer = L.tileLayer(tileUrls[mapStyle].url, {
      attribution: tileUrls[mapStyle].attribution,
      maxZoom: mapStyle === 'satellite' ? 22 : 22,
      maxNativeZoom: mapStyle === 'satellite' ? 18 : 19,
    });
    tileLayer.on('tileload', () => { setTilesHealthy(true); console.log('Tile loaded successfully'); });
    tileLayer.on('tileerror', () => {
      console.error('Tile load failed');
      tileErrors.count += 1;
      if (tileErrors.count >= 3) setTilesHealthy(false);
    });
    tileLayer.addTo(map);
    // If tiles never arrive (offline / CDN blocked), surface a friendly state
    const fallbackTimer = setTimeout(() => {
      if (tileErrors.count >= 3) setTilesHealthy(false);
    }, 6000);

    if (mapStyle === 'satellite') {
      // Add a high-contrast labels layer on top of satellite imagery
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 22,
        maxNativeZoom: 19,
        zIndex: 10,
      }).addTo(map);
    }

    return () => clearTimeout(fallbackTimer);
  }, [loading, mapStyle, interactive]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && followUser && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, { animate: true, duration: 1.5 });
    }
  }, [userLocation, followUser]);

  // --- Marker & Route Sync ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. User Location Marker
    if (userLocation) {
      if (!markersRef.current['user']) {
        markersRef.current['user'] = L.marker([userLocation.lat, userLocation.lng], { icon: pickIcon, draggable: interactive }).addTo(map).bindPopup('📍 You');
        markersRef.current['userCircle'] = L.circle([userLocation.lat, userLocation.lng], { radius: 8, color: '#2D6A4F', fillOpacity: 0.1 }).addTo(map);
      } else {
        const marker = markersRef.current['user'] as L.Marker;
        const circle = markersRef.current['userCircle'] as L.Circle;

        // Smoothly move user marker if it's a significant jump
        const oldPos = marker.getLatLng();
        if (Math.abs(oldPos.lat - userLocation.lat) > 0.0001 || Math.abs(oldPos.lng - userLocation.lng) > 0.0001) {
          animateMarker(marker, [oldPos.lat, oldPos.lng], [userLocation.lat, userLocation.lng], 800);
        }
        circle.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }

    // 2. Destination Marker
    if (destination) {
      if (!markersRef.current['dest']) {
        markersRef.current['dest'] = L.marker([destination.lat, destination.lng], { icon: destIcon, draggable: interactive }).addTo(map).bindPopup('🎯 Destination');
      } else {
        const marker = markersRef.current['dest'] as L.Marker;
        marker.setLatLng([destination.lat, destination.lng]);
      }
    } else if (markersRef.current['dest']) {
      map.removeLayer(markersRef.current['dest']);
      delete markersRef.current['dest'];
    }

    // 3. Driver Marker (with Smooth Motion)
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

    // 4. Route Visualization & FitBounds
    if (showRoute && userLocation && destination) {
      const fetchRoute = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const from = `${userLocation.lng},${userLocation.lat}`;
          const to = `${destination.lng},${destination.lat}`;
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { signal: controller.signal });
          const data = await res.json();
          if (data.routes?.length > 0) {
            const route = data.routes[0];
            const points = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);

            if (!markersRef.current['route']) {
              markersRef.current['route'] = L.polyline(points, { color: '#4285F4', weight: 5, opacity: 0.8, lineJoin: 'round' }).addTo(map);
            } else {
              (markersRef.current['route'] as L.Polyline).setLatLngs(points);
            }

            // FIT BOUNDS: Ensure both points and route are visible
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });

            const d = Math.round(route.distance / 100) / 10;
            const t = Math.round(route.duration / 60);
            setRouteDistance(d); setRouteDuration(t);
            if (onDistanceChange) onDistanceChange(d, t);
            return;
          }
          throw new Error('No route found');
        } catch {
          // Route server unavailable — draw a straight line and still report
          // an (approximate) distance so fares keep working.
          if (markersRef.current['route']) {
            map.removeLayer(markersRef.current['route'] as any);
            delete markersRef.current['route'];
          }
          const fallbackLine = L.polyline([[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]], { color: '#4285F4', weight: 5, opacity: 0.8 }).addTo(map);
          markersRef.current['route'] = fallbackLine;
          const d = Math.round(map.distance([userLocation.lat, userLocation.lng], [destination.lat, destination.lng]) / 100) / 10;
          const t = Math.max(1, Math.round((d / 22) * 60));
          setRouteDistance(d); setRouteDuration(t);
          if (onDistanceChange) onDistanceChange(d, t);
        } finally {
          clearTimeout(timeout);
        }
      };
      fetchRoute();
    } else if (markersRef.current['route']) {
      map.removeLayer(markersRef.current['route']);
      delete markersRef.current['route'];
    }
  }, [userLocation, destination, driverLocation, driverType, showRoute, interactive]);

  // --- Search Results Markers — every search shown on the map ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // Clear previous temporary search markers
    const prevSearchMarkers = (mapInstanceRef.current as any)?._searchMarkers || [];
    prevSearchMarkers.forEach((m: L.Marker) => { if (map && m) map.removeLayer(m); });

    const tempMarkers: L.Marker[] = [];
    searchResults.forEach((r, idx) => {
      const marker = L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          html: `<div style="background:#FF6B35; border:2px solid white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:10px; box-shadow:0 2px 6px rgba(0,0,0,0.5);">${idx + 1}</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        })
      }).addTo(map).bindPopup(`<b>🔍 Search Result ${idx + 1}</b><br/>${r.name || r.address || 'Location'}`);
      tempMarkers.push(marker);
    });
    (mapInstanceRef.current as any)._searchMarkers = tempMarkers;
    return () => {
      tempMarkers.forEach((m) => { if (map && m) map.removeLayer(m); });
    };
  }, [searchResults]);

  const openInGoogleMaps = () => {
    if (userLocation && destination) window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}`, '_blank');
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {showControls && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center', padding: '0 4px', position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
          <IonBadge color="success" style={{ fontSize: 9, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>● LIVE GPS</IonBadge>
          <IonBadge color="warning" style={{ fontSize: 9, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>● REAL-TIME ROUTE</IonBadge>
          {Object.keys(tileUrls).map(style => (
            <IonChip key={style} outline={mapStyle !== style} color={mapStyle === style ? 'warning' : 'medium'}
              onClick={() => setMapStyle(style as any)} style={{ fontSize: 10, cursor: 'pointer', padding: '2px 8px', textTransform: 'uppercase' }}>
              {style === 'standard' ? '🗺️' : style === 'dark' ? '🌙' : '🛰️'} {style}
            </IonChip>
          ))}
          {userLocation && destination && (
            <>
              <IonChip outline color="primary" onClick={openInGoogleMaps} style={{ fontSize: 10, cursor: 'pointer' }}>📍 Navigate</IonChip>
              {routeDistance > 0 && <IonBadge color="warning" style={{ fontSize: 10 }}>{routeDistance}km • {routeDuration}min (Real OSRM)</IonBadge>}
            </>
          )}
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{
          height: height === '100%' ? '100%' : height,
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
          border: '2px solid rgba(255,255,255,0.08)',
          /* Branded backdrop — the map area is never an empty black void */
          background: 'radial-gradient(120% 90% at 50% 0%, #101a2c 0%, #0a101c 55%, #070b12 100%)',
        }}
      >
        {!tilesHealthy && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 900, background: 'rgba(13,19,31,0.92)', border: '1px solid rgba(255,107,53,0.35)', borderRadius: 9999, padding: '6px 14px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>
            🗺️ Map tiles unavailable — locations still work
          </div>
        )}
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(120% 90% at 50% 0%, #101a2c 0%, #0a101c 60%, #070b12 100%)' }}>
            <IonSpinner name="crescent" color="warning" />
            <span style={{ fontSize: 11, color: '#64748B', letterSpacing: 1 }}>LOADING MAP</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default NavigoMap;
