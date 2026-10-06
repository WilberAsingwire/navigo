import axios from 'axios';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
  provider: string;
}

export interface PlaceResult extends MapPoint {
  name: string;
  address: string;
  type?: string;
  source?: string;
}

export const UGANDA_BOUNDS = {
  minLat: -1.6,
  maxLat: 4.3,
  minLng: 29.4,
  maxLng: 35.2,
};

export const isUgandaPoint = (point: MapPoint): boolean =>
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) &&
  point.lat >= UGANDA_BOUNDS.minLat &&
  point.lat <= UGANDA_BOUNDS.maxLat &&
  point.lng >= UGANDA_BOUNDS.minLng &&
  point.lng <= UGANDA_BOUNDS.maxLng;

const ROUTER_PRIMARY = (process.env.ROUTING_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const ROUTER_SECONDARY = (process.env.ROUTING_URL_FALLBACK || '').replace(/\/$/, '');

const geoCache = new Map<string, { expires: number; value: any }>();
const CACHE_TTL_MS = 60_000;
const MAX_CACHE = 200;

const cacheGet = <T>(key: string): T | null => {
  const hit = geoCache.get(key);
  if (!hit || hit.expires <= Date.now()) {
    if (hit) geoCache.delete(key);
    return null;
  }
  return hit.value as T;
};

const cacheSet = (key: string, value: any) => {
  if (geoCache.size >= MAX_CACHE) {
    const oldest = geoCache.keys().next().value;
    if (oldest) geoCache.delete(oldest);
  }
  geoCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
};

const normaliseText = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');

const withinUganda = (lat: number, lng: number) =>
  lat >= UGANDA_BOUNDS.minLat &&
  lat <= UGANDA_BOUNDS.maxLat &&
  lng >= UGANDA_BOUNDS.minLng &&
  lng <= UGANDA_BOUNDS.maxLng;

const routeWithProvider = async (baseUrl: string, from: MapPoint, to: MapPoint): Promise<RouteResult> => {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const response = await axios.get(
    `${baseUrl}/route/v1/driving/${coords}`,
    {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: false,
        alternatives: false,
      },
      timeout: 12_000,
    },
  );

  const data = response.data;
  if (data?.code !== 'Ok' || !Array.isArray(data.routes) || !data.routes.length) {
    throw new Error(data?.message || data?.code || 'No route found');
  }

  const route = data.routes[0];
  const rawCoordinates = route?.geometry?.coordinates;
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 2) {
    throw new Error('Routing provider returned no usable geometry');
  }

  const geometry = rawCoordinates
    .map((c: any) => [Number(c?.[1]), Number(c?.[0])] as [number, number])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && withinUganda(lat, lng));

  if (geometry.length < 2) {
    throw new Error('Route geometry fell outside Uganda bounds');
  }

  return {
    distanceKm: Math.round((Number(route.distance) / 1000) * 1000) / 1000,
    durationMin: Math.max(1, Math.round(Number(route.duration) / 60)),
    geometry,
    provider: baseUrl,
  };
};

export const getDrivingRoute = async (from: MapPoint, to: MapPoint): Promise<RouteResult> => {
  if (!isUgandaPoint(from) || !isUgandaPoint(to)) {
    throw new Error('Both route points must be within Uganda');
  }

  const key = `route:${from.lat.toFixed(5)},${from.lng.toFixed(5)}:${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
  const cached = cacheGet<RouteResult>(key);
  if (cached) return cached;

  let lastError: any = null;
  for (const provider of [ROUTER_PRIMARY, ROUTER_SECONDARY].filter(Boolean)) {
    try {
      const result = await routeWithProvider(provider, from, to);
      cacheSet(key, result);
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Routing provider failed (${provider}): ${error?.message || error}`);
    }
  }

  throw new Error(lastError?.message || 'Routing service unavailable');
};

const toPhotonPlace = (feature: any): PlaceResult | null => {
  const [lng, lat] = feature?.geometry?.coordinates || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !withinUganda(lat, lng)) return null;

  const p = feature?.properties || {};
  const countryCode = String(p.countrycode || p.country_code || '').toLowerCase();
  if (countryCode && countryCode !== 'ug') return null;

  const name = normaliseText(p.name || p.street || p.city || p.county || p.state || 'Selected place');
  const locality = [p.district, p.city, p.county, p.state, p.country]
    .map(normaliseText)
    .filter(Boolean);
  const address = normaliseText([name, ...locality].filter((v, i, arr) => arr.indexOf(v) === i).join(', '));

  return {
    lat,
    lng,
    name,
    address,
    type: normaliseText(p.type || p.osm_value || p.osm_key) || undefined,
    source: 'photon',
  };
};

