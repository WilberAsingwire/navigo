import axios from 'axios';
import { isUgandaPoint, UGANDA_BOUNDS } from './mappingService';
import type { MapPoint, PlaceResult } from './mappingService';

export interface MapFeature extends MapPoint {
  id: string;
  name: string;
  address: string;
  category: 'road' | 'place' | 'education' | 'health' | 'emergency' | 'finance' | 'food' | 'shopping' | 'transport' | 'tourism' | 'leisure' | 'office' | 'landmark' | 'boundary' | 'natural' | 'other';
  subtype?: string;
  source: 'overpass';
  tags?: Record<string, string>;
}

const OVERPASS_PRIMARY = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const OVERPASS_FALLBACK = process.env.OVERPASS_URL_FALLBACK || 'https://overpass.private.coffee/api/interpreter';
const MAX_FEATURES = 500;
const CACHE_TTL = 60_000;
const cache = new Map<string, { expires: number; value: MapFeature[] }>();

const normalize = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');

const categoryOf = (tags: Record<string, string>): MapFeature['category'] => {
  if (tags.highway) return 'road';
  if (tags.place) return 'place';
  if (tags.amenity) {
    const value = tags.amenity.toLowerCase();
    if (/^(school|college|university|kindergarten|library)$/.test(value)) return 'education';
    if (/^(hospital|clinic|doctors|dentist|pharmacy|veterinary)$/.test(value)) return 'health';
    if (/^(police|fire_station|ambulance_station|courthouse|prison)$/.test(value)) return 'emergency';
    if (/^(bank|atm|post_office|bureau_de_change)$/.test(value)) return 'finance';
    if (/^(restaurant|cafe|fast_food|food_court|bar|pub)$/.test(value)) return 'food';
    if (/^(bus_station|taxi|fuel|ferry_terminal|parking|charging_station)$/.test(value)) return 'transport';
    return 'other';
  }
  if (tags.shop || tags.brand) return 'shopping';
  if (tags.office || tags.company) return 'office';
  if (tags.tourism) return 'tourism';
  if (tags.leisure) return 'leisure';
  if (tags.aeroway || tags.railway || tags.public_transport) return 'transport';
  if (tags.boundary === 'administrative') return 'boundary';
  if (tags.natural) return 'natural';
  if (tags.historic || tags.man_made) return 'landmark';
  return 'other';
};

const addressOf = (tags: Record<string, string>) => normalize([
  tags['addr:housenumber'] ? [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') : tags['addr:street'],
  tags['addr:suburb'],
  tags['addr:city'],
  tags['addr:district'],
  tags['addr:county'],
  tags['addr:state'],
  tags['addr:country'],
].filter(Boolean).join(', '));

const toFeature = (element: any): MapFeature | null => {
  const tags = element?.tags && typeof element.tags === 'object'
    ? element.tags as Record<string, string>
    : {};
  const lat = Number(element?.lat ?? element?.center?.lat);
  const lng = Number(element?.lon ?? element?.center?.lon);
  const name = normalize(tags.name || tags['name:en'] || tags.brand || tags.operator || tags.ref);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !isUgandaPoint({ lat, lng })) return null;

  const category = categoryOf(tags);
  const subtype = tags.highway || tags.amenity || tags.shop || tags.office ||
    tags.tourism || tags.leisure || tags.place || tags.public_transport ||
    tags.railway || tags.aeroway || tags.natural || tags.historic || tags.man_made;

  const safeTagKeys = new Set([
    'name','name:en','brand','operator','ref','highway','amenity','shop','office',
    'tourism','leisure','place','public_transport','railway','aeroway','natural',
    'historic','man_made','boundary','admin_level','opening_hours','phone','website',
    'addr:housenumber','addr:street','addr:suburb','addr:city','addr:district',
    'addr:county','addr:state','addr:country'
  ]);

  return {
    id: String(element?.type || 'osm') + ':' + String(element?.id),
    lat,
    lng,
    name,
    address: addressOf(tags) || [tags.city, tags.town, tags.village, tags.district, tags.county, 'Uganda'].filter(Boolean).join(', '),
    category,
    subtype: normalize(subtype) || undefined,
    source: 'overpass',
    tags: Object.fromEntries(Object.entries(tags).filter(([key]) => safeTagKeys.has(key)).slice(0, 50)),
  };
};

const overpass = async (url: string, query: string) => {
  const response = await axios.post(url, 'data=' + encodeURIComponent(query), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.OVERPASS_USER_AGENT || 'NAVIGO/1.0 (+https://navigo.ug; countrywide map data)',
    },
    timeout: 20_000,
  });
  return Array.isArray(response.data?.elements) ? response.data.elements : [];
};

const clampBox = (south: number, west: number, north: number, east: number) => ({
  south: Math.max(UGANDA_BOUNDS.minLat, Math.min(south, UGANDA_BOUNDS.maxLat)),
  west: Math.max(UGANDA_BOUNDS.minLng, Math.min(west, UGANDA_BOUNDS.maxLng)),
  north: Math.max(UGANDA_BOUNDS.minLat, Math.min(north, UGANDA_BOUNDS.maxLat)),
  east: Math.max(UGANDA_BOUNDS.minLng, Math.min(east, UGANDA_BOUNDS.maxLng)),
});

