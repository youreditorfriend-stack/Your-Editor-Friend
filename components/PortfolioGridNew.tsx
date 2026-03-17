import React, { useState, useEffect, useRef } from 'react';
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

// Extract YouTube ID from any YouTube URL format
const getYoutubeId = (url: string): string | null => {
  if (!url) return null;
  // youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&/]+)/);
  if (shortsMatch) return shortsMatch[1];
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^?&/]+)/);
  if (watchMatch) return watchMatch[1];
  // youtube.com/embed/ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
};

const PortfolioCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isHorizontal = project.orientation === 'horizontal';
  const isDirectVideo = project.url.endsWith('.mp4') || project.url.endsWith('.webm');
  const youtubeId = getYoutubeId(project.url);

  // Thumbnail URL for instant preview before iframe loads
  const thumbnailUrl = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

  // Lazy load — only load iframe when card is near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '200px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleMute = () => {
    setIsMuted(prev => {
      if (videoRef.current) videoRef.current.muted = !prev;
      return !prev;
    });
  };

  const wrapperClass = isHorizontal ? 'col-span-2 aspect-video' : 'col-span-1 aspect-[9/16]';

  // For vertical YouTube videos: iframe must be taller & wider than container
  // YouTube adds black bars unless we scale the iframe to fill
  // Vertical (9:16): iframe at 56.25% width of a 16:9 box = use inverse scaling
  // We scale iframe so it fills the 9:16 container without black bars
  const iframeContainerStyle: React.CSSProperties = isHorizontal
    ? { position: 'absolute', inset: 0 }
    : {
        position: 'absolute',
        // Scale up iframe to crop YouTube's black letterbox bars
        top: '50%', left: '50%',
        width: '300%', height: '300%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      };

  return (
    <div
      ref={cardRef}
      onClick={toggleMute}
      className={`relative group overflow-hidden rounded-xl bg-zinc-900 border border-white/5 shadow-lg transition-all duration-300 hover:border-red-500/30 cursor-pointer ${wrapperClass}`}
    >
      {/* Thumbnail shown instantly while video loads */}
      {thumbnailUrl && !isDirectVideo && (
        <img
          src={thumbnailUrl}
          alt={project.name}
          onLoad={() => setThumbLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${thumbLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ zIndex: 1 }}
        />
      )}

      {/* Skeleton shimmer before thumbnail loads */}
      {!thumbLoaded && !isDirectVideo && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" style={{ zIndex: 0 }} />
      )}

      {/* Video / iframe — lazy loaded */}
      {isVisible && (
        isDirectVideo ? (
          <video
            ref={videoRef}
            src={project.url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ zIndex: 2 }}
          />
        ) : youtubeId ? (
          <div style={{ ...iframeContainerStyle, zIndex: 2 }}>
            <iframe
              style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=0`}
              title={project.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure"
              allowFullScreen
            />
          </div>
        ) : null
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none" style={{ zIndex: 10 }}>
        <p className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-0.5">{project.category}</p>
        <h4 className="text-sm font-bold text-white leading-tight">{project.name}</h4>
      </div>

      {/* Mute indicator */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full text-white text-[10px] flex items-center gap-1" style={{ zIndex: 11 }}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`rounded-xl bg-zinc-800 animate-pulse ${i % 3 === 0 ? 'col-span-2 aspect-video' : 'col-span-1 aspect-[9/16]'}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {filteredProjects.map((p, i) => (
        <PortfolioCard key={p.id || i} project={p} index={i} />
      ))}
    </div>
  );
};
