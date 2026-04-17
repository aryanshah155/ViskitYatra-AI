const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing natural language query' });
    }

    const structuredData = await aiService.parseNaturalLanguage(query);
    res.json(structuredData);
  } catch (error) {
    res.status(500).json({ error: 'AI processing failed', details: error.message });
  }
});

module.exports = router;
