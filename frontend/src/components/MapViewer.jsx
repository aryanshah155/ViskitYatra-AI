import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to automatically fit bounds to route when it changes
function RouteFitter({ routeCoords }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length > 0) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoords, map]);
  return null;
}

export default function MapViewer({ points, geometry, selectedRoute, userLocation, theme = 'dark' }) {
  const [routeLine, setRouteLine] = useState([]);

  useEffect(() => {
    if (geometry && geometry.coordinates) {
      // OSRM returns [lng, lat], Leaflet needs [lat, lng]
      const coords = geometry.coordinates.map(c => [c[1], c[0]]);
      setRouteLine(coords);
    } else if (points) {
      setRouteLine([
        points.source,
        points.destination
      ]);
    }
  }, [points, geometry]);

  const defaultCenter = userLocation ? [userLocation.lat, userLocation.lng] : [19.0760, 72.8777];

  const tileUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={13} 
      className="w-full h-full" 
      zoomControl={false}
    >
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      {/* User Current Location Marker */}
      {userLocation && (
        <Circle 
          center={[userLocation.lat, userLocation.lng]} 
          radius={100} 
          pathOptions={{ color: '#cafd00', fillColor: '#cafd00', fillOpacity: 0.6, weight: 2 }} 
        />
      )}

      {points && (
        <>
          <Marker position={points.source} />
          <Marker position={points.destination} />
          
          {/* Terminal Pulse Indicators */}
          <Circle 
            center={points.source} 
            radius={200} 
            pathOptions={{ color: '#00f3ff', fillColor: '#00f3ff', fillOpacity: 0.8 }} 
          />
          <Circle 
            center={points.destination} 
            radius={200} 
            pathOptions={{ color: '#ff3131', fillColor: '#ff3131', fillOpacity: 0.8 }} 
          />

          {/* Glowing Highlight Path */}
          <Polyline 
            positions={routeLine} 
            color={selectedRoute?.color || '#00f3ff'} 
            weight={10} 
            opacity={0.3}
            className="highlight-glow"
          />
          
          <Polyline 
            positions={routeLine} 
            color={selectedRoute?.color || '#00f3ff'} 
            weight={4} 
            opacity={1}
            dashArray={selectedRoute?.type?.includes('Metro') ? "10, 10" : undefined}
          />
          <RouteFitter routeCoords={routeLine} />
        </>
      )}

    </MapContainer>
  );
}
