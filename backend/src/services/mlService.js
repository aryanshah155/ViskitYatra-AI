const axios = require('axios');

const predictTraffic = async (locations, time) => {
  try {
    const mlUrl = process.env.ML_URL || 'http://localhost:8000';
    const response = await axios.post(`${mlUrl}/predict-traffic`, {
      nodes: locations,
      time_of_day: time
    });
    return response.data;
  } catch (error) {
    console.error('ML Prediction Error:', error.message);
    // Fallback metrics if ML service is down
    return {
      traffic_multiplier: 1.2,
      safety_score: 8.5,
      environmental_impact: 0.5
    };
  }
};

const predictRoute = async (source, destination, mode, distanceKm, timeOfDay, isWeekend = false) => {
  try {
    const mlUrl = process.env.ML_URL || 'http://localhost:8000';
    const response = await axios.post(`${mlUrl}/predict-route`, {
      source: source,
      destination: destination,
      mode: mode,
      distance_km: distanceKm,
      time_of_day: timeOfDay,
      is_weekend: isWeekend
    });
    return response.data;
  } catch (error) {
    console.error('Enhanced ML Prediction Error:', error.message);
    // Fallback to basic predictions
    return {
      traffic_multiplier: 1.2,
      safety_score: 8.0,
      comfort_score: 7.0,
      carbon_score: 5.0,
      reliability_score: 8.0,
      estimated_delay_minutes: 5
    };
  }
};

module.exports = {
  predictTraffic,
  predictRoute
};
