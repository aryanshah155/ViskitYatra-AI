require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const authRouter = require('./routes/auth');
const multiModalRouteRouter = require('./routes/multiModalRoute');
const aiRouter = require('./routes/ai');
const chatRouter = require('./routes/chat');
const nearbyRouter = require('./routes/nearby');
const geocodeRouter = require('./routes/geocode');
const authMiddleware = require('./middleware/auth');

app.use('/auth', authRouter);

// Protected Routes
app.use('/multi-modal-route', authMiddleware, multiModalRouteRouter);
app.use('/ai-query', authMiddleware, aiRouter);
app.use('/chat', authMiddleware, chatRouter);

// Public Routes
app.use('/geocode', geocodeRouter);
app.use('/nearby', nearbyRouter);

app.get('/construction-zones', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../script/road.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content) {
        const data = JSON.parse(content);
        const activeZones = data.filter(r => r.status && r.status.toLowerCase() !== 'complete');
        return res.json(activeZones);
      }
    }
    res.json([]);
  } catch (err) {
    console.error('Error reading construction zones:', err);
    res.json([]);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend service running on port ${PORT}`);
});