export const getMapFeatures = async (
  south: number,
  west: number,
  north: number,
  east: number,
  zoom: number,
): Promise<MapFeature[]> => {
  const z = Math.max(5, Math.min(20, Math.round(Number(zoom) || 12)));
  const box = clampBox(south, west, north, east);
  if (box.south >= box.north || box.west >= box.east) return [];

  const key = [box.south, box.west, box.north, box.east].map(v => v.toFixed(3)).join(',') + ':z' + z;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (cached) cache.delete(key);

  const b = [box.south, box.west, box.north, box.east].join(',');
  const parts = [
    'nwr[name][place~"^(city|town|municipality|village|suburb|neighbourhood|hamlet)$"](' + b + ');',
    'rel[boundary=administrative][name](' + b + ');',
    'way[highway~"^(motorway|trunk|primary|secondary|tertiary)$"][name](' + b + ');',
  ];

  if (z >= 12) {
    parts.push(
      'way[highway~"^(unclassified|residential)$"][name](' + b + ');',
      'nwr[amenity~"^(school|college|university|kindergarten|library|hospital|clinic|doctors|dentist|pharmacy|police|fire_station|ambulance_station|bank|atm|post_office|restaurant|cafe|fast_food|food_court|bar|pub|place_of_worship|bus_station|taxi|fuel|ferry_terminal|parking|charging_station|toilets|drinking_water)$"][name](' + b + ');',
      'nwr[shop][name](' + b + ');',
      'nwr[office][name](' + b + ');',
      'nwr[brand][name](' + b + ');',
      'nwr[operator][name](' + b + ');',
      'nwr[craft][name](' + b + ');',
      'nwr[tourism][name](' + b + ');',
      'nwr[leisure][name](' + b + ');',
      'nwr[historic][name](' + b + ');',
      'nwr[man_made][name](' + b + ');',
      'nwr[natural][name](' + b + ');',
      'nwr[aeroway][name](' + b + ');',
      'nwr[railway][name](' + b + ');',
      'nwr[public_transport][name](' + b + ');'
    );
  } else if (z >= 9) {
    parts.push(
      'nwr[amenity~"^(school|college|university|hospital|clinic|police|bank|atm|post_office|bus_station|fuel)$"][name](' + b + ');',
      'nwr[tourism][name](' + b + ');',
      'nwr[leisure][name](' + b + ');',
      'nwr[aeroway][name](' + b + ');',
      'nwr[railway][name](' + b + ');',
      'nwr[public_transport][name](' + b + ');'
    );
  }

  const query = '[out:json][timeout:25];(' + parts.join('') + ');out center tags 500;';
  let elements: any[] = [];
  let lastError: unknown = null;

  for (const endpoint of [OVERPASS_PRIMARY, OVERPASS_FALLBACK]) {
    try {
      elements = await overpass(endpoint, query);
      if (elements.length) break;
    } catch (error) {
      lastError = error;
      console.warn('NAVIGO map feature query failed:', error);
    }
  }

  if (!elements.length && lastError) throw lastError;

  const features = new Map<string, MapFeature>();
  for (const element of elements) {
    const feature = toFeature(element);
    if (!feature) continue;
    features.set(feature.id, feature);
    if (features.size >= MAX_FEATURES) break;
  }

  const result = Array.from(features.values());
  cache.set(key, { expires: Date.now() + CACHE_TTL, value: result });
  if (cache.size > 100) cache.delete(cache.keys().next().value as string);
  return result;
};

export const searchNamedMapFeatures = async (query: string, limit = 20): Promise<PlaceResult[]> => {
  const normalized = normalize(query).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tokens = normalized.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
    .filter(token => token.length >= 2 && !['uganda','city','town','district','county','municipality','village'].includes(token));
  if (!tokens.length) return [];

  const safeLimit = Math.min(40, Math.max(5, Number(limit) || 20));
  const escaped = tokens.slice(0, 4).map(token => token.replace(/[^a-z0-9]/gi, ''));
  const regex = escaped.join('.*');
  const b = [UGANDA_BOUNDS.minLat, UGANDA_BOUNDS.minLng, UGANDA_BOUNDS.maxLat, UGANDA_BOUNDS.maxLng].join(',');
  const ql = '[out:json][timeout:25];(nwr["name"~"' + regex + '",i](' + b + ');nwr["brand"~"' + regex + '",i](' + b + ');nwr["operator"~"' + regex + '",i](' + b + '););out center tags ' + safeLimit + ';';

  let elements: any[] = [];
  for (const endpoint of [OVERPASS_PRIMARY, OVERPASS_FALLBACK]) {
    try {
      elements = await overpass(endpoint, ql);
      if (elements.length) break;
    } catch (error) {
      console.warn('NAVIGO named feature search failed:', error);
    }
  }

  const results = elements.map(toFeature).filter((x): x is MapFeature => Boolean(x));
  const unique = new Map<string, MapFeature>();
  for (const item of results) unique.set(item.id, item);

  return Array.from(unique.values()).slice(0, safeLimit).map(item => ({
    lat: item.lat,
    lng: item.lng,
    name: item.name,
    address: item.address || item.name,
    type: item.category,
    source: 'overpass',
  }));
};
