import express from 'express';
import axios from 'axios';
import { isUgandaPoint, reverseGeocode, searchPlaces, UGANDA_BOUNDS } from '../services/mappingService';
import { getMapFeatures, searchNamedMapFeatures } from '../services/mapFeatureService';

const router = express.Router();

/**
 * Map place search proxy.
 * q is the text-search mode used by the rider booking map.
 * Without q, the legacy nearby-POI mode remains available for compatibility.
 */
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (q) {
    if (q.length < 2 || q.length > 120) {
      return res.status(400).json({ ok: false, message: 'Search text must be between 2 and 120 characters.' });
    }
    try {
      const limit = Math.min(40, Math.max(5, Number(req.query.limit) || 20));
      const lat = req.query.lat === undefined ? null : Number(req.query.lat);
      const lng = req.query.lng === undefined ? null : Number(req.query.lng);
      const hasFocus = lat !== null || lng !== null;

      if (
        hasFocus &&
        (!Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !isUgandaPoint({ lat: Number(lat), lng: Number(lng) }))
      ) {
        return res.status(400).json({ ok: false, message: 'Search focus coordinates must be valid Uganda coordinates.' });
      }

      let results = await searchPlaces(
        q,
        limit,
        hasFocus ? { lat: Number(lat), lng: Number(lng) } : null,
      );
      // Overpass is the completeness fallback for named roads, schools,
      // companies/offices, landmarks and local businesses in OSM.
      if (results.length < Math.min(5, limit)) {
        try {
          const named = await searchNamedMapFeatures(q, limit);
          const merged = [...results, ...named];
          const seen = new Set<string>();
          results = merged.filter(item => {
            const key = String(Number(item.lat).toFixed(5)) + ':' + String(Number(item.lng).toFixed(5)) + ':' + String(item.name).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, limit);
        } catch (error: any) {
          console.warn('Overpass search fallback failed:', error?.message || error);
        }
      }
      return res.json({ ok: true, query: q, bounds: UGANDA_BOUNDS, results });
    } catch (error: any) {
      console.error('Place search error:', error?.message || error);
      return res.status(503).json({ ok: false, message: 'Place search is temporarily unavailable. Please try again.' });
    }
  }

  const { lat, lng, radius } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ ok: false, message: 'Latitude and longitude are required for nearby POI search.' });
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  let radiusNum = parseInt(String(radius || 2000), 10);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || !isUgandaPoint({ lat: latNum, lng: lngNum })) {
    return res.status(400).json({ ok: false, message: 'Invalid Uganda coordinates.' });
  }
  if (!Number.isFinite(radiusNum) || radiusNum < 100) radiusNum = 500;
  if (radiusNum > 5000) radiusNum = 5000;

  try {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radiusNum},${latNum},${lngNum});
        way["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radiusNum},${latNum},${lngNum});
        relation["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radiusNum},${latNum},${lngNum});
      );
      out center 50;
    `;

    const response = await axios.get('https://overpass-api.de/api/interpreter', {
      params: { data: query },
      timeout: 15000,
    });

    return res.json({ ok: true, ...response.data });
  } catch (error: any) {
    const status = error.response?.status;
    console.error(`POI proxy error [${status}]: ${error?.message || error}`);
    if (status === 429) {
      return res.status(429).json({ ok: false, message: 'Nearby place service is busy. Please try again shortly.' });
    }
    return res.status(503).json({ ok: false, message: 'Nearby place service is temporarily unavailable.' });
  }
});

router.get('/map', async (req, res) => {
  const south = Number(req.query.south);
  const west = Number(req.query.west);
  const north = Number(req.query.north);
  const east = Number(req.query.east);
  const zoom = Number(req.query.zoom || 12);

  if (![south, west, north, east, zoom].every(Number.isFinite)) {
    return res.status(400).json({ ok: false, message: 'Valid map bounds and zoom are required.' });
  }
  if (south >= north || west >= east) {
    return res.status(400).json({ ok: false, message: 'Invalid map bounds.' });
  }

  try {
    const features = await getMapFeatures(south, west, north, east, zoom);
    return res.json({
      ok: true, bounds: UGANDA_BOUNDS, zoom: Math.round(zoom),
      count: features.length, features, source: 'OpenStreetMap/Overpass',
    });
  } catch (error: any) {
    console.error('Map feature query error:', error?.message || error);
    return res.status(503).json({ ok: false, message: 'Map feature service is temporarily unavailable.' });
  }
});

router.get('/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isUgandaPoint({ lat, lng })) {
    return res.status(400).json({ ok: false, message: 'Valid Uganda latitude and longitude are required.' });
  }

  try {
    const place = await reverseGeocode({ lat, lng });
    return res.json({ ok: true, place });
  } catch (error: any) {
    console.error('Reverse geocoding error:', error?.message || error);
    return res.status(503).json({ ok: false, message: 'Unable to identify this location right now.' });
  }
});

export default router;
