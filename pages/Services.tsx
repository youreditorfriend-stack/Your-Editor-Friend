import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ServiceList } from '../components/ServiceList';
import { useProjectModal } from '../components/Layout';

export const Services: React.FC = () => {
  const { openProjectModal } = useProjectModal();

  return (
    <div className="px-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="text-center py-8 md:py-20">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3">Freelance Services</div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">I turn raw footage into Business Growth</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light">
            Cinematic, high-retention video editing for creators, brands &amp; businesses.
          </p>
        </div>

        {/* What I do */}
        <ServiceList />

        {/* CTAs */}
        <div className="grid md:grid-cols-2 gap-6 mt-16 max-w-4xl mx-auto">
          {/* Custom quote */}
          <Link
            to="/custom-quote"
            className="relative p-8 rounded-3xl border bg-zinc-900/50 border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col group cursor-pointer"
          >
            <h3 className="text-xl font-semibold mb-2">Build Your Own Plan</h3>
            <p className="text-zinc-400 text-sm font-light mb-8">Browse reference reels and get a custom quote tailored to your exact needs.</p>
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="relative">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-[#E50914]/30"
                  />
                ))}
                <div className="w-20 h-20 bg-[#E50914]/10 rounded-full flex items-center justify-center text-[#E50914] group-hover:bg-[#E50914]/20 transition-colors shadow-lg shadow-red-900/20">
                  <Zap size={32} fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 text-white border border-white/10 group-hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Build Custom Plan <ArrowRight size={16} />
            </div>
          </Link>

          {/* Start project */}
          <div className="relative p-8 rounded-3xl border bg-gradient-to-br from-zinc-900/80 to-[#1a0505] border-white/5 flex flex-col">
            <h3 className="text-xl font-semibold mb-2">Start Your Project</h3>
            <p className="text-zinc-400 text-sm font-light mb-8">3 quick questions — your brief lands straight on my WhatsApp.</p>
            <div className="flex-1 flex items-center justify-center py-8">
              <span className="text-6xl">🎬</span>
            </div>
            <button
              onClick={openProjectModal}
              className="w-full py-3 rounded-xl text-sm font-bold bg-[#E50914] text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              Start Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