const toNominatimPlace = (item: any): PlaceResult | null => {
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !withinUganda(lat, lng)) return null;

  return {
    lat,
    lng,
    name: normaliseText(item?.name || item?.display_name?.split(',')?.[0] || 'Selected place'),
    address: normaliseText(item?.display_name || 'Selected place'),
    type: normaliseText(item?.type || item?.class) || undefined,
    source: 'nominatim',
  };
};

const dedupePlaces = (items: PlaceResult[], limit: number) => {
  const seen = new Set<string>();
  const output: PlaceResult[] = [];
  for (const place of items) {
    const key = `${place.lat.toFixed(4)}:${place.lng.toFixed(4)}:${place.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(place);
    if (output.length >= limit) break;
  }
  return output;
};

export const searchPlaces = async (query: string, limit = 20): Promise<PlaceResult[]> => {
  const q = normaliseText(query);
  if (q.length < 2) return [];

  const safeLimit = Math.min(40, Math.max(5, Number(limit) || 20));
  const key = `search:${q.toLowerCase()}:${safeLimit}`;
  const cached = cacheGet<PlaceResult[]>(key);
  if (cached) return cached;

  const all: PlaceResult[] = [];

  try {
    const photon = await axios.get('https://photon.komoot.io/api/', {
      params: {
        q: q.toLowerCase().includes('uganda') ? q : `${q}, Uganda`,
        bbox: `${UGANDA_BOUNDS.minLng},${UGANDA_BOUNDS.minLat},${UGANDA_BOUNDS.maxLng},${UGANDA_BOUNDS.maxLat}`,
        limit: safeLimit,
        lang: 'en',
      },
      timeout: 8_000,
    });

    if (Array.isArray(photon.data?.features)) {
      for (const feature of photon.data.features) {
        const place = toPhotonPlace(feature);
        if (place) all.push(place);
      }
    }
  } catch (error: any) {
    console.warn('Photon search failed:', error?.message || error);
  }

  // Nominatim is deliberately server-side and cached. The public service
  // explicitly disallows client-side autocomplete and asks applications to
  // cache requests and stay at or below one request per second.
  if (all.length < Math.min(5, safeLimit)) {
    try {
      const nom = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: `${q}, Uganda`,
          format: 'jsonv2',
          addressdetails: 1,
          limit: Math.min(40, safeLimit),
          countrycodes: 'ug',
          viewbox: `${UGANDA_BOUNDS.minLng},${UGANDA_BOUNDS.minLat},${UGANDA_BOUNDS.maxLng},${UGANDA_BOUNDS.maxLat}`,
        },
        headers: {
          'User-Agent': process.env.GEOCODING_USER_AGENT || 'NAVIGO/1.0 (contact admin@navigo.ug)',
          'Accept-Language': 'en',
        },
        timeout: 10_000,
      });

      if (Array.isArray(nom.data)) {
        for (const item of nom.data) {
          const place = toNominatimPlace(item);
          if (place) all.push(place);
        }
      }
    } catch (error: any) {
      console.warn('Nominatim search fallback failed:', error?.message || error);
    }
  }

  const result = dedupePlaces(all, safeLimit);
  cacheSet(key, result);
  return result;
};

export const reverseGeocode = async (point: MapPoint): Promise<PlaceResult> => {
  if (!isUgandaPoint(point)) throw new Error('Location must be within Uganda');

  const key = `reverse:${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`;
  const cached = cacheGet<PlaceResult>(key);
  if (cached) return cached;

  try {
    const photon = await axios.get('https://photon.komoot.io/reverse', {
      params: { lat: point.lat, lon: point.lng, lang: 'en' },
      timeout: 8_000,
    });
    const feature = photon.data?.features?.[0];
    const place = toPhotonPlace(feature);
    if (place) {
      cacheSet(key, place);
      return place;
    }
  } catch (error: any) {
    console.warn('Photon reverse failed:', error?.message || error);
  }

  const nom = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: {
      format: 'jsonv2',
      lat: point.lat,
      lon: point.lng,
      zoom: 18,
      addressdetails: 1,
    },
    headers: {
      'User-Agent': process.env.GEOCODING_USER_AGENT || 'NAVIGO/1.0 (contact admin@navigo.ug)',
      'Accept-Language': 'en',
    },
    timeout: 10_000,
  });

  const place = toNominatimPlace(nom.data);
  if (!place) throw new Error('Reverse geocoder returned no usable place');
  cacheSet(key, place);
  return place;
};
