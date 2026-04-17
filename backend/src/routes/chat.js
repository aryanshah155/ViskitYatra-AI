const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = await aiService.chatWithAI(message, history || []);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Chat failed', details: error.message });
  }
});

module.exports = router;
