const axios = require('axios');

const getOTPRoute = async (sourceLat, sourceLng, destLat, destLng, mode = 'TRANSIT,WALK', time = null, date = null) => {
  try {
    const baseUrl = process.env.OTP_URL || 'http://localhost:8080/otp/routers/default';
    let url = `${baseUrl}/plan?fromPlace=${sourceLat},${sourceLng}&toPlace=${destLat},${destLng}&mode=${mode}`;
    
    if (time) url += `&time=${time}`;
    if (date) url += `&date=${date}`;

    const response = await axios.get(url);
    if (response.data && response.data.plan && response.data.plan.itineraries && response.data.plan.itineraries.length > 0) {
      return response.data.plan.itineraries;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching route from OTP (${mode}):`, error.message);
    return null;
  }
};

const formulateOTPRoute = (itinerary, modeName, color) => {
  if (!itinerary) return null;
  
  let duration = itinerary.duration || 0; // usually in seconds
  let distance = 0;
  let rawTransfers = itinerary.transfers || 0;
  let safety_score = 8.0;
  let carbon_score = 2.0;
  let comfort_score = 8.0;
  let reliability_score = 8.5;
  
  itinerary.legs.forEach(leg => {
    distance += leg.distance || 0; // in meters
  });

  return {
    type: modeName,
    description: `OpenTripPlanner routing (${modeName})`,
    duration: duration,
    distance: distance,
    cost: rawTransfers * 10 + 20, // Estimating cost based on transfers
    safety_score: safety_score,
    carbon_score: carbon_score,
    comfort_score: comfort_score,
    reliability_score: reliability_score,
    transfers: rawTransfers,
    color: color,
    geometry: null, // You can extract geometry from leg.legGeometry.points (Polyline)
    mode: modeName.toLowerCase(),
    estimated_delay: 0,
    itinerary_details: itinerary
  };
};

module.exports = {
  getOTPRoute,
  formulateOTPRoute
};
