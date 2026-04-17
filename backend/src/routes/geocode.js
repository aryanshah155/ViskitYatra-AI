const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  const { place } = req.query;

  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: place,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'ViksitYatraApp'
        }
      }
    );

    if (!response.data.length) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const loc = response.data[0];

    res.json({
      name: loc.display_name,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lon)
    });
  } catch (err) {
    res.status(500).json({ error: 'Geocode failed' });
  }
});

module.exports = router;
