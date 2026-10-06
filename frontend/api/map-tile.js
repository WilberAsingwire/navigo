const ALLOWED_HOST = 'https://tile.openstreetmap.org';

export default async function handler(req, res) {
  const { z, x, y } = req.query || {};
  if (!/^\d+$/.test(String(z)) || !/^\d+$/.test(String(x)) || !/^\d+\.png$/.test(String(y))) {
    return res.status(400).send('Invalid tile coordinates');
  }

  const response = await fetch(`${ALLOWED_HOST}/${z}/${x}/${y}`, {
    headers: { 'User-Agent': 'Navigo/1.0 map tile proxy' },
  });
  if (!response.ok) return res.status(response.status).send('Map tile unavailable');

  res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return res.status(200).send(Buffer.from(await response.arrayBuffer()));
}
