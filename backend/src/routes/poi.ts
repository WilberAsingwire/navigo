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
    console.error('POI Proxy Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch POIs from Overpass API' });
  }
});

export default router;
