const fs = require('fs');
const path = require('path');

const ROAD_JSON_PATH = path.join(__dirname, 'road.json');
const OUTPUT_JSON_PATH = path.join(__dirname, 'avoid_segments.json');

function extractAvoidSegments() {
  try {
    const content = fs.readFileSync(ROAD_JSON_PATH, 'utf8');
    const data = JSON.parse(content);
    
    // Support either a raw array or a GeoJSON FeatureCollection
    let features = Array.isArray(data) ? data : (data.features || []);

    const avoidSegments = [];

    features.forEach(feature => {
      // Safely access status either from properties.location.status or root level
      const statusObj = feature.properties?.location?.status || feature.status;
      if (!statusObj) return;

      const status = statusObj.toLowerCase();
      
      // Target only 'In Progress' and 'Not Started', ignore 'Complete'
      if (status === 'in progress' || status === 'not started') {
        const geometry = feature.geometry;
        if (!geometry || !geometry.coordinates) return;

        // Process based on geometry line configuration
        if (geometry.type === 'LineString') {
          // LineString coordinates are already [[lon, lat], [lon, lat]]
          avoidSegments.push(geometry.coordinates);
        } else if (geometry.type === 'MultiLineString') {
          // MultiLineString coordinates are [[[lon, lat], [lon, lat]]]
          // We can push each segment block as an individual path array
          geometry.coordinates.forEach(line => {
            avoidSegments.push(line);
          });
        }
      }
    });

    const outputObj = {
      avoid_segments: avoidSegments
    };

    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(outputObj, null, 2), 'utf8');
    console.log(`Successfully extracted ${avoidSegments.length} road segments to avoid_segments.json`);
    
  } catch (error) {
    console.error('Extraction Failed:', error);
  }
}

extractAvoidSegments();
