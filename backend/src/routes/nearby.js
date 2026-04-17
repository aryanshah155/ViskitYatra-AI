const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius_m = 1000 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing lat/lng' });
    }

    // PostGIS query: Find nodes within radius_m of the provided coordinate
    const query = `
      SELECT id, name, type, ST_X(geom::geometry) as lng, ST_Y(geom::geometry) as lat,
      ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist_meters
      FROM nodes
      WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY dist_meters ASC
      LIMIT 20;
    `;
    const result = await db.query(query, [lng, lat, radius_m]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby nodes', details: error.message });
  }
});

module.exports = router;
