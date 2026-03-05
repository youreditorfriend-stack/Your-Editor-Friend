
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, 
  Smartphone, 
  Play, 
  TrendingUp,
  Droplet,
  Layers,
  MousePointer2
} from 'lucide-react';

export const ServiceBento = () => {
  const services = [
    {
      title: 'Short-Form',
      desc: 'Viral Reels & TikToks.',
      icon: <Smartphone size={44} strokeWidth={1.5} />,
      color: 'from-red-500/20 to-orange-500/20',
      iconColor: 'text-red-400',
      tag: 'VIRAL'
    },
    {
      title: 'Ai Ads',
      desc: 'High-conversion growth.',
      icon: <TrendingUp size={44} strokeWidth={1.5} />,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      tag: 'GROWTH'
    },
    {
      title: 'YouTube',
      desc: 'Story-driven long form.',
      icon: <Play size={44} strokeWidth={1.5} />,
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
      tag: 'STORY'
    },
    {
      title: 'Motion',
      desc: 'Dynamic text & elements.',
      icon: <Layers size={44} strokeWidth={1.5} />,
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      tag: 'DYNAMIC'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {services.map((service, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ y: -8, scale: 1.02 }}
          className={`relative overflow-hidden bg-white/[0.03] backdrop-blur-2xl p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center group cursor-default aspect-square shadow-2xl transition-all duration-500`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${service.color} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />
          
          <div className="absolute top-6 right-6 z-10">
            <span className="text-[8px] font-black tracking-[0.2em] text-zinc-500 opacity-40 group-hover:opacity-100 transition-opacity">{service.tag}</span>
          </div>

          <div className="relative z-10 mb-6">
            <div className={`${service.iconColor} group-hover:scale-110 transition-transform duration-500`}>
              {service.icon}
            </div>
          </div>
          
          <div className="relative z-10 w-full px-2">
            <h3 className="text-lg md:text-2xl font-bold mb-1 tracking-tighter text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all">{service.title}</h3>
            <p className="text-zinc-500 text-[10px] md:text-xs font-light truncate group-hover:text-zinc-300 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
              {service.desc}
            </p>
          </div>

          <div className={`absolute bottom-0 left-0 w-0 h-[3px] bg-gradient-to-r ${service.color} group-hover:w-full transition-all duration-700 opacity-50`} />
        </motion.div>
      ))}
    </div>
  );
};

interface PortfolioGridProps {
  activeCategory: string;
}

interface PortfolioCardProps {
  work: any;
  index: number;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ work, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (work.youtubeId) {
      window.open(`https://www.youtube.com/watch?v=${work.youtubeId}`, '_blank');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: "easeOut"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={`relative group overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 cursor-pointer shadow-2xl transition-all duration-500 hover:border-red-500/50 hover:shadow-red-500/10 ${
        work.category === 'Motion graphics' || work.category === 'Youtube long form'
          ? 'aspect-video' 
          : 'aspect-[9/16]'
      }`}
    >
      {/* Thumbnail / Placeholder */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isHovered && work.youtubeId ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src={work.youtubeId 
            ? `https://img.youtube.com/vi/${work.youtubeId}/maxresdefault.jpg` 
            : `https://images.unsplash.com/photo-${work.imgId}?auto=format&fit=crop&q=80&w=800&h=1200`
          } 
          className="w-full h-full object-cover opacity-100 group-hover:opacity-90 transition-all duration-700"
          alt={work.title}
          onError={(e) => {
            if(work.youtubeId) (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${work.youtubeId}/hqdefault.jpg`;
          }}
        />
      </div>

      {/* Video Overlay / Player - Only plays if youtubeId exists and hovered */}
      <AnimatePresence>
        {isHovered && work.youtubeId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-black overflow-hidden pointer-events-none"
          >
            <iframe
              className="w-full h-full"
              style={{ transform: 'scale(1.01)', transformOrigin: 'center' }}
              src={`https://www.youtube-nocookie.com/embed/${work.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${work.youtubeId}&modestbranding=1&rel=0&enablejsapi=1&playsinline=1&iv_load_policy=3&fs=0`}
              title={work.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-end p-4 md:p-8 pointer-events-none">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[8px] md:text-[10px] font-black tracking-widest text-red-500 uppercase mb-1">{work.category}</p>
            <h4 className="text-sm md:text-xl font-bold text-white leading-tight">{work.title}</h4>
          </div>
          <div className="w-8 h-8 md:w-12 md:h-12 shrink-0 rounded-full bg-white text-black flex items-center justify-center transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all shadow-xl">
            <ArrowUpRight className="w-4 h-4 md:w-6 md:h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const PortfolioGrid: React.FC<PortfolioGridProps> = ({ activeCategory }) => {
  const [allWorks, setAllWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch('/api/portfolio');
        const data = await res.json();
        setAllWorks(data);
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const filteredWorks = allWorks.filter(work => work.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 md:gap-6 min-h-[600px] ${
      activeCategory === 'Motion graphics' || activeCategory === 'Youtube long form'
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-2 md:grid-cols-3'
    }`}>
      <AnimatePresence mode="popLayout">
        {filteredWorks.map((work, i) => (
          <PortfolioCard key={work.id || work.youtubeId || work.imgId} work={work} index={i} />
        ))}
      </AnimatePresence>
    </div>
  );
};
