const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');

router.post('/', async (req, res) => {
  try {
    const { source, destination, preferences } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Missing source or destination coordinates/names' });
    }

    const routeData = await graphService.calculateMultiModalRoute(source, destination, preferences || {});
    res.json(routeData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate multi-modal route', details: error.message });
  }
});

module.exports = router;
