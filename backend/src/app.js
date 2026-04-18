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
        let features = [];
        if (Array.isArray(data)) {
          features = data;
        } else if (data.features && Array.isArray(data.features)) {
          features = data.features;
        }

        const activeZones = [];
        features.forEach(f => {
          const status = f.properties?.location?.status || f.status;
          if (status && status.toLowerCase() === 'in progress') {
             let coords = [];
             if (f.geometry?.type === 'LineString') {
                coords = f.geometry.coordinates; // [[lng, lat]]
             } else if (f.geometry?.type === 'MultiLineString') {
                coords = f.geometry.coordinates.flat(); // Flatten once to get [[lng, lat]]
             } else if (f.lat && f.lng) {
                coords = [[f.lng, f.lat]];
             }

             if (coords.length > 0) {
               activeZones.push({
                 status: status,
                 path: coords
               });
             }
          }
        });
        
        return res.json(activeZones);
      }
    }
    return res.json([]);
  } catch (err) {
    console.error('Error reading construction zones:', err);
    return res.json([]);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend service running on port ${PORT}`);
});
