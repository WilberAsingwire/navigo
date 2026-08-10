import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IonSpinner, IonBadge, IonChip } from '@ionic/react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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
  onMapClick?: (latlng: [number, number]) => void;
}

const NavigoMap: React.FC<MapProps> = React.memo(({
  userLocation, destination, driverLocation, driverType = 'car',
  height = '350px', interactive = true, showRoute = true,
  showControls = true, followUser = true, onDistanceChange, onMapClick
}) => {
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('dark');
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker | L.Circle | L.Polyline }>({});

  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [0.3476, 32.5825];

  const tileUrls: Record<string, { url: string; attribution: string }> = {
    standard: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri &mdash; Source: Esri' },
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Main Map Lifecycle
  useEffect(() => {
    if (!mapContainerRef.current || loading) return;

    // Ensure any existing instance is destroyed before initializing a new one
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Vanilla Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      attributionControl: true,
    }).setView(center, 15);

    mapInstanceRef.current = map;

    // Ensure map fills the container
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Additional check for grid layout shifts
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current!);

    // Add Tile Layer
    L.tileLayer(tileUrls[mapStyle].url, {

      attribution: tileUrls[mapStyle].attribution,
      maxZoom: 19,
    }).addTo(map);

    // Handle Map Clicks
    map.on('click', (e) => {
      if (onMapClick) onMapClick([e.latlng.lat, e.latlng.lng]);
    });

    // Custom Locate Button
    const locateControl = L.control({ position: 'topright' });
    locateControl.onAdd = function() {
      const btn = L.DomUtil.create('a', 'leaflet-control-locate');
      btn.innerHTML = '📍 My Location';
      btn.style.cssText = 'cursor:pointer; padding:8px 12px; background:#FF6B35; color:#fff; font-weight:bold; font-size:12px; border:none; text-decoration:none; border-radius:4px;';
      btn.onclick = () => {
        map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
      };
      return btn;
    };
    locateControl.addTo(map);

    // THE FINAL FIX: Explicit cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, mapStyle, interactive]); // Re-init on style change or loading state

  // Update Map View / Follow User
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && followUser && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, { animate: true, duration: 1.5 });
    }
  }, [userLocation, followUser]);

  // Manage Markers and Routing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers/layers
    Object.values(markersRef.current).forEach(layer => map.removeLayer(layer));
    markersRef.current = {};

    // User Marker
    if (userLocation) {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: pickIcon, draggable: interactive }).addTo(map).bindPopup('📍 You');
      const userCircle = L.circle([userLocation.lat, userLocation.lng], { radius: 8, color: '#2D6A4F', fillOpacity: 0.1 }).addTo(map);
      markersRef.current['user'] = userMarker;
      markersRef.current['userCircle'] = userCircle;
    }

    // Destination Marker
    if (destination) {
      const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon, draggable: interactive }).addTo(map).bindPopup('🎯 Destination');
      markersRef.current['dest'] = destMarker;
    }

    // Driver Marker
    if (driverLocation) {
      const dIcon = driverType === 'bike' ? bikeIcon : driverIcon;
      const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: dIcon }).addTo(map).bindPopup(`${driverType === 'bike' ? '🏍️' : '🚗'} Driver`);
      markersRef.current['driver'] = driverMarker;
    }

    // Routing
    if (showRoute && userLocation && destination) {
      const fetchRoute = async () => {
        try {
          const from = `${userLocation.lng},${userLocation.lat}`;
          const to = `${destination.lng},${destination.lat}`;
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes?.length > 0) {
            const route = data.routes[0];
            const points = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
            const polyline = L.polyline(points, { color: '#FF6B35', weight: 4, opacity: 0.7 }).addTo(map);
            markersRef.current['route'] = polyline;

            const d = Math.round(route.distance / 100) / 10;
            const t = Math.round(route.duration / 60);
            setRouteDistance(d); setRouteDuration(t);
            if (onDistanceChange) onDistanceChange(d, t);
          }
        } catch {
          const fallbackLine = L.polyline([[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]], { color: '#FF6B35', weight: 4, opacity: 0.7 }).addTo(map);
          markersRef.current['route'] = fallbackLine;
        }
      };
      fetchRoute();
    }
  }, [userLocation, destination, driverLocation, driverType, showRoute, interactive]);

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
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', border: '2px solid rgba(255,255,255,0.08)' }}
      >
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14' }}>
            <IonSpinner name="crescent" color="warning" />
          </div>
        )}
      </div>
    </div>
  );
});

export default NavigoMap;
