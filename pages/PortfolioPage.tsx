import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioGridNew } from '../components/PortfolioGridNew';
import { db } from '../src/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const PortfolioPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('Personal Branding');
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "portfolio", "data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const portfolio = data.portfolio || [];
          const enabledCats = portfolio
            .filter((cat: any) => cat.enabled !== false)
            .map((cat: any) => cat.label);
          setVisibleCategories(enabledCats);
          if (enabledCats.length > 0 && !enabledCats.includes(activeCategory)) {
            setActiveCategory(enabledCats[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="px-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="text-center py-8 md:py-24">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3">Portfolio</div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">Recent Projects</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light">
            Cinematic, high-retention edits for creators and brands.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full border transition-all text-[10px] md:text-xs font-medium uppercase tracking-widest ${activeCategory === cat ? 'border-white text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <PortfolioGridNew activeCategory={activeCategory} />

        {/* Custom quote CTA */}
        <div className="mt-24 max-w-md mx-auto">
          <Link
            to="/custom-quote"
            className="relative p-8 rounded-3xl border bg-zinc-900/50 border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col group cursor-pointer"
          >
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-2">Want edits like these?</h3>
              <p className="text-zinc-400 text-sm font-light">Browse reference reels and build a custom quote tailored to your exact needs.</p>
            </div>
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
        </div>
      </div>
    </div>
  );
};
