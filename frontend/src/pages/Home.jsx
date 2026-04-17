import React, { useState } from 'react';
import { Shield, Settings, Leaf, Zap } from 'lucide-react';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-background flex flex-col">
      {/* Background Layer (Reusing ALPHA aesthetic) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <img 
          className="w-full h-full object-cover grayscale contrast-125" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8epH_gw6vmebISwb63F5Q3SuUkuR4YM2LiIvlniDFQUkORy_AlDoye4ZlWYhvgbKUqOzuR4OTWnAVVNGXN0Ve9xaj_XjmMS8neLu5Cp6j7ahfLb2Hoz_vfOx082YI7YLmYKaapDoORN6u3ZrNwUV2Gk5nZ6cb9awQNMEN2bizRuvxhJNzd8rOGto4rxp3dWxBF4DOJXuncBIZWz8UXx62G6bmd3ZOAqXBWLtIRYAtmEu4MlJ7_JpLv9eOFXZhUJzl_guHMHm9rw4"
          alt="Mumbai Grid"
        />
        <div className="absolute inset-0 map-overlay"></div>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center z-10">
        <h1 className="text-5xl lg:text-7xl font-black mb-6 tracking-tighter uppercase leading-none">
          Intelligent Routes for a <br className="hidden md:block"/>
          <span className="text-primary cyber-glow">
            Smarter Urban Future
          </span>
        </h1>
        <p className="text-xl text-on-surface-variant max-w-2xl mb-10 leading-relaxed font-headline uppercase tracking-widest">
          ViksitYatra harnesses neural routing and multi-modal intelligence to navigate Mumbai safely and sustainably.
        </p>
        <button 
          onClick={() => setShowAuthModal(true)}
          className="px-10 py-5 bg-primary text-on-primary font-headline font-bold uppercase tracking-widest rounded-xl shadow-2xl hover:bg-primary-dim hover:scale-105 transition-all cyber-glow flex items-center gap-3"
        >
          Initialize Access
          <span className="material-symbols-outlined">bolt</span>
        </button>
      </section>

      {/* Feature Cards */}
      <section className="px-6 py-16 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 z-10">
        {[
          { icon: <Zap className="w-6 h-6" />, title: "Neural Routing", desc: "AI-driven trajectory mapping that evolves with city metabolism.", color: "text-primary", bg: "bg-primary/10" },
          { icon: <Shield className="w-6 h-6" />, title: "Secure Vault", desc: "End-to-end telemetry protection using biometric encrypted signatures.", color: "text-secondary", bg: "bg-secondary/10" },
          { icon: <Leaf className="w-6 h-6" />, title: "Eco Systems", desc: "Prioritize public transit and EV charging links to minimize impact.", color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { icon: <Settings className="w-6 h-6" />, title: "Multi-Modal", desc: "Seamless integration of bus, metro, EV, and walking nodes.", color: "text-pink-400", bg: "bg-pink-400/10" }
        ].map((card, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-xl border border-outline-variant/10 flex flex-col items-start hover:-translate-y-2 transition-transform group">
            <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center mb-4 ${card.color} group-hover:scale-110 transition-transform`}>
              {card.icon}
            </div>
            <h3 className="text-xl font-headline font-bold mb-2 uppercase tracking-wide text-on-surface">{card.title}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </section>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
