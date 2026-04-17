const axios = require('axios');

const getRoute = async (coordinates, profile = 'car') => {
  try {
    let baseUrl = process.env.OSRM_CAR_URL || 'http://localhost:5000';
    if (profile === 'foot') baseUrl = process.env.OSRM_FOOT_URL || 'http://localhost:5001';
    if (profile === 'bike') baseUrl = process.env.OSRM_BIKE_URL || 'http://localhost:5002';

    const response = await axios.get(`${baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
    return response.data;
  } catch (error) {
    console.warn(`Soft-failure detected on OSRM profile (${profile}):`, error.message);
    return null; // Return null to allow graphService to provide estimates
  }
};

module.exports = {
  getRoute
};
