const db = require('../db');

/**
 * Geocoding Service
 * Resolves place names to GPS coordinates using the PostGIS-indexed OSM data.
 */
const resolvePlaceToCoords = async (placeName) => {
  if (!placeName) return null;

  try {
    const searchTerm = placeName.trim().toLowerCase();

    // First, search our custom nodes table for known locations
    const customQuery = `
      SELECT name, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng, type
      FROM nodes
      WHERE LOWER(name) LIKE LOWER($1)
      OR LOWER(name) LIKE LOWER($2)
      ORDER BY
        CASE
          WHEN LOWER(name) = LOWER($3) THEN 1
          WHEN LOWER(name) LIKE LOWER($4) THEN 2
          ELSE 3
        END
      LIMIT 1;
    `;

    let res = await db.query(customQuery, [
      `%${searchTerm}%`,
      `${searchTerm}%`,
      searchTerm,
      `${searchTerm}%`
    ]);

    if (res.rows.length > 0) {
      return {
        name: res.rows[0].name,
        lat: res.rows[0].lat,
        lng: res.rows[0].lng,
        type: res.rows[0].type
      };
    }

    // Fallback to OSM tables if custom search fails
    // Search in points first (landmarks, stations, shops)
    const pointQuery = `
      SELECT name, ST_Y(way) as lat, ST_X(way) as lng
      FROM planet_osm_point
      WHERE LOWER(name) LIKE LOWER($1)
      OR LOWER(name) LIKE LOWER($2)
      LIMIT 1;
    `;

    res = await db.query(pointQuery, [`%${searchTerm}%`, `${searchTerm}%`]);

    if (res.rows.length === 0) {
      // Search in polygons (buildings, parks, areas)
      const polyQuery = `
        SELECT name, ST_Y(ST_Centroid(way)) as lat, ST_X(ST_Centroid(way)) as lng
        FROM planet_osm_polygon
        WHERE LOWER(name) LIKE LOWER($1)
        OR LOWER(name) LIKE LOWER($2)
        LIMIT 1;
      `;
      res = await db.query(polyQuery, [`%${searchTerm}%`, `${searchTerm}%`]);
    }

    if (res.rows.length > 0) {
      return {
        name: res.rows[0].name,
        lat: res.rows[0].lat,
        lng: res.rows[0].lng
      };
    }

    return null;
  } catch (err) {
    console.error('PostGIS Geocoding Error:', err.message);
    return null;
  }
};

module.exports = {
  resolvePlaceToCoords
};
