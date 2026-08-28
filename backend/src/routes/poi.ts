import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radius || 2000},${lat},${lng});
        way["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radius || 2000},${lat},${lng});
        relation["amenity"~"restaurant|cafe|police|bank|atm|hospital|pharmacy|school"](around:${radius || 2000},${lat},${lng});
      );
      out center;
    `;

    const response = await axios.get(`https://overpass-api.de/api/interpreter`, {
      params: { data: query }
    });

    res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`POI Proxy Error [${status}]: ${error.message}`);
    if (data) console.error('Error Data:', data);

    if (status === 429) {
      res.status(429).json({ message: 'Too many requests to POI service. Please slow down.' });
    } else if (status === 400) {
      res.status(400).json({ message: 'Invalid query sent to POI service', details: data });
    } else {
      res.status(500).json({ message: 'Failed to fetch POIs from Overpass API', details: error.message });
    }
  }
});

export default router;
