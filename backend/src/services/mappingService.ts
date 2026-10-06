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

const normaliseSearchQuery = (value: unknown) =>
  normaliseText(value)
    .replace(/[，、]/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

const searchTokens = (value: string) =>
  normaliseSearchQuery(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 2 && token !== 'uganda');

const haversineKm = (a: MapPoint, b: MapPoint) => {
  const R = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

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
    durationMin: Math.max(0.1, Math.round((Number(route.duration) / 60) * 10) / 10),
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

  const name = normaliseText(
    p.name ||
    p.street ||
    p.city ||
    p.town ||
    p.village ||
    p.county ||
    p.district ||
    p.state ||
    'Selected place'
  );

  const streetLine = normaliseText(
    [p.street, p.housenumber].filter(Boolean).join(' ')
  );
  const locality = [
    streetLine,
    p.district,
    p.city || p.town || p.village || p.county,
    p.state,
    p.country,
  ]
    .map(normaliseText)
    .filter(Boolean);

  const address = normaliseText([name, ...locality]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', '));

  return {
    lat,
    lng,
    name,
    address: address || name,
    type: normaliseText(p.type || p.osm_value || p.osm_key || p.layer) || undefined,
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

const GENERIC_LOCATION_WORDS = new Set([
  'uganda', 'ug', 'city', 'town', 'municipality', 'district', 'county',
  'ward', 'division', 'region', 'village', 'province', 'capital',
]);

const searchTokens = (value: string) =>
  normaliseSearchQuery(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 2 && !GENERIC_LOCATION_WORDS.has(token));

const buildSearchVariants = (query: string) => {
  const original = normaliseSearchQuery(query);
  const originalWords = original.split(/\s+/).filter(Boolean);
  const meaningful = originalWords.filter(word => {
    const clean = word.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return clean.length >= 2 && !GENERIC_LOCATION_WORDS.has(clean);
  });
  const core = meaningful.join(' ').replace(/\s+,/g, ',').trim();

  const variants = [
    original,
    core,
    originalWords.filter(word => word.toLowerCase() !== 'uganda' && word.toLowerCase() !== 'ug').join(' ').trim(),
  ];

  return Array.from(new Set(variants.filter(v => v.length >= 2)));
};

const haversineKm = (a: MapPoint, b: MapPoint) => {
  const R = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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

const rankPlaces = (
  items: PlaceResult[],
  query: string,
  focus?: MapPoint | null,
) => {
  const tokens = searchTokens(query);
  const coreQuery = tokens.join(' ');
  const original = normaliseSearchQuery(query)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return items
    .map(place => {
      const name = normaliseText(place.name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const address = normaliseText(place.address)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const haystack = `${name} ${address}`;
      const compactName = name.replace(/[^a-z0-9]+/g, ' ').trim();
      const matchedTokens = tokens.filter(token => haystack.includes(token)).length;

      let score = 0;
      if (coreQuery && compactName === coreQuery) score += 1500;
      if (coreQuery && compactName.startsWith(coreQuery)) score += 700;
      if (original && haystack.includes(original)) score += 400;
      if (matchedTokens) score += matchedTokens * 100;
      if (tokens.length > 0 && matchedTokens === tokens.length) score += 300;

      const type = String(place.type || '').toLowerCase();
      if (['city', 'town', 'village', 'municipality', 'district', 'county', 'locality', 'street', 'house', 'poi', 'amenity'].includes(type)) {
        score += 25;
      }

      if (focus && isUgandaPoint(focus)) {
        const distance = haversineKm(focus, place);
        score += Math.max(0, 80 - Math.min(distance, 80));
      }

      return { place, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.place);
};

const hasStrongTextMatch = (items: PlaceResult[], query: string) => {
  const tokens = searchTokens(query);
  if (!tokens.length) return false;
  return items.some(place => {
    const haystack = `${normaliseText(place.name)} ${normaliseText(place.address)}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return tokens.every(token => haystack.includes(token));
  });
};

let nextNominatimRequestAt = 0;
let nominatimQueue: Promise<void> = Promise.resolve();

const waitForNominatimSlot = async () => {
  let release!: () => void;
  const previous = nominatimQueue;
  nominatimQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;

  const waitMs = Math.max(0, nextNominatimRequestAt - Date.now());
  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
  nextNominatimRequestAt = Date.now() + 1100;
  release();
};

const searchNominatimFreeform = async (query: string, limit: number) => {
  await waitForNominatimSlot();
  const nom = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: query,
      format: 'jsonv2',
      addressdetails: 1,
      namedetails: 1,
      limit,
      countrycodes: 'ug',
      viewbox: `${UGANDA_BOUNDS.minLng},${UGANDA_BOUNDS.minLat},${UGANDA_BOUNDS.maxLng},${UGANDA_BOUNDS.maxLat}`,
      bounded: 1,
    },
    headers: {
      'User-Agent': process.env.GEOCODING_USER_AGENT || 'NAVIGO/1.0 (contact admin@navigo.ug)',
      'Accept-Language': 'en',
    },
    timeout: 10_000,
  });

  return Array.isArray(nom.data)
    ? nom.data.map(toNominatimPlace).filter((place): place is PlaceResult => !!place)
    : [];
};

const searchNominatimStructured = async (
  field: 'city' | 'county' | 'state',
  value: string,
  limit: number,
) => {
  await waitForNominatimSlot();
  const nom = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      [field]: value,
      country: 'Uganda',
      countrycodes: 'ug',
      format: 'jsonv2',
      addressdetails: 1,
      namedetails: 1,
      limit,
      viewbox: `${UGANDA_BOUNDS.minLng},${UGANDA_BOUNDS.minLat},${UGANDA_BOUNDS.maxLng},${UGANDA_BOUNDS.maxLat}`,
      bounded: 1,
    },
    headers: {
      'User-Agent': process.env.GEOCODING_USER_AGENT || 'NAVIGO/1.0 (contact admin@navigo.ug)',
      'Accept-Language': 'en',
    },
    timeout: 10_000,
  });

  return Array.isArray(nom.data)
    ? nom.data.map(toNominatimPlace).filter((place): place is PlaceResult => !!place)
    : [];
};

export const searchPlaces = async (
  query: string,
  limit = 20,
  focus?: MapPoint | null,
): Promise<PlaceResult[]> => {
  const q = normaliseSearchQuery(query);
  if (q.length < 2) return [];
  if (focus && !isUgandaPoint(focus)) focus = null;

  const safeLimit = Math.min(40, Math.max(5, Number(limit) || 20));
  const focusKey = focus ? `:${focus.lat.toFixed(3)},${focus.lng.toFixed(3)}` : '';
  const key = `search2:${q.toLowerCase()}:${safeLimit}${focusKey}`;
  const cached = cacheGet<PlaceResult[]>(key);
  if (cached) return cached;

  const variants = buildSearchVariants(q);
  const all: PlaceResult[] = [];
  let photonFailed = false;

  // Run a small number of provider-side query variants in parallel. The
  // important distinction is that broad searches are NOT location-biased:
  // "Arua city" must still find Arua when the rider is currently in Kampala.
  const photonResponses = await Promise.allSettled(
    variants.slice(0, 3).map(variant => axios.get('https://photon.komoot.io/api/', {
      params: {
        q: variant,
        bbox: `${UGANDA_BOUNDS.minLng},${UGANDA_BOUNDS.minLat},${UGANDA_BOUNDS.maxLng},${UGANDA_BOUNDS.maxLat}`,
        countrycode: 'ug',
        limit: safeLimit,
        lang: 'en',
      },
      timeout: 8_000,
    })),
  );

  for (const response of photonResponses) {
    if (response.status === 'fulfilled') {
      const features = response.value.data?.features;
      if (Array.isArray(features)) {
        for (const feature of features) {
          const place = toPhotonPlace(feature);
          if (place) all.push(place);
        }
      }
    } else {
      photonFailed = true;
      console.warn('Photon search failed:', response.reason?.message || response.reason);
    }
  }

  let result = dedupePlaces(rankPlaces(all, q, focus), safeLimit);
  const needsFallback = photonFailed || result.length < 3 || !hasStrongTextMatch(result, q);

  if (needsFallback) {
    try {
      for (const variant of variants.slice(0, 2)) {
        const nomResults = await searchNominatimFreeform(variant, safeLimit);
        all.push(...nomResults);
        result = dedupePlaces(rankPlaces(all, q, focus), safeLimit);
        if (result.length >= 3 && hasStrongTextMatch(result, q)) break;
      }

      // Administrative/settlement searches get an additional structured
      // lookup. This is the key recovery path for inputs such as
      // "Arua city", "Gulu district", or "Hoima town".
      const adminWords = q.toLowerCase();
      const isAdminSearch = /\b(city|town|municipality|district|county|region|village)\b/i.test(adminWords);
      const core = searchTokens(q).join(' ').trim();

      if (isAdminSearch && core.length >= 2 && !hasStrongTextMatch(result, q)) {
        const fields: Array<'city' | 'county' | 'state'> =
          /\b(city|town|municipality|village)\b/i.test(adminWords)
            ? ['city', 'county']
            : /\b(district|county)\b/i.test(adminWords)
              ? ['county', 'state']
              : ['state', 'county'];

        for (const field of fields) {
          const structured = await searchNominatimStructured(field, core, safeLimit);
          all.push(...structured);
          result = dedupePlaces(rankPlaces(all, q, focus), safeLimit);
          if (hasStrongTextMatch(result, q)) break;
        }
      }
    } catch (error: any) {
      console.warn('Nominatim search fallback failed:', error?.message || error);
    }
  }

  cacheSet(key, result);
  return result;
};

export const reverseGeocode = async (point: MapPoint): Promise<PlaceResult> => {
  if (!isUgandaPoint(point)) throw new Error('Location must be within Uganda');

  const key = `reverse:${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`;
  const cached = cacheGet<PlaceResult>(key);
  if (cached) return cached;

  let photonFailed = false;
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
    photonFailed = true;
    console.warn('Photon reverse failed:', error?.message || error);
  }

  if (!photonFailed) {
    throw new Error('No place found for this location');
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
