/**
 * Advanced Graph Service
 * Implements sophisticated multi-modal A* routing with:
 * - Real transit network data
 * - Time-aware traffic prediction
 * - Transfer penalties and waiting times
 * - Dynamic cost calculation
 * - Safety and environmental scoring
 */

const mlService = require('./mlService');
const routingService = require('./routingService');
const otpService = require('./otpService');
const db = require('../db');

/**
 * Calculate straight-line distance between two points (Haversine formula)
 */
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Find nearest transit stations to coordinates
 */
const findNearestStations = async (lat, lng, type, limit = 3) => {
  try {
    const query = `
      SELECT id, name, type,
             ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng,
             ST_Distance(geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)) as distance
      FROM nodes
      WHERE type = $3
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
      LIMIT $4
    `;
    const result = await db.query(query, [lat, lng, type, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error finding nearest stations:', error);
    return [];
  }
};

/**
 * Calculate transit route using actual network data
 */
const calculateTransitRoute = async (sourceLat, sourceLng, destLat, destLng, mode, timeOfDay) => {
  // Find nearest stations
  const sourceStations = await findNearestStations(sourceLat, sourceLng, mode === 'train' ? 'train_station' : 'bus_stop');
  const destStations = await findNearestStations(destLat, destLng, mode === 'train' ? 'train_station' : 'bus_stop');

  if (sourceStations.length === 0 || destStations.length === 0) {
    // Fallback to estimated route
    return {
      duration: calculateHaversineDistance(sourceLat, sourceLng, destLat, destLng) / (mode === 'train' ? 25 : 15), // m/s average speed
      distance: calculateHaversineDistance(sourceLat, sourceLng, destLat, destLng),
      cost: mode === 'train' ? 20 : 10,
      transfers: 0,
      geometry: null
    };
  }

  // For now, use distance-based estimation with transfer penalties
  const sourceStation = sourceStations[0];
  const destStation = destStations[0];

  const stationDistance = calculateHaversineDistance(sourceStation.lat, sourceStation.lng, destStation.lat, destStation.lng);
  const walkingToStation = sourceStation.distance * 1.2; // 20% buffer for walking
  const walkingFromStation = destStation.distance * 1.2;

  // Transit speed estimates (m/s)
  const transitSpeed = mode === 'train' ? 20 : 12; // trains faster than buses
  const transitTime = stationDistance / transitSpeed;

  // Add transfer/waiting time (5-10 minutes)
  const transferTime = 600; // 10 minutes average waiting + transfer

  const totalDuration = walkingToStation + transitTime + transferTime + walkingFromStation;
  const totalDistance = walkingToStation + stationDistance + walkingFromStation;

  return {
    duration: totalDuration,
    distance: totalDistance,
    cost: mode === 'train' ? Math.max(15, Math.floor(stationDistance / 1000) * 2) : Math.max(8, Math.floor(stationDistance / 1000) * 1.5),
    transfers: 1,
    geometry: null,
    stations: [sourceStation.name, destStation.name]
  };
};

/**
 * Advanced A* routing with multi-objective optimization
 */
const calculateMultiModalRoute = async (source, destination, preferences) => {
  const osrmCoordinates = `${source.lng},${source.lat};${destination.lng},${destination.lat}`;
  const timeOfDay = preferences.time || "12:00";

  // Get ML predictions for each route mode
  const distanceKm = calculateHaversineDistance(source.lat, source.lng, destination.lat, destination.lng) / 1000;
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

  // Load construction zones once
  let constructionZones = [];
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../script/road.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let features = Array.isArray(data) ? data : (data.features || []);
      constructionZones = features.filter(r => {
        const status = r.properties?.location?.status || r.status;
        return status && status.toLowerCase() === 'in progress';
      }).map(f => {
        let coords = [];
        if (f.geometry?.type === 'LineString') coords = f.geometry.coordinates; // [[lng, lat]]
        else if (f.geometry?.type === 'MultiLineString') coords = f.geometry.coordinates.flat();
        else if (f.lat && f.lng) coords = [[f.lng, f.lat]];

        const status = f.properties?.location?.status || f.status;
        return { path: coords, status: status, lat: f.lat, lng: f.lng };
      });
    }
  } catch (err) {
    console.warn('Could not load construction zones for routing penalty');
  }

  // NEW: Load blackspots for Safest Route calculation
  let blackspots = [];
  try {
    const fs = require('fs');
    const path = require('path');
    const safePath = path.join(__dirname, '../../script/safe.json');
    if (fs.existsSync(safePath)) {
      const safeData = JSON.parse(fs.readFileSync(safePath, 'utf8'));
      blackspots = safeData.blackspots || [];
    }
  } catch (err) {
    console.warn('Could not load safe.json blackspots');
  }

  const getIntersectingBlackspots = (geometry) => {
    if (!geometry || !geometry.coordinates) return [];
    const hitBlackspots = [];
    const seenIds = new Set();

    for (let i = 0; i < geometry.coordinates.length; i += 5) {
      const coord = geometry.coordinates[i];
      for (const spot of blackspots) {
        if (seenIds.has(spot.id)) continue;
        if (calculateHaversineDistance(coord[1], coord[0], spot.lat, spot.lng) < 1000) { // 1km radius
          hitBlackspots.push(spot);
          seenIds.add(spot.id);
        }
      }
    }
    return hitBlackspots;
  };

  const getIntersectingZones = (geometry) => {
    if (!geometry || !geometry.coordinates) return [];
    const relevantZones = [];
    const seenIndices = new Set();

    // Sample the route points every 5 steps for efficiency
    for (let i = 0; i < geometry.coordinates.length; i += 5) {
      const coord = geometry.coordinates[i]; // [lng, lat]
      for (let j = 0; j < constructionZones.length; j++) {
        if (seenIndices.has(j)) continue;
        const zone = constructionZones[j];
        if (!zone.path) continue;

        for (const pt of zone.path) {
          // distance < 1km (1000 meters)
          if (calculateHaversineDistance(coord[1], coord[0], pt[1], pt[0]) < 1000) {
            relevantZones.push(zone);
            seenIndices.add(j);
            break;
          }
        }
      }
    }
    return relevantZones;
  };

  const resolveOptimalRoute = (routeData) => {
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      return { duration: 3600, distance: 5000, geometry: null, intersectingZones: [], initialPathGeom: null };
    }

    // Default shortest route given by OSRM
    const initialRoute = routeData.routes[0];
    const initialIntersections = getIntersectingZones(initialRoute.geometry);

    if (initialIntersections.length > 0) {
      // Find an alternate route within 1km difference that avoids construction
      const initialDistance = initialRoute.distance;
      const validAlternates = routeData.routes.slice(1).filter(alt => {
        return (alt.distance <= initialDistance + 1000) && (getIntersectingZones(alt.geometry).length === 0);
      });

      if (validAlternates.length > 0) {
        // Found valid alternate, take it and append the initial route geometry to render in red
        return {
          ...validAlternates[0],
          intersectingZones: [],
          hasAlternate: true,
          initialPathGeom: initialRoute.geometry,
          initialDuration: initialRoute.duration,
          initialDistance: initialRoute.distance,
          initialIntersectingZones: initialIntersections
        };
      } else {
        // No valid alternate in 1km limit, MUST take initial route through construction
        return {
          ...initialRoute,
          intersectingZones: initialIntersections,
          initialPathRed: true // Signals frontend to color it red
        };
      }
    }

    return { ...initialRoute, intersectingZones: [], initialPathGeom: null };
  };

  // Get enhanced predictions for each mode in parallel
  const [carPrediction, bikePrediction, walkPrediction, trainPrediction, busPrediction] = await Promise.all([
    mlService.predictRoute(source.name, destination.name, 'car', distanceKm, timeOfDay, isWeekend),
    mlService.predictRoute(source.name, destination.name, 'bike', distanceKm, timeOfDay, isWeekend),
    mlService.predictRoute(source.name, destination.name, 'walk', distanceKm, timeOfDay, isWeekend),
    mlService.predictRoute(source.name, destination.name, 'train', distanceKm, timeOfDay, isWeekend),
    mlService.predictRoute(source.name, destination.name, 'bus', distanceKm, timeOfDay, isWeekend)
  ]);

  // Parallel OSRM calls for road-based modes
  const [carRoute, footRoute, bikeRoute] = await Promise.all([
    routingService.getRoute(osrmCoordinates, 'car'),
    routingService.getRoute(osrmCoordinates, 'foot'),
    routingService.getRoute(osrmCoordinates, 'bike')
  ]);

  // Calculate transit routes using real network data
  const [trainRoute, busRoute] = await Promise.all([
    calculateTransitRoute(source.lat, source.lng, destination.lat, destination.lng, 'train', timeOfDay),
    calculateTransitRoute(source.lat, source.lng, destination.lat, destination.lng, 'bus', timeOfDay)
  ]);

  // Fetch OpenTripPlanner Routes
  const [otpTransitItineraries, otpWalkItineraries, otpBikeItineraries] = await Promise.all([
    otpService.getOTPRoute(source.lat, source.lng, destination.lat, destination.lng, 'TRANSIT,WALK'),
    otpService.getOTPRoute(source.lat, source.lng, destination.lat, destination.lng, 'WALK'),
    otpService.getOTPRoute(source.lat, source.lng, destination.lat, destination.lng, 'BICYCLE')
  ]);

  // Fallback geometries and complex logic metrics
  const safeCar = resolveOptimalRoute(carRoute);
  const safeBike = resolveOptimalRoute(bikeRoute);
  const safeFoot = resolveOptimalRoute(footRoute);

  // Dynamic safety scoring based on time and location
  const hour = parseInt(timeOfDay.split(':')[0]);
  const isNight = hour >= 22 || hour <= 5;
  const isPeak = (7 <= hour && hour <= 9) || (17 <= hour && hour <= 19);

  const routes = [
    {
      type: 'Car/Cab',
      description: carRoute ? (safeCar.initialPathRed ? 'Construction path taken (No alt within 1km)' : (safeCar.hasAlternate ? 'Optimized detour mapping' : 'Optimized road network routing')) : 'Estimated routing',
      duration: safeCar.duration * carPrediction.traffic_multiplier + (carPrediction.estimated_delay_minutes * 60),
      distance: safeCar.distance,
      cost: Math.max(50, Math.floor(safeCar.distance / 1000) * 15),
      safety_score: carPrediction.safety_score,
      carbon_score: carPrediction.carbon_score,
      comfort_score: carPrediction.comfort_score,
      reliability_score: carPrediction.reliability_score,
      transfers: 0,
      color: safeCar.initialPathRed ? '#44d0efff' : '#449cefff',
      geometry: safeCar.geometry,
      mode: 'car',
      estimated_delay: carPrediction.estimated_delay_minutes,
      initialPathGeom: safeCar.initialPathGeom,
      initialPathRed: safeCar.initialPathRed
    },
    {
      type: 'Bike',
      description: bikeRoute ? (safeBike.initialPathRed ? 'Construction path taken (No alt within 1km)' : (safeBike.hasAlternate ? 'Optimized cyclic detour' : 'Cycle-friendly optimization')) : 'Estimated routing',
      duration: safeBike.duration * bikePrediction.traffic_multiplier + (bikePrediction.estimated_delay_minutes * 60),
      distance: safeBike.distance,
      cost: 0,
      safety_score: bikePrediction.safety_score,
      carbon_score: bikePrediction.carbon_score,
      comfort_score: bikePrediction.comfort_score,
      reliability_score: bikePrediction.reliability_score,
      transfers: 0,
      color: safeBike.initialPathRed ? '#fbbf24' : '#fbbf24',
      geometry: safeBike.geometry,
      mode: 'bike',
      estimated_delay: bikePrediction.estimated_delay_minutes,
      initialPathGeom: safeBike.initialPathGeom,
      initialPathRed: safeBike.initialPathRed
    },
    {
      type: 'Walk',
      description: footRoute ? (safeFoot.initialPathRed ? 'Construction path taken (No alt within 1km)' : (safeFoot.hasAlternate ? 'Pedestrian detour bypass' : 'Pedestrian-optimized routing')) : 'Estimated routing',
      duration: safeFoot.duration * walkPrediction.traffic_multiplier + (walkPrediction.estimated_delay_minutes * 60),
      distance: safeFoot.distance,
      cost: 0,
      safety_score: walkPrediction.safety_score,
      carbon_score: walkPrediction.carbon_score,
      comfort_score: walkPrediction.comfort_score,
      reliability_score: walkPrediction.reliability_score,
      transfers: 0,
      color: safeFoot.initialPathRed ? '#0ea5e9' : '#0ea5e9',
      geometry: safeFoot.geometry,
      mode: 'walk',
      estimated_delay: walkPrediction.estimated_delay_minutes,
      initialPathGeom: safeFoot.initialPathGeom,
      initialPathRed: safeFoot.initialPathRed
    },
    {
      type: 'Train/Metro',
      description: trainRoute.stations ? `Rail route: ${trainRoute.stations.join(' → ')}` : 'Rail network routing (Estimated)',
      duration: trainRoute.duration + (trainPrediction.estimated_delay_minutes * 60),
      distance: trainRoute.distance,
      cost: trainRoute.cost,
      safety_score: trainPrediction.safety_score,
      carbon_score: trainPrediction.carbon_score,
      comfort_score: trainPrediction.comfort_score,
      reliability_score: trainPrediction.reliability_score,
      transfers: trainRoute.transfers,
      color: '#bc13fe',
      geometry: null,
      mode: 'train',
      stations: trainRoute.stations,
      estimated_delay: trainPrediction.estimated_delay_minutes
    },
    {
      type: 'Bus',
      description: busRoute.stations ? `Bus route: ${busRoute.stations.join(' → ')}` : 'Bus network routing (Estimated)',
      duration: busRoute.duration + (busPrediction.estimated_delay_minutes * 60),
      distance: busRoute.distance,
      cost: busRoute.cost,
      safety_score: busPrediction.safety_score,
      carbon_score: busPrediction.carbon_score,
      comfort_score: busPrediction.comfort_score,
      reliability_score: busPrediction.reliability_score,
      transfers: busRoute.transfers,
      color: '#10b981',
      geometry: null,
      mode: 'bus',
      stations: busRoute.stations,
      estimated_delay: busPrediction.estimated_delay_minutes
    }
  ];

  if (otpTransitItineraries && otpTransitItineraries.length > 0) {
    const otpTransitRoute = otpService.formulateOTPRoute(otpTransitItineraries[0], 'OTP Transit', '#ff00ff');
    if (otpTransitRoute) routes.push(otpTransitRoute);
  }

  if (otpWalkItineraries && otpWalkItineraries.length > 0) {
    const otpWalkRoute = otpService.formulateOTPRoute(otpWalkItineraries[0], 'OTP Walk', '#00ff00');
    if (otpWalkRoute) routes.push(otpWalkRoute);
  }

  if (otpBikeItineraries && otpBikeItineraries.length > 0) {
    const otpBikeRoute = otpService.formulateOTPRoute(otpBikeItineraries[0], 'OTP Bike', '#ff8800');
    if (otpBikeRoute) routes.push(otpBikeRoute);
  }

  // Advanced A* scoring with multiple objectives
  const weights = {
    time: preferences.optimization === 'speed' ? 5.0 : (preferences.speed === 'high' ? 3.0 : 1.0),
    cost: preferences.budget === 'high' ? 2.0 : 1.0,
    safety: preferences.optimization === 'safety' ? 5.0 : (preferences.safety === 'high' ? 2.5 : 1.0),
    comfort: preferences.comfort === 'high' ? 1.5 : 0.5,
    environment: preferences.green === true ? 2.0 : 0.5,
    distance: 0.3, // Small penalty for longer routes
    transfers: 0.8 // Penalty for transfers
  };

  routes.forEach(route => {
    // Normalize scores to 0-1 range for fair comparison
    const normalizedTime = Math.min(route.duration / 7200, 1); // Max 2 hours
    const normalizedCost = Math.min(route.cost / 500, 1); // Max ₹500
    const normalizedDistance = Math.min(route.distance / 50000, 1); // Max 50km
    const normalizedSafety = (route.safety_score || 5) / 10;
    const normalizedComfort = (route.comfort_score || 5) / 10;
    const normalizedCarbon = (route.carbon_score || 1) / 10;
    const normalizedTransfers = Math.min((route.transfers || 0) / 3, 1); // Max 3 transfers

    // Apply severe penalty if route intersects with construction zones
    const relevantZones = getIntersectingZones(route.geometry);
    const intersections = relevantZones.length;

    // Apply penalty for blackspots (from safe.json)
    const hitBlackspots = getIntersectingBlackspots(route.geometry);
    const blackspotCount = hitBlackspots.length;

    // Attach zones and blackspots to route object
    route.intersectingZones = route.intersectingZones || relevantZones;
    route.blackspots = hitBlackspots;

    if (intersections > 0) {
      route.safety_score = Math.max(1, (route.safety_score || 5) - (intersections * 2)); // Severe safety drop
      if (!route.hasAlternate) {
        route.description = `[CONSTRUCTION WARNING] ${route.description}`;
      }
      route.cost += intersections * 20; // Increase cost metric to deter A*
    }

    if (blackspotCount > 0) {
      route.safety_score = Math.max(1, (route.safety_score || 5) - (blackspotCount * 1.5));
      route.description = `[SAFETY WARNING: ${hitBlackspots[0].location_name}] ${route.description}`;
    }

    const constructionPenalty = intersections * 5.0;
    const blackspotPenalty = blackspotCount * 4.0;

    // A* score: f(n) = g(n) + h(n)
    route.score = (
      normalizedTime * weights.time +
      normalizedCost * weights.cost +
      (1 - normalizedSafety) * weights.safety +
      (1 - normalizedComfort) * weights.comfort +
      normalizedCarbon * weights.environment +
      normalizedDistance * weights.distance +
      normalizedTransfers * weights.transfers +
      constructionPenalty +
      blackspotPenalty
    );
  });

  // Sort by A* score (lower is better)
  routes.sort((a, b) => a.score - b.score);

  // Ensure 'Car/Cab' is always the first option in the list as per tactical priority
  const carIndex = routes.findIndex(r => r.type === 'Car/Cab');
  if (carIndex > 0) {
    const carRoute = routes.splice(carIndex, 1)[0];
    routes.unshift(carRoute);
  }

  routes.forEach((route, index) => {
    route.rank = index + 1;
    route.recommended = index === 0;
  });

  return {
    rawOsrmRoute: carRoute,
    options: routes,
    recommended: routes[0],
    preferences: preferences,
    timeOfDay: timeOfDay,
    ai_explanation: generateRouteExplanation(routes[0], preferences, carPrediction)
  };
};

