import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function AuthModal({ onClose, initialMode = true, isPage = false }) {
  const [isLogin, setIsLogin] = useState(initialMode);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleClose = () => {
    if (isPage) {
      navigate('/');
    } else if (onClose) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin 
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password };

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${url}`, payload);
      const { token, user } = res.data;
      
      login(user, token);
      toast.success(isLogin ? 'Mission Alpha: Connection Established!' : 'Node Initialized: Identity Verified');

      if (!isPage && onClose) onClose();
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Authentication failed';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background text-on-surface overflow-y-auto">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <img 
          className="w-full h-full object-cover opacity-30 grayscale contrast-125" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8epH_gw6vmebISwb63F5Q3SuUkuR4YM2LiIvlniDFQUkORy_AlDoye4ZlWYhvgbKUqOzuR4OTWnAVVNGXN0Ve9xaj_XjmMS8neLu5Cp6j7ahfLb2Hoz_vfOx082YI7YLmYKaapDoORN6u3ZrNwUV2Gk5nZ6cb9awQNMEN2bizRuvxhJNzd8rOGto4rxp3dWxBF4DOJXuncBIZWz8UXx62G6bmd3ZOAqXBWLtIRYAtmEu4MlJ7_JpLv9eOFXZhUJzl_guHMHm9rw4"
          alt="Mumbai Grid"
        />
        <div className="absolute inset-0 map-overlay"></div>
      </div>

      {/* Close Button */}
      <button 
        onClick={handleClose}
        className="fixed top-8 right-8 z-[110] text-outline hover:text-white transition-colors uppercase font-headline tracking-widest text-xs flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-sm">close</span> Terminate Connection
      </button>

      {/* UI Layer */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        {/* Top Utility */}
        <div className="absolute top-8 left-8 flex items-center gap-4 bg-surface-container/40 px-4 py-2 rounded-full border border-outline-variant/10">
          <span className="material-symbols-outlined text-secondary text-sm">language</span>
          <span className="text-[10px] font-headline tracking-[0.2em] uppercase text-on-surface-variant">Language: EN-INTL</span>
        </div>

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="hidden lg:flex flex-col space-y-8">
            <div>
              <h1 className="text-7xl font-black tracking-tighter text-on-surface leading-none mb-4 uppercase">
                Viksit<span className="text-primary">.</span>
              </h1>
              <p className="text-xl font-headline text-on-surface-variant uppercase tracking-widest leading-tight">
                The Future of <br/> Urban Intelligence
              </p>
            </div>
            <div className="space-y-6 max-w-md">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">rocket_launch</span>
                </div>
                <div>
                  <h3 className="text-on-surface font-headline font-bold uppercase tracking-wide">Neural Routing</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">AI-driven trajectory mapping that evolves with city metabolism.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-lg">security</span>
                </div>
                <div>
                  <h3 className="text-on-surface font-headline font-bold uppercase tracking-wide">Encrypted Vault</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">End-to-end telemetry protection using biometric orbital signatures.</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container/40 p-6 rounded-xl border-l-2 border-primary max-w-sm">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline mb-1">Active Navigators</p>
                  <p className="text-3xl font-headline font-bold text-on-surface">14,802</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-primary mb-1">MUMBAI_SECTOR_01</p>
                  <p className="text-xs text-outline font-mono">STABILITY: 99.8%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="glass-panel border border-outline-variant/10 rounded-xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-headline font-bold text-on-surface uppercase tracking-tight">
                    {isLogin ? 'Access Node' : 'Establish Account'}
                  </h2>
                  <div className="flex gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLogin ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${!isLogin ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`}></div>
                  </div>
                </div>

                {error && <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-[11px] font-headline uppercase text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {!isLogin && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline uppercase tracking-widest text-on-surface-variant ml-1">Navigator Name</label>
                      <input 
                        className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-5 py-3.5 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all font-mono text-sm"
                        placeholder="NAME_PROTOCOL"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline uppercase tracking-widest text-on-surface-variant ml-1">Universal Identifier</label>
                    <div className="relative group">
                      <input 
                        className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-5 py-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all font-mono text-sm"
                        placeholder="NAVIGATOR_ID@ALPHA.COM"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                      />
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-secondary transition-colors">fingerprint</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-headline uppercase tracking-widest text-on-surface-variant ml-1">Access Protocol</label>
                    <div className="relative group">
                      <input 
                        className="w-full bg-surface-container-highest/50 border border-outline-variant/30 rounded-xl px-5 py-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all font-mono text-sm"
                        placeholder="••••••••••••"
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                      />
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-secondary transition-colors cursor-pointer">visibility</span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-on-primary font-headline font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-primary-dim hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cyber-glow flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Initiate Uplink' : 'Initialize Node')}
                    <span className="material-symbols-outlined">{isLogin ? 'bolt' : 'how_to_reg'}</span>
                  </button>
                </form>

                <div className="mt-8 p-4 rounded-xl border border-secondary/20 bg-secondary/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-secondary/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>face</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-headline font-bold uppercase text-secondary">Quick Access Active</p>
                      <p className="text-[9px] text-on-surface-variant">Face/Biometric signature detected</p>
                    </div>
                  </div>
                  <button onClick={() => setIsLogin(true)} className="text-[10px] font-headline font-bold text-secondary uppercase border-b border-secondary/30 pb-0.5 hover:text-on-surface transition-colors">Resume</button>
                </div>

                <p className="mt-8 text-center text-xs text-on-surface-variant">
                  {isLogin ? 'New Navigator?' : 'Already Registered?'}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary font-headline font-bold uppercase tracking-tighter ml-1 hover:underline"
                  >
                    {isLogin ? 'Establish Account' : 'Access Node'}
                  </button>
                </p>
              </div>
            </div>
            
            {/* Metadata */}
            <div className="mt-8 flex justify-center gap-8 opacity-40">
              <div className="text-[9px] font-mono tracking-widest uppercase">Encryption_v2.4.0</div>
              <div className="text-[9px] font-mono tracking-widest uppercase">System_Stable</div>
              <div className="text-[9px] font-mono tracking-widest uppercase">Auth_Level_05</div>
            </div>
          </div>
        </div>
      </main>

      {/* Interaction Hints */}
      <div className="fixed bottom-8 right-8 z-20 flex flex-col items-end gap-2">
        <div className="bg-surface-container/60 backdrop-blur-md px-3 py-1.5 rounded border border-outline-variant/20 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
          <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Mumbai_Grid_Critical_Delay</span>
        </div>
        <div className="text-[9px] font-headline text-outline uppercase tracking-[0.3em] mr-1">Sector 7-B Alpha Node</div>
      </div>
    </div>
  );
}
