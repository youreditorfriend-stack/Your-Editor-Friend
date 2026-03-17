import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { db } from "../src/firebase";
import { doc, getDoc } from "firebase/firestore";

interface Project {
  id: string;
  tag: string;
  name: string;
  url: string;
  category: string;
  orientation: 'vertical' | 'horizontal';
}

const PortfolioCard: React.FC<{ project: Project }> = ({ project }) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isHorizontal = project.orientation === 'horizontal';
  const isDirectVideo = project.url.endsWith('.mp4') || project.url.endsWith('.webm');
  const youtubeId = project.url.includes('youtube.com') || project.url.includes('youtu.be') 
    ? project.url.split('/').pop()?.split('?')[0] 
    : null;

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Horizontal videos span 2 columns and use 16:9 aspect ratio
  // Vertical videos use 9:16 aspect ratio in a single column
  const wrapperClass = isHorizontal
    ? `col-span-2 aspect-video`
    : `col-span-1 aspect-[9/16]`;

  // For YouTube horizontal embeds, we need a scaled iframe to fill properly
  const iframeWrapperStyle: React.CSSProperties = isHorizontal
    ? { position: 'relative', width: '100%', height: '100%' }
    : { position: 'relative', width: '177.78%', height: '177.78%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div 
      onClick={toggleMute}
      className={`relative group overflow-hidden rounded-xl bg-zinc-900 border border-white/5 shadow-lg transition-all duration-300 hover:border-red-500/30 cursor-pointer ${wrapperClass}`}
    >
      {isDirectVideo ? (
        <video
          ref={videoRef}
          src={project.url}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={iframeWrapperStyle}>
            <iframe
              style={{ width: '100%', height: '100%', pointerEvents: 'none', border: 'none' }}
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
              title={project.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 flex flex-col justify-end p-4 pointer-events-none">
        <p className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-0.5">{project.category}</p>
        <h4 className="text-sm font-bold text-white leading-tight">{project.name}</h4>
      </div>
      
      {/* Audio Indicator */}
      <div className="absolute top-3 right-3 z-20 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full text-white text-[10px] flex items-center gap-1">
        {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        {isMuted ? 'Muted' : 'Sound On'}
      </div>
    </div>
  );
};

export const PortfolioGridNew: React.FC<{ activeCategory: string }> = ({ activeCategory }) => {
  const [allWorks, setAllWorks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const docRef = doc(db, "portfolio", "data");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const categories = data.portfolio || [];
          const allItems: Project[] = [];
          
          categories.forEach((cat: any) => {
            if (cat.enabled !== false) {
              cat.projects.forEach((proj: any) => {
                if (proj.enabled !== false) {
                  allItems.push({
                    id: proj.id || proj.youtubeId || proj.imgId,
                    tag: cat.label,
                    name: proj.title,
                    url: proj.url || proj.link || (proj.youtubeId ? `https://www.youtube.com/watch?v=${proj.youtubeId}` : ''),
                    category: cat.label,
                    orientation: proj.orientation || 'vertical'
                  });
                }
              });
            }
          });
          
          setAllWorks(allItems);
        }
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const filteredProjects = activeCategory === 'All'
    ? allWorks
    : allWorks.filter(p => p.category.toUpperCase() === activeCategory.toUpperCase());

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {filteredProjects.map((p, i) => (
        <PortfolioCard key={i} project={p} />
      ))}
    </div>
  );
};
