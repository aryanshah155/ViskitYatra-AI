import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut,
  User,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', content: 'Neural Link established. I am Alpha-01, your city intelligence coordinator. How can I assist your mission?' }
  ]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!currentChatMessage.trim()) return;

    const userMsg = { role: 'user', content: currentChatMessage };
    setChatMessages(prev => [...prev, userMsg]);
    setCurrentChatMessage('');
    setChatLoading(true);

    try {
      const token = localStorage.getItem('token');
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/chat`, {
        message: userMsg.content,
        history: chatMessages
      }, authHeaders);
      setChatMessages(prev => [...prev, { role: 'model', content: response.data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Connection lost. Recalibrating uplink...' }]);
      toast.error('Neural Link: Signal interference detected');
    } finally {
      setChatLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Session Terminated. Neural link disconnected.');
    navigate('/');
  };

  // Only active/functional routes
  const navItems = [
    { icon: 'rocket_launch', label: 'Command', id: 'command', path: '/dashboard' },
    { icon: 'route', label: 'Routes', id: 'routes', path: '/route' }
  ];

  const currentPath = location.pathname;

  return (
    <div className="flex w-full h-screen bg-background text-on-surface font-body overflow-hidden">
      {/* Side Navigation */}
      <aside className={`fixed left-0 top-0 h-full z-[100] flex flex-col bg-[#171a1f]/80 backdrop-blur-xl transition-all duration-300 border-r border-outline-variant/10 shadow-2xl group ${sidebarOpen ? 'w-64' : 'w-20 hover:w-64'}`}>
        <div className="flex flex-col h-full py-6">
          <div className="flex items-center px-6 mb-10 overflow-hidden">
            <span className="material-symbols-outlined text-primary text-3xl mr-4">rocket_launch</span>
            <span className={`text-2xl font-bold tracking-tighter text-primary font-headline whitespace-nowrap transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>ALPHA-01</span>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => navigate(item.path)}
                className={`flex items-center px-4 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer ${currentPath === item.path ? 'text-primary bg-primary/10 border-r-4 border-primary' : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'}`}
              >
                <span className="material-symbols-outlined min-w-[40px] text-center">{item.icon}</span>
                <span className={`ml-4 font-headline tracking-tight whitespace-nowrap transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="mt-auto space-y-4 pb-4 px-2">
            <button className="w-full flex items-center p-3 text-error bg-error/10 hover:bg-error hover:text-on-error transition-all rounded-xl overflow-hidden shadow-lg shadow-error/10">
              <span className="material-symbols-outlined">emergency</span>
              <span className={`ml-4 font-bold whitespace-nowrap transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>SOS SIGNAL</span>
            </button>
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center p-3 bg-white/5 rounded-xl mb-2">
                <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=cafd00&color=516700`} className="w-10 h-10 rounded-full border border-primary/30" alt="Avatar" />
                <div className={`ml-4 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <p className="text-sm font-bold text-on-surface whitespace-nowrap">{user?.name || 'Navigator'}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Tier 1 Explorer</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center p-3 text-on-surface-variant hover:bg-error/20 hover:text-error transition-all rounded-xl"
              >
                <span className="material-symbols-outlined min-w-[40px] text-center">logout</span>
                <span className={`ml-4 font-headline font-bold uppercase tracking-widest text-[10px] whitespace-nowrap transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Terminate Session</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="fixed top-0 left-20 right-0 h-16 z-40 flex justify-between items-center px-8 bg-background/60 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex items-center space-x-8">
          <span className="font-black text-xl text-on-surface font-headline tracking-tight uppercase cursor-pointer" onClick={() => navigate('/dashboard')}>ALPHA NAVIGATOR</span>
          <div className="hidden md:flex space-x-6">
            <a className={`font-headline uppercase text-[10px] tracking-widest transition-all ${currentPath === '/dashboard' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-secondary'}`} href="#" onClick={() => navigate('/dashboard')}>Live Intel</a>
            <a className={`font-headline uppercase text-[10px] tracking-widest transition-all ${currentPath === '/route' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-secondary'}`} href="#" onClick={() => navigate('/route')}>Trajectories</a>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
             <span className="material-symbols-outlined text-error hover:scale-110 transition-transform cursor-pointer" onClick={handleLogout}>power_settings_new</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-20 mt-16 flex-1 h-[calc(100vh-64px)] relative overflow-hidden bg-surface font-body">
         <Outlet />
      </main>

      {/* AI Chat Neural Link HUD */}
      {chatOpen && (
        <div className="fixed bottom-24 right-8 w-[400px] h-[600px] z-[150] glass-panel border border-primary/20 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="p-5 border-b border-primary/10 flex justify-between items-center bg-primary/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary animate-pulse">neurology</span>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface">Neural Link Status: Active</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-xl text-xs font-medium leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-primary/20 text-on-surface border border-primary/30 rounded-br-none' 
                  : 'bg-surface-container-highest/60 text-on-surface-variant border border-outline-variant/10 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-highest/60 p-4 rounded-xl border border-outline-variant/10 rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-4 border-t border-white/5 bg-background/40 font-body">
            <div className="relative">
              <input 
                type="text"
                value={currentChatMessage}
                onChange={(e) => setCurrentChatMessage(e.target.value)}
                placeholder="Transmit complex mission queries..."
                className="w-full bg-surface-container-highest/50 border border-outline-variant/20 py-4 pl-4 pr-12 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none focus:border-primary transition-all text-on-surface"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Chat Trigger */}
      <div className="fixed bottom-24 right-8 z-[140] pointer-events-auto">
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 ${chatOpen ? 'bg-error text-on-error rotate-90' : 'bg-primary text-on-primary cyber-glow'}`}
        >
          <span className="material-symbols-outlined text-2xl">{chatOpen ? 'close' : 'neurology'}</span>
        </button>
      </div>

      {/* Floating Mode Indicator (Visual fluff) */}
      <div className="fixed bottom-8 right-8 z-[150] flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-surface-container/60 backdrop-blur-md px-3 py-1.5 rounded border border-outline-variant/20 flex items-center gap-3">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${currentPath === '/dashboard' ? 'bg-primary shadow-[0_0_8px_#cafd00]' : 'bg-secondary shadow-[0_0_8px_#00e3fd]'}`}></span>
          <span className="text-[9px] font-headline font-black uppercase tracking-widest text-on-surface-variant font-mono whitespace-nowrap">
            {currentPath === '/dashboard' ? 'Sector_Command_Active' : 'Trajectory_Uplink_Online'}
          </span>
        </div>
      </div>
    </div>
  );
}
