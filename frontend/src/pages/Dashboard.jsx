import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Loader2,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [safetyMode, setSafetyMode] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [aiTextRes, setAiTextRes] = useState('');
  const [aiJsonRes, setAiJsonRes] = useState(null);
  const [aiToolLogs, setAiToolLogs] = useState([]);
  const [routeDebugPayload, setRouteDebugPayload] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Location access denied or unavailable:", error.message);
        }
      );
    }
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setRouteOptions([]);
    
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const aiRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/ai-query`, { query }, authHeaders);
      const responseData = aiRes.data;
      
      localStorage.setItem('lastAiQuery', JSON.stringify({
        query,
        responseData,
        timestamp: new Date().toISOString()
      }));

      const parsedData = responseData.json || responseData;
      setAiJsonRes(parsedData);
      setAiTextRes(responseData.text || "Tracking nodes initialized.");
      setAiToolLogs(responseData.toolLogs || []);

      // Resolve coordinates using geocode if AI didn't provide them
      let finalSource = (parsedData.source === 'current_location' || !parsedData.source) && userLocation 
        ? { name: 'Current Location', lat: userLocation.lat, lng: userLocation.lng }
        : { name: parsedData.source || 'Unknown', lat: null, lng: null };

      let finalDestination = { name: parsedData.destination || 'Unknown', lat: null, lng: null };

      // Geocode source if needed
      if (finalSource.lat == null && finalSource.name !== 'Current Location') {
        try {
          const sourceGeo = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/geocode`, {
            headers: authHeaders.headers,
            params: { place: finalSource.name }
          });
          finalSource.lat = sourceGeo.data.lat;
          finalSource.lng = sourceGeo.data.lng;
          finalSource.name = sourceGeo.data.name || finalSource.name;
        } catch (err) {
          console.warn('Geocode failed for source:', finalSource.name, err.message);
          // Use fallback coords for known Mumbai areas
          const sourceLower = finalSource.name.toLowerCase().trim();
          if (sourceLower.includes('dahisar') || sourceLower.includes('dahi sar')) {
            finalSource.lat = 19.2502;
            finalSource.lng = 72.8591;
            finalSource.name = 'Dahisar';
          } else if (sourceLower.includes('andheri')) {
            finalSource.lat = 19.1136;
            finalSource.lng = 72.8465;
            finalSource.name = 'Andheri';
          } else if (sourceLower.includes('bandra') || sourceLower.includes('bandra west') || sourceLower.includes('bandra east')) {
            finalSource.lat = 19.0596;
            finalSource.lng = 72.8360;
            finalSource.name = 'Bandra';
          } else if (sourceLower.includes('thane')) {
            finalSource.lat = 19.2183;
            finalSource.lng = 72.9781;
            finalSource.name = 'Thane';
          } else if (sourceLower.includes('borivali') || sourceLower.includes('bori vali')) {
            finalSource.lat = 19.2307;
            finalSource.lng = 72.8590;
            finalSource.name = 'Borivali';
          } else if (sourceLower.includes('mulund') || sourceLower.includes('mu lund')) {
            finalSource.lat = 19.1718;
            finalSource.lng = 72.9557;
            finalSource.name = 'Mulund';
          } else if (sourceLower.includes('ghatkopar') || sourceLower.includes('ghat kopar')) {
            finalSource.lat = 19.0856;
            finalSource.lng = 72.9081;
            finalSource.name = 'Ghatkopar';
          } else if (sourceLower.includes('vashi')) {
            finalSource.lat = 19.0771;
            finalSource.lng = 72.9986;
            finalSource.name = 'Vashi';
          } else if (sourceLower.includes('virar') || sourceLower.includes('vi rar')) {
            finalSource.lat = 19.4559;
            finalSource.lng = 72.7926;
            finalSource.name = 'Virar';
          } else if (sourceLower.includes('dadar') || sourceLower.includes('da dar')) {
            finalSource.lat = 19.0197;
            finalSource.lng = 72.8426;
            finalSource.name = 'Dadar';
          } else if (sourceLower.includes('cst') || sourceLower.includes('churchgate') || sourceLower.includes('vt')) {
            finalSource.lat = 18.9400;
            finalSource.lng = 72.8347;
            finalSource.name = 'CST';
          } else if (sourceLower.includes('powai') || sourceLower.includes('po wai')) {
            finalSource.lat = 19.1234;
            finalSource.lng = 72.9044;
            finalSource.name = 'Powai';
          } else if (sourceLower.includes('juhu') || sourceLower.includes('ju hu')) {
            finalSource.lat = 19.1075;
            finalSource.lng = 72.8261;
            finalSource.name = 'Juhu';
          } else if (sourceLower.includes('colaba') || sourceLower.includes('co laba')) {
            finalSource.lat = 18.9067;
            finalSource.lng = 72.8147;
            finalSource.name = 'Colaba';
          }
        }
      }

      // Geocode destination if needed
      if (finalDestination.lat == null) {
        try {
          const destGeo = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/geocode`, {
            headers: authHeaders.headers,
            params: { place: finalDestination.name }
          });
          finalDestination.lat = destGeo.data.lat;
          finalDestination.lng = destGeo.data.lng;
          finalDestination.name = destGeo.data.name || finalDestination.name;
        } catch (err) {
          console.warn('Geocode failed for destination:', finalDestination.name, err.message);
          // Use fallback coords for known Mumbai areas
          const destLower = finalDestination.name.toLowerCase().trim();
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
        }
      }

      // Override with AI coords if available
      if (parsedData.source_coords && parsedData.source_coords.length === 2) {
        finalSource.lat = parsedData.source_coords[0];
        finalSource.lng = parsedData.source_coords[1];
      }
      if (parsedData.dest_coords && parsedData.dest_coords.length === 2) {
        finalDestination.lat = parsedData.dest_coords[0];
        finalDestination.lng = parsedData.dest_coords[1];
      }

      setRouteDebugPayload({
        source: finalSource,
        destination: finalDestination,
        aiProvidedCoords: !!(parsedData.source_coords || parsedData.dest_coords)
      });

      const routeRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/multi-modal-route`, {
        source: finalSource,
        destination: finalDestination,
        preferences: { 
          ...parsedData.preferences,
          safety: safetyMode ? 'high' : 'medium',
          time: new Date().toTimeString().slice(0, 5) // Current time in HH:MM format
        }
      }, authHeaders);

      const result = routeRes.data;
      setRouteOptions(result.options || []);
      localStorage.setItem('lastRouteOptions', JSON.stringify(result.options || []));

      if(result.options?.length > 0) {
        setSelectedRoute(result.options[0]);
        toast.success(`Calculated ${result.options.length} alternative trajectories`);
      } else {
        toast.error('No viable trajectories found for these nodes');
      }
    } catch (err) {
      console.error(err);
      toast.error('Uplink Interrupted: Neural processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar pb-10 font-body">
      <div className="max-w-[1600px] mx-auto p-8 grid grid-cols-12 gap-6">
        
        {/* Hero Section */}
        <section className="col-span-12 flex flex-col space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-secondary to-error rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-surface-container-high rounded-2xl p-8 glass-panel overflow-hidden border border-outline-variant/10 shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[120px]">bolt</span>
              </div>
              <h1 className="text-4xl font-black font-headline tracking-tighter mb-6 text-on-surface uppercase">Initialize Mission Trajectory<span className="text-primary italic">.</span></h1>
              
              <form onSubmit={handleSearch} className="relative flex items-center">
                <div className="absolute left-6 text-secondary transform group-focus-within:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                </div>
                <input 
                  className="w-full bg-surface-container-highest/50 border border-outline-variant/20 py-6 pl-16 pr-20 rounded-2xl text-lg font-medium placeholder-on-surface-variant/30 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all shadow-inner text-on-surface font-headline"
                  placeholder="Ask your route in Hindi/English/Marathi..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="absolute right-4 flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <button type="submit" className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-on-secondary transition-all flex items-center justify-center shadow-lg">
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </form>
              
              <div className="mt-6 flex flex-wrap gap-2">
                {['Quick: Office via Metro', 'Safety Check: Bandra to Juhu', 'EV Range: To Pune'].map((text, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => { setQuery(text); handleSearch(); }}
                    className="px-4 py-1.5 bg-surface-container/50 border border-outline-variant/10 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest rounded-lg cursor-pointer hover:bg-surface-bright hover:text-primary transition-all"
                  >
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* AI Response & Recommended Routes Cards */}
            <div className="bg-surface-container-high/50 rounded-2xl p-6 glass-panel border border-outline-variant/5 shadow-xl flex flex-col max-h-[500px]">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="font-headline font-bold uppercase tracking-widest text-[11px] text-on-surface-variant italic">Alpha-01 Neural Uplink</h3>
                <span className="text-secondary text-[10px] font-black px-2 py-0.5 bg-secondary/10 border border-secondary/20 rounded-full animate-pulse uppercase">Live Uplink</span>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-2">
                 {aiTextRes && (
                   <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                     <div className="flex items-center mb-2">
                       <Bot className="w-4 h-4 text-primary mr-2" />
                       <p className="text-[10px] text-primary font-black uppercase tracking-widest italic">Alpha-01 Response:</p>
                     </div>
                     <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{aiTextRes}</p>
                   </div>
                 )}
                 
                 {aiToolLogs.length > 0 && (
                   <div className="space-y-1">
                     {aiToolLogs.map((log, i) => (
                       <p key={i} className="text-[9px] text-secondary font-mono bg-secondary/5 border border-secondary/10 px-2 py-1.5 flex items-center rounded">
                          <span className="material-symbols-outlined text-[12px] mr-2 text-secondary">build</span> {log}
                       </p>
                     ))}
                   </div>
                 )}
                 
                 {aiJsonRes && (
                   <div className="p-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                      <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-[0.2em] mb-2 ml-2">Extracted Payload Data:</p>
                      <pre className="text-[10px] text-on-surface-variant/80 overflow-x-auto whitespace-pre-wrap font-mono ml-2">
                        {JSON.stringify(aiJsonRes, null, 2)}
                      </pre>
                   </div>
                 )}

                {routeOptions.length > 0 ? (
                  <div className="pt-4 border-t border-outline-variant/10">
                    <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-[0.2em] mb-3">Calculated Trajectories:</p>
                    <div className="space-y-3">
                      {routeOptions.map((route, idx) => (
                        <div 
                          key={idx}
                          onClick={() => { 
                            localStorage.setItem('selectedTrajectory', JSON.stringify(route));
                            navigate('/route'); 
                          }}
                          className={`relative bg-surface-container-highest/30 rounded-xl p-4 border cursor-pointer transition-all hover:translate-x-1 ${selectedRoute?.type === route.type ? 'border-primary bg-primary/5' : 'border-outline-variant/10 hover:border-outline-variant/30'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`font-black uppercase tracking-tight ${idx === 0 ? 'text-primary' : 'text-secondary'}`}>{route.type}</span>
                              <div className="text-right">
                                <p className="text-xl font-black font-headline">{(route.duration/60).toFixed(0)} MIN</p>
                                <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-tighter opacity-70">ETA ACTIVE</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black tracking-widest uppercase border-t border-outline-variant/10 pt-2 mt-2">
                              <span className={idx === 0 ? 'text-primary' : 'text-secondary'}>{route.safety_score.toFixed(0)}% SURVEILLANCE</span>
                              <span className="text-on-surface-variant italic">{route.carbon_score.toFixed(1)}kg IMPACT</span>
                            </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !aiTextRes ? (
                  <div className="py-12 flex flex-col items-center opacity-30 mt-10">
                    <Bot className="w-12 h-12 mb-3" />
                    <p className="text-xs font-bold tracking-widest uppercase">Awaiting Mission Target...</p>
                  </div>
                ) : null}

                {routeDebugPayload && (
                  <div className="mt-4 bg-surface-container-highest border border-outline-variant/10 rounded-xl p-4 text-[10px] text-on-surface-variant font-mono">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="font-black uppercase tracking-[0.2em] text-on-surface">Route Debug Payload</span>
                      <span className="text-[9px] uppercase text-secondary">{routeDebugPayload.aiProvidedCoords ? 'AI coords used' : 'Geocode used'}</span>
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
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-8 right-8 z-[150] flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-surface-container/60 backdrop-blur-md px-3 py-1.5 rounded border border-outline-variant/20 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary shadow-[0_0_8px_#cafd00]"></span>
          <span className="text-[9px] font-headline font-black uppercase tracking-widest text-on-surface-variant">Command_Nexus_Live</span>
        </div>
      </div>
    </div>
  );
}
