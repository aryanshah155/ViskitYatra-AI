import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MapViewer from './MapViewer';
import { toast } from 'react-hot-toast';

export default function RoutePanel() {
  const { user } = useAuth();
  const [sourceMode, setSourceMode] = useState('current'); // 'current' or 'manual'
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRoutePoints, setActiveRoutePoints] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeDebugPayload, setRouteDebugPayload] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapTheme, setMapTheme] = useState('dark');

  const travelModes = [
    { id: 'car', icon: 'directions_car', label: 'Car' },
    { id: 'bike', icon: 'directions_bike', label: 'Bike' },
    { id: 'walk', icon: 'directions_walk', label: 'Walk' },
    { id: 'bus', icon: 'directions_bus', label: 'Bus' },
    { id: 'train', icon: 'train', label: 'Train' }
  ];

  const normalizeRouteMode = (routeType) => {
    if (!routeType) return '';
    const normalized = routeType.toLowerCase();
    if (normalized.includes('car')) return 'car';
    if (normalized.includes('bike')) return 'bike';
    if (normalized.includes('walk') || normalized.includes('foot')) return 'walk';
    if (normalized.includes('bus')) return 'bus';
    if (normalized.includes('train') || normalized.includes('metro')) return 'train';
    return '';
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
        },
        (error) => {
          console.warn("Location access denied:", error.message);
        }
      );
    }

    // NEW: Load mission context from Dashboard persistence
    const savedChoice = localStorage.getItem('selectedTrajectory');
    const lastAiScan = localStorage.getItem('lastAiQuery');

    if (savedChoice) {
      const choice = JSON.parse(savedChoice);
      const queryContext = lastAiScan ? JSON.parse(lastAiScan) : null;
      const savedRoutes = localStorage.getItem('lastRouteOptions');
      
      if (savedRoutes) {
        const parsedRoutes = JSON.parse(savedRoutes);
        setRouteOptions(parsedRoutes);
        setSelectedRoute(choice || parsedRoutes[0]);
      }

      if (queryContext?.responseData?.json) {
         const json = queryContext.responseData.json;
         setOrigin(json.source === 'current_location' ? '' : (json.source || ''));
         setDestination(json.destination || '');
         setSourceMode(json.source === 'current_location' ? 'current' : 'manual');
         
         // Trigger auto-initialization of trajectory if we have enough data
         setTimeout(() => handleSearch(null, json), 500);
      }
      
      // Clear persistence after consumption to prevent infinite loops on reload
      localStorage.removeItem('selectedTrajectory');
    } else if (lastAiScan) {
      const { responseData } = JSON.parse(lastAiScan);
      const json = responseData.json || responseData;
      setOrigin(json.source === 'current_location' ? '' : (json.source || ''));
      setDestination(json.destination || '');
      setSourceMode(json.source === 'current_location' ? 'current' : 'manual');
      
      const savedRoutes = localStorage.getItem('lastRouteOptions');
      if (savedRoutes) {
        const parsedRoutes = JSON.parse(savedRoutes);
        setRouteOptions(parsedRoutes);
        setSelectedRoute(parsedRoutes[0]);
      }
    }
  }, []);

  const handleSearch = async (e, overrideContext = null) => {
    if (e) e.preventDefault();

    const currentOrigin = overrideContext ? overrideContext.source : origin;
    const currentDest = overrideContext ? overrideContext.destination : destination;
    const currentMode = overrideContext ? (overrideContext.source === 'current_location' ? 'current' : 'manual') : sourceMode;

    if (currentMode === 'manual' && (!currentOrigin || !currentOrigin.trim())) return;
    if (!currentDest || !currentDest.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      let fallbackGeocodeUsed = false;

      const finalSource = currentMode === 'current'
        ? { name: 'Current Location', lat: userLocation?.lat, lng: userLocation?.lng }
        : {
            name: currentOrigin.trim(),
            lat: overrideContext?.source_coords?.[0] ?? null,
            lng: overrideContext?.source_coords?.[1] ?? null
          };

      const finalDestination = {
        name: currentDest.trim(),
        lat: overrideContext?.dest_coords?.[0] ?? null,
        lng: overrideContext?.dest_coords?.[1] ?? null
      };

      if (currentMode === 'current' && (!userLocation || userLocation.lat == null || userLocation.lng == null)) {
        throw new Error('Unable to access current GPS location');
      }

      let geocodeUsed = false;
      let aiFallbackUsed = false;
      let aiJson = overrideContext || null;

      if (currentMode === 'manual') {
        try {
          const sourceGeo = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/geocode`, {
            headers: authHeaders.headers,
            params: { place: currentOrigin.trim() }
          });
          finalSource.lat = sourceGeo.data.lat;
          finalSource.lng = sourceGeo.data.lng;
          finalSource.name = sourceGeo.data.name || finalSource.name;
          geocodeUsed = true;
        } catch (err) {
          console.warn('Direct geocode failed for source:', currentOrigin, err.message);
          // Use fallback coords for known Mumbai areas
          const originLower = currentOrigin.toLowerCase().trim();
          if (originLower.includes('dahisar') || originLower.includes('dahi sar')) {
            finalSource.lat = 19.2502;
            finalSource.lng = 72.8591;
            finalSource.name = 'Dahisar';
          } else if (originLower.includes('andheri')) {
            finalSource.lat = 19.1136;
            finalSource.lng = 72.8465;
            finalSource.name = 'Andheri';
          } else if (originLower.includes('bandra') || originLower.includes('bandra west') || originLower.includes('bandra east')) {
            finalSource.lat = 19.0596;
            finalSource.lng = 72.8360;
            finalSource.name = 'Bandra';
          } else if (originLower.includes('thane')) {
            finalSource.lat = 19.2183;
            finalSource.lng = 72.9781;
            finalSource.name = 'Thane';
          } else if (originLower.includes('borivali') || originLower.includes('bori vali')) {
            finalSource.lat = 19.2307;
            finalSource.lng = 72.8590;
            finalSource.name = 'Borivali';
          } else if (originLower.includes('mulund') || originLower.includes('mu lund')) {
            finalSource.lat = 19.1718;
            finalSource.lng = 72.9557;
            finalSource.name = 'Mulund';
          } else if (originLower.includes('ghatkopar') || originLower.includes('ghat kopar')) {
            finalSource.lat = 19.0856;
            finalSource.lng = 72.9081;
            finalSource.name = 'Ghatkopar';
          } else if (originLower.includes('vashi')) {
            finalSource.lat = 19.0771;
            finalSource.lng = 72.9986;
            finalSource.name = 'Vashi';
          } else if (originLower.includes('virar') || originLower.includes('vi rar')) {
            finalSource.lat = 19.4559;
            finalSource.lng = 72.7926;
            finalSource.name = 'Virar';
          } else if (originLower.includes('dadar') || originLower.includes('da dar')) {
            finalSource.lat = 19.0197;
            finalSource.lng = 72.8426;
            finalSource.name = 'Dadar';
          } else if (originLower.includes('cst') || originLower.includes('churchgate') || originLower.includes('vt')) {
            finalSource.lat = 18.9400;
            finalSource.lng = 72.8347;
            finalSource.name = 'CST';
          } else if (originLower.includes('powai') || originLower.includes('po wai')) {
            finalSource.lat = 19.1234;
            finalSource.lng = 72.9044;
            finalSource.name = 'Powai';
          } else if (originLower.includes('juhu') || originLower.includes('ju hu')) {
            finalSource.lat = 19.1075;
            finalSource.lng = 72.8261;
            finalSource.name = 'Juhu';
          } else if (originLower.includes('colaba') || originLower.includes('co laba')) {
            finalSource.lat = 18.9067;
            finalSource.lng = 72.8147;
            finalSource.name = 'Colaba';
          }
          // Add more fallbacks as needed
        }
      }

      try {
        const destGeo = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/geocode`, {
          headers: authHeaders.headers,
          params: { place: currentDest.trim() }
        });
        finalDestination.lat = destGeo.data.lat;
        finalDestination.lng = destGeo.data.lng;
        finalDestination.name = destGeo.data.name || finalDestination.name;
        geocodeUsed = true;
      } catch (err) {
        console.warn('Direct geocode failed for destination:', currentDest, err.message);
        // Use fallback coords for known Mumbai areas
        const destLower = currentDest.toLowerCase().trim();
        if (destLower.includes('dahisar') || destLower.includes('dahi sar')) {
          finalDestination.lat = 19.2502;
          finalDestination.lng = 72.8591;
          finalDestination.name = 'Dahisar';
        } else if (destLower.includes('andheri')) {
          finalDestination.lat = 19.1136;
          finalDestination.lng = 72.8465;
          finalDestination.name = 'Andheri';
        } else if (destLower.includes('bandra') || destLower.includes('bandra west') || destLower.includes('bandra east')) {
          finalDestination.lat = 19.0596;
          finalDestination.lng = 72.8360;
          finalDestination.name = 'Bandra';
        } else if (destLower.includes('thane')) {
          finalDestination.lat = 19.2183;
          finalDestination.lng = 72.9781;
          finalDestination.name = 'Thane';
        } else if (destLower.includes('borivali') || destLower.includes('bori vali')) {
          finalDestination.lat = 19.2307;
          finalDestination.lng = 72.8590;
          finalDestination.name = 'Borivali';
        } else if (destLower.includes('mulund') || destLower.includes('mu lund')) {
          finalDestination.lat = 19.1718;
          finalDestination.lng = 72.9557;
          finalDestination.name = 'Mulund';
        } else if (destLower.includes('ghatkopar') || destLower.includes('ghat kopar')) {
          finalDestination.lat = 19.0856;
          finalDestination.lng = 72.9081;
          finalDestination.name = 'Ghatkopar';
        } else if (destLower.includes('vashi')) {
          finalDestination.lat = 19.0771;
          finalDestination.lng = 72.9986;
          finalDestination.name = 'Vashi';
        } else if (destLower.includes('virar') || destLower.includes('vi rar')) {
          finalDestination.lat = 19.4559;
          finalDestination.lng = 72.7926;
          finalDestination.name = 'Virar';
        } else if (destLower.includes('dadar') || destLower.includes('da dar')) {
          finalDestination.lat = 19.0197;
          finalDestination.lng = 72.8426;
          finalDestination.name = 'Dadar';
        } else if (destLower.includes('cst') || destLower.includes('churchgate') || destLower.includes('vt')) {
          finalDestination.lat = 18.9400;
          finalDestination.lng = 72.8347;
          finalDestination.name = 'CST';
        } else if (destLower.includes('powai') || destLower.includes('po wai')) {
          finalDestination.lat = 19.1234;
          finalDestination.lng = 72.9044;
          finalDestination.name = 'Powai';
        } else if (destLower.includes('juhu') || destLower.includes('ju hu')) {
          finalDestination.lat = 19.1075;
          finalDestination.lng = 72.8261;
          finalDestination.name = 'Juhu';
        } else if (destLower.includes('colaba') || destLower.includes('co laba')) {
          finalDestination.lat = 18.9067;
          finalDestination.lng = 72.8147;
          finalDestination.name = 'Colaba';
        }
        // Add more fallbacks as needed
      }

      if ((currentMode === 'manual' && (!finalSource.lat || !finalSource.lng)) || (!finalDestination.lat || !finalDestination.lng)) {
        try {
          const aiPrompt = currentMode === 'manual'
            ? `Resolve GPS coordinates for: ${currentOrigin} to ${currentDest}`
            : `Resolve GPS coordinates for current location to: ${currentDest}`;

          const aiRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/ai-query`, { query: aiPrompt }, authHeaders);
          aiJson = aiRes.data.json || aiRes.data;
          aiFallbackUsed = true;
        } catch (error) {
          console.warn('AI coordinate resolution failed, no coordinates resolved', error.message);
        }
      }

      if (currentMode === 'manual' && aiJson?.source_coords?.length === 2 && (!finalSource.lat || !finalSource.lng)) {
        finalSource.lat = aiJson.source_coords[0];
        finalSource.lng = aiJson.source_coords[1];
        finalSource.name = aiJson.source || finalSource.name;
      }

      if (aiJson?.dest_coords?.length === 2 && (!finalDestination.lat || !finalDestination.lng)) {
        finalDestination.lat = aiJson.dest_coords[0];
        finalDestination.lng = aiJson.dest_coords[1];
        finalDestination.name = aiJson.destination || finalDestination.name;
      }

      if (geocodeUsed || aiFallbackUsed) {
        toast(aiFallbackUsed ? 'Using AI fallback coordinates / direct geocode resolution' : 'Using direct geocode resolution', { icon: '⚠️' });
        console.debug('RoutePanel: route lookup data', {
          source: currentOrigin,
          destination: currentDest,
          finalSource,
          finalDestination,
          geocodeUsed,
          aiFallbackUsed
        });
      }

      if (currentMode === 'manual' && finalSource.lat && finalSource.lng) {
        setOrigin(finalSource.name);
      }
      if (finalDestination.lat && finalDestination.lng) {
        setDestination(finalDestination.name);
      }

      setRouteDebugPayload({
        source: finalSource,
        destination: finalDestination,
        usedAiFallback: aiFallbackUsed,
      });

      if (finalSource.lat == null || finalSource.lng == null || finalDestination.lat == null || finalDestination.lng == null) {
        throw new Error('Route coordinates could not be resolved');
      }

      if (aiJson?.source && currentMode === 'manual') {
        setOrigin(aiJson.source === 'current_location' ? '' : aiJson.source);
      }
      if (aiJson?.destination) {
        setDestination(aiJson.destination);
      }

      const routeRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/multi-modal-route`, {
        source: finalSource,
        destination: finalDestination,
        preferences: { 
          safety: 'medium',
          speed: 'medium',
          budget: 'medium',
          comfort: 'medium',
          green: false,
          time: new Date().toTimeString().slice(0, 5) // Current time in HH:MM format
        }
      }, authHeaders);

      const result = routeRes.data;
      const options = result.options || [];
      setRouteOptions(options);
      setSelectedRoute(options[0] || null);
      setRouteGeometry(options[0]?.geometry || result.rawOsrmRoute?.routes?.[0]?.geometry || null);
      setActiveRoutePoints({
        source: [finalSource.lat, finalSource.lng],
        destination: [finalDestination.lat, finalDestination.lng]
      });

      localStorage.setItem('lastRouteOptions', JSON.stringify(options));
      localStorage.setItem('selectedTrajectory', JSON.stringify(options[0] || null));

      if (options.length > 0) {
        toast.success(`Mission Path Calculated: ${options.length} options found`);
      } else {
        toast.error('Tactical failure: No routes identified');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Uplink error: System unable to process trajectory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-64px)] bg-background relative overflow-hidden font-body">
      
      {/* Left Sidebar: Routes Management */}
      <aside className="w-[400px] bg-surface-container-low border-r border-outline-variant/15 flex flex-col overflow-y-auto no-scrollbar z-20">
        <div className="p-6 space-y-8">
          {/* Route Planner Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface">Route Planner</h2>
              <div className="flex bg-surface-container-highest rounded-lg p-1">
                <button 
                  onClick={() => setSourceMode('current')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${sourceMode === 'current' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  GPS
                </button>
                <button 
                  onClick={() => setSourceMode('manual')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${sourceMode === 'manual' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Manual
                </button>
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm">{sourceMode === 'current' ? 'my_location' : 'edit_location'}</span>
                <input 
                  className={`w-full bg-surface-container-highest border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-secondary text-on-surface placeholder-on-surface-variant/40 transition-opacity ${sourceMode === 'current' ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`} 
                  placeholder={sourceMode === 'current' ? "Using GPS Signal..." : "Enter Source Address..."} 
                  type="text"
                  value={sourceMode === 'current' ? 'My Current Location' : origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  disabled={sourceMode === 'current'}
                />
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-error text-sm">location_on</span>
                <input 
                  className="w-full bg-surface-container-highest border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-secondary text-on-surface placeholder-on-surface-variant/40" 
                  placeholder="Enter Destination..." 
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-on-secondary py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mt-2">
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-sm">search</span>}
                 {loading ? 'Scanning Nodes...' : 'Generate Trajectory'}
              </button>
            </form>

            {routeDebugPayload && (
              <div className="mt-4 bg-surface-container-highest border border-outline-variant/10 rounded-xl p-4 text-[10px] text-on-surface-variant font-mono">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="font-black uppercase tracking-[0.2em] text-on-surface">Debug Payload</span>
                  <span className="text-[9px] uppercase text-secondary">{routeDebugPayload.usedAiFallback ? 'AI fallback used' : 'Direct geocode used'}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-[0.2em] mb-1">Source</p>
                    <pre className="overflow-x-auto rounded-lg bg-background/10 p-2">{JSON.stringify(routeDebugPayload.source, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-[0.2em] mb-1">Destination</p>
                    <pre className="overflow-x-auto rounded-lg bg-background/10 p-2">{JSON.stringify(routeDebugPayload.destination, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 pt-2">
              {travelModes.map((mode) => (
                <button 
                  key={mode.id} 
                  onClick={() => {
                    const found = routeOptions.find(r => normalizeRouteMode(r.type) === mode.id);
                    if (found) {
                      setSelectedRoute(found);
                      setRouteGeometry(found.geometry || routeGeometry);
                    }
                  }}
                  className={`flex-none flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all border ${normalizeRouteMode(selectedRoute?.type) === mode.id ? 'bg-primary text-on-primary border-primary shadow-lg' : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/10 hover:border-primary/20'}`}
                >
                  <span className="material-symbols-outlined text-xl">{mode.icon}</span>
                  <span className="text-[8px] font-headline font-black uppercase tracking-tighter mt-1">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intelligence Feed */}
          <div className="space-y-4">
            <h3 className="font-headline text-xs font-bold tracking-widest text-on-surface-variant uppercase italic opacity-60">Strategic Trajectories</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
              {routeOptions.length > 0 ? routeOptions.map((route, i) => (
                <div 
                  key={i}
                  onClick={() => {
                    setSelectedRoute(route);
                    setRouteGeometry(route.geometry || routeGeometry);
                    localStorage.setItem('selectedTrajectory', JSON.stringify(route));
                  }}
                  className={`bg-surface-container rounded-xl p-4 border transition-all cursor-pointer relative overflow-hidden ${selectedRoute === route ? 'border-primary shadow-lg' : 'border-outline-variant/10 hover:border-primary/20'}`}
                >
                  <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-r from-transparent to-primary/30"></div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-headline font-bold text-sm text-on-surface uppercase tracking-tight">{route.type}</h4>
                      <p className="text-[9px] text-on-surface-variant opacity-60 uppercase font-mono tracking-tighter">{route.description || 'Optimized Path'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                       <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded italic mb-1">{route.safety_score.toFixed(1)}/10 SAFE</div>
                       <p className="text-[14px] font-black text-on-surface">{(route.duration/60).toFixed(0)}m</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 flex flex-col items-center opacity-30">
                  <span className="material-symbols-outlined text-3xl mb-2">radar</span>
                  <p className="text-[9px] font-black uppercase tracking-widest">Awaiting Trajectory Input...</p>
                </div>
              )}
            </div>
          </div>

          {/* Selection Breakdown */}
          {selectedRoute && (
            <div className="pt-6 border-t border-outline-variant/15 space-y-6">
              <h3 className="font-headline text-xs font-bold tracking-widest text-on-surface-variant uppercase italic opacity-60">Selection Breakdown</h3>
              <div className="relative pl-8 space-y-6">
                {['Initial Transit', 'Main Trajectory', 'Final Approach'].map((step, s) => (
                  <div key={s} className="relative">
                    <div className={`absolute -left-8 top-0 w-6 h-6 rounded-full bg-surface-container-highest border-2 flex items-center justify-center z-10 ${s === 0 ? 'border-primary' : s === 1 ? 'border-secondary' : 'border-tertiary'}`}>
                       <span className="material-symbols-outlined text-[12px]">{s === 0 ? 'directions_walk' : s === 1 ? 'train' : 'electric_car'}</span>
                    </div>
                    {s < 2 && <div className={`absolute -left-[21px] top-6 w-[2px] h-6 bg-outline-variant/30`}></div>}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface uppercase tracking-tight">{step}</span>
                      <span className="text-[9px] text-on-surface-variant uppercase tracking-widest">Optimized Node Sync</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Map Viewport */}
      <div className="flex-1 relative bg-background">
        <MapViewer 
          points={activeRoutePoints} 
          geometry={routeGeometry || selectedRoute?.geometry}
          theme={mapTheme}
          selectedRoute={selectedRoute ? {
            ...selectedRoute,
            color: mapTheme === 'dark' 
              ? (selectedRoute.type === 'Fastest' ? '#00f3ff' : 
                 selectedRoute.type === 'Safest' ? '#bc13fe' : 
                 selectedRoute.type === 'Eco' ? '#cafd00' : selectedRoute.color || '#ff3131')
              : (selectedRoute.type === 'Fastest' ? '#005f73' : 
                 selectedRoute.type === 'Safest' ? '#5b21b6' : 
                 selectedRoute.type === 'Eco' ? '#166534' : selectedRoute.color || '#991b1b')
          } : null} 
          userLocation={userLocation} 
        />
        
        {/* HUD: HUD elements here... (omitted for brevity but kept similar) */}
        <div className="absolute top-8 left-8 z-10 pointer-events-none space-y-4">
           {selectedRoute && (
             <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-5 animate-in slide-in-from-top duration-500">
               <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                 <span className="material-symbols-outlined text-primary text-2xl animate-pulse">radar</span>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] opacity-60">Active Intelligence</p>
                  <h2 className="text-2xl font-headline font-black text-on-surface tracking-tighter italic">ETA: {(selectedRoute?.duration/60).toFixed(0)} MIN</h2>
               </div>
             </div>
           )}
        </div>

        {/* Tactical Controls - High Z-Index & Reduced Size */}
        <div className="absolute bottom-8 right-8 flex items-end gap-3 z-[1000]">
          <div className="glass-panel p-1.5 rounded-xl border border-white/10 flex flex-col gap-1.5 shadow-2xl bg-surface-container/60">
            <button 
              onClick={() => setMapTheme(mapTheme === 'dark' ? 'light' : 'dark')}
              className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center transition-all ${mapTheme === 'dark' ? 'bg-white/5 text-on-surface hover:bg-white/10' : 'bg-secondary text-on-secondary shadow-lg'}`}
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[18px]">{mapTheme === 'dark' ? 'brightness_high' : 'dark_mode'}</span>
              <span className="text-[7px] font-black uppercase mt-0.5 tracking-tighter">{mapTheme === 'dark' ? 'LIT' : 'DRK'}</span>
            </button>
            <div className="h-px bg-white/10 mx-1.5"></div>
            <button className="w-11 h-11 rounded-lg bg-white/5 text-on-surface flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all">
              <span className="material-symbols-outlined text-[18px]">layers</span>
            </button>
          </div>
          <button 
            onClick={handleSearch}
            className="bg-primary-container text-on-primary-container font-headline font-black text-xs px-6 py-4 rounded-xl shadow-[0_10px_30px_rgba(202,253,0,0.2)] hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 group cyber-glow h-11"
          >
            <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">rocket_launch</span>
            INITIATE
          </button>
        </div>

        {/* Global Metadata */}
        <div className="absolute bottom-4 left-6 text-[10px] font-mono text-on-surface-variant/30 tracking-[0.25em] uppercase pointer-events-none">
          Sector_Alpha // {mapTheme === 'dark' ? 'Dark_Node_Active' : 'Light_Node_Active'} // Sync_Status: Optic_Stable
        </div>
      </div>
    </div>
  );
}
