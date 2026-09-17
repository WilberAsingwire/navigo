import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    let radiusNum = parseInt((radius as string) || '2000', 10);

    // Validation: lat/lng must be numbers within Uganda bounds, radius capped
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    if (latNum < -5 || latNum > 5 || lngNum < 29 || lngNum > 36) {
      return res.status(400).json({ message: 'Coordinates out of supported region (Uganda)' });
    }
    if (isNaN(radiusNum) || radiusNum < 100) radiusNum = 500;
    if (radiusNum > 5000) radiusNum = 5000; // cap to 5km to protect Overpass

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radiusNum},${latNum},${lngNum});
        way["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radiusNum},${latNum},${lngNum});
        relation["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radiusNum},${latNum},${lngNum});
      );
      out center 30;
    `;

    const response = await axios.get(`https://overpass-api.de/api/interpreter`, {
      params: { data: query },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`POI Proxy Error [${status}]: ${error.message}`);

    if (status === 429) {
      res.status(429).json({ message: 'Too many requests to POI service. Please slow down.' });
    } else if (status === 400) {
      res.status(400).json({ message: 'Invalid query sent to POI service' });
    } else {
      res.status(500).json({ message: 'Failed to fetch POIs. Try again.' });
    }
  }
});

export default router;
