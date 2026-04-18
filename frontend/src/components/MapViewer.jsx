import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, Tooltip } from 'react-leaflet';
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
  const [constructionZones, setConstructionZones] = useState([]);

  const [initialLine, setInitialLine] = useState([]);

  useEffect(() => {
    // Collect all unique intersecting zones from the selected route and its initial path
    const zones = [];
    const seenHashes = new Set();

    const addZones = (zList) => {
      if (!zList || !Array.isArray(zList)) return;
      zList.forEach(z => {
        const hash = z.path && z.path.length > 0 
          ? `path-${z.path[0][0]}-${z.path[0][1]}` 
          : `point-${z.lng}-${z.lat}`;
        
        if (!seenHashes.has(hash)) {
          zones.push(z);
          seenHashes.add(hash);
        }
      });
    };

    if (selectedRoute) {
      addZones(selectedRoute.intersectingZones);
      addZones(selectedRoute.initialIntersectingZones);
    }
    
    setConstructionZones(zones);
  }, [selectedRoute]);

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

    if (selectedRoute && selectedRoute.initialPathGeom && selectedRoute.initialPathGeom.coordinates) {
       setInitialLine(selectedRoute.initialPathGeom.coordinates.map(c => [c[1], c[0]]));
    } else {
       setInitialLine([]);
    }
  }, [points, geometry, selectedRoute]);

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

      {/* Blackspots Rendering */}
      {selectedRoute?.blackspots?.map((spot) => (
        <React.Fragment key={`bs-frag-${spot.id}`}>
          <Circle 
            center={[spot.lat, spot.lng]} 
            radius={150} 
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.2, weight: 2 }}
            className="neon-glow-yellow" 
          >
            <Tooltip direction="top" opacity={1}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px] text-yellow-500">warning</span>
                  <span className="text-yellow-500 font-black uppercase text-[10px] tracking-widest">BLACKSPOT: {spot.severity}</span>
                </div>
                <p className="text-white text-[11px] font-bold">{spot.location_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-white/50 uppercase">Risk Level</span>
                  <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 rounded">{spot.risk_score}/10</span>
                </div>
                {spot.suggested_action && (
                  <p className="text-[9px] text-white/70 italic mt-1 border-t border-white/10 pt-1">Tactical Opt: {spot.suggested_action}</p>
                )}
              </div>
            </Tooltip>
          </Circle>
          
          {/* Pulsing focal point */}
          <Circle 
            center={[spot.lat, spot.lng]} 
            radius={20} 
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.8, weight: 1 }}
            className="animate-pulse" 
          />
        </React.Fragment>
      ))}

      {/* Construction Zones */}
      {constructionZones.map((zone, idx) => {
        // Convert [lng, lat] from GeoJSON to [lat, lng] for Leaflet
        const coords = zone.path ? zone.path.map(c => [c[1], c[0]]) : [[zone.lat, zone.lng]];
        
        return (
          <React.Fragment key={`cz-frag-${idx}`}>
            <Polyline 
              positions={coords} 
              pathOptions={{ color: '#ff073a', opacity: 0.8, weight: 6, dashArray: '8 8' }}
              className="neon-glow-red" 
            >
              {zone.status && (
                <Tooltip sticky opacity={1}>
                  <span className="text-[#ff073a] font-bold uppercase text-[10px] tracking-widest drop-shadow-md">Construction: {zone.status}</span>
                </Tooltip>
              )}
            </Polyline>
            <Circle 
              key={`cz-${idx}`}
              center={coords[0] || [0,0]} 
              radius={30} 
              pathOptions={{ color: '#ff073a', fillColor: '#ff073a', fillOpacity: 0.15, opacity: 0.4, weight: 2 }}
              className="neon-glow-red" 
            >
              {zone.status && (
                <Tooltip direction="top" opacity={1}>
                  <span className="text-[#ff073a] font-bold uppercase text-[10px] tracking-widest drop-shadow-md">Construction: {zone.status}</span>
                </Tooltip>
              )}
            </Circle>
          </React.Fragment>
        );
      })}

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

          {/* Old Blocked Initial Path Renderer */}
          {initialLine.length > 0 && (
             <>
                <Polyline 
                  positions={initialLine} 
                  color="#ff073a" 
                  weight={10} 
                  opacity={0.15}
                  className="highlight-glow"
                />
                <Polyline 
                  positions={initialLine} 
                  color="#ff073a" 
                  weight={4} 
                  opacity={0.8}
                  dashArray="5, 10"
                >
                  <Tooltip direction="top" sticky>
                     <div className="flex flex-col items-center">
                        <span className="text-[#ff073a] font-bold uppercase text-[10px] tracking-widest drop-shadow-md">⚠️ Blocked Initial Trajectory</span>
                        <span className="text-[9px] text-white/70 font-mono mt-1">EST. TIME: {(selectedRoute.initialDuration/60).toFixed(0)} MINS</span>
                     </div>
                  </Tooltip>
                </Polyline>
             </>
          )}

          {/* Glowing Highlight New Routed Path */}
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
            weight={selectedRoute?.initialPathRed ? 4 : (selectedRoute?.hasAlternate ? 6 : 4)} 
            opacity={1}
            dashArray={selectedRoute?.type?.includes('Metro') || selectedRoute?.initialPathRed ? "10, 10" : undefined}
          />
          <RouteFitter routeCoords={[...routeLine, ...initialLine]} />
        </>
      )}

    </MapContainer>
  );
}
