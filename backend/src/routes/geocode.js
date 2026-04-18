const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocodingService');

router.get('/', async (req, res) => {
  const { place } = req.query;

  try {
    const loc = await geocodingService.resolvePlaceToCoords(place);

    if (!loc) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng
    });
  } catch (err) {
    console.error('Geocode API Error:', err);
    res.status(500).json({ error: 'Geocode failed' });
  }
});

module.exports = router;