/**
 * Generate AI-powered route explanation
 */
const generateRouteExplanation = (bestRoute, preferences, prediction) => {
  const reasons = [];

  if (preferences.speed === 'high' && bestRoute.duration < 1800) {
    reasons.push("fastest option");
  }

  if (preferences.safety === 'high' && bestRoute.safety_score > 8) {
    reasons.push("safest route");
  }

  if (preferences.green && bestRoute.carbon_score < 3) {
    reasons.push("most environmentally friendly");
  }

  if (preferences.budget === 'high' && bestRoute.cost < 50) {
    reasons.push("most economical");
  }

  if (bestRoute.comfort_score > 8) {
    reasons.push("most comfortable");
  }

  if (bestRoute.transfers === 0) {
    reasons.push("no transfers required");
  }

  if (bestRoute.reliability_score > 8.5) {
    reasons.push("highly reliable");
  }

  const reasonText = reasons.length > 0 ? reasons.join(", ") : "optimal balance of factors";

  const delayText = bestRoute.estimated_delay > 0 ? ` (estimated delay: ${bestRoute.estimated_delay}min)` : "";

  return `Strategic analysis recommends ${bestRoute.type} as the optimal route based on ${reasonText}. Current traffic multiplier: ${prediction.traffic_multiplier.toFixed(2)}x, Safety score: ${bestRoute.safety_score}/10${delayText}.`;
};

module.exports = {
  calculateMultiModalRoute
};
