import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Youtube, Mail, MessageCircle, LogOut, Library, User as UserIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { ProjectModal } from './ProjectModal';
import { WHATSAPP_LINK, WHATSAPP_DISPLAY, EMAIL, INSTAGRAM_URL, YOUTUBE } from '../src/lib/site';
import { useAuth } from '../src/lib/auth';
import { usePageEnabled } from '../src/lib/store';

const allNavLinks = [
  { id: 'home', name: 'Home', to: '/' },
  { id: 'products', name: 'Products', to: '/products' },
  { id: 'courses', name: 'Courses', to: '/courses' },
  { id: 'services', name: 'Services', to: '/services' },
  { id: 'portfolio', name: 'Portfolio', to: '/portfolio' },
  { id: 'about', name: 'About', to: '/about' },
  { id: 'contact', name: 'Contact', to: '/contact' },
];

export const Layout: React.FC = () => {
  const isEnabled = usePageEnabled();
  // Home is always on — it's the landing page
  const navLinks = allNavLinks.filter(l => l.id === 'home' || isEnabled(l.id));
  const [scrolled, setScrolled] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const { user, signIn, signOut } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans selection:bg-[#E50914] selection:text-white antialiased">

      {/* Floating WhatsApp Button */}
      <motion.a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-green-500/20 flex items-center justify-center group"
      >
        <MessageCircle size={28} fill="currentColor" className="text-white" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 whitespace-nowrap font-medium text-sm">
          Chat with me
        </span>
      </motion.a>

      {/* Navigation — all section names always visible (no hamburger) */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-[#0A0A0A]/85 backdrop-blur-xl border-white/10' : 'bg-[#0A0A0A]/60 backdrop-blur-md border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Top row: brand + auth */}
          <div className="flex justify-between items-center py-2.5 md:py-3">
            <Link to="/" className="flex items-center cursor-pointer group shrink-0">
              <span className="font-semibold text-sm md:text-lg tracking-tight">YOUR EDITOR FRIEND</span>
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setShowProjectModal(true)}
                className="hidden sm:flex bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-all active:scale-95 items-center gap-2"
              >
                Let's Talk <MessageCircle size={15} />
              </button>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setShowUserMenu(v => !v)} className="flex items-center gap-2">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'Account'} className="w-9 h-9 rounded-full border-2 border-[#E50914]/50" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#E50914]/20 border-2 border-[#E50914]/50 flex items-center justify-center"><UserIcon size={16} /></div>
                    )}
                  </button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-12 w-56 bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                      >
                        <div className="px-4 py-3 border-b border-white/5">
                          <div className="text-sm font-semibold truncate">{user.displayName}</div>
                          <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                        </div>
                        <Link to="/my-library" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                          <Library size={15} className="text-[#E50914]" /> My Library
                        </Link>
                        <button onClick={() => { signOut(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:bg-white/5 transition-colors">
                          <LogOut size={15} /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => signIn().catch(() => {})}
                  className="bg-[#E50914] hover:bg-red-700 text-white px-3.5 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5 md:gap-2"
                >
                  <UserIcon size={14} /> Login
                </button>
              )}
            </div>
          </div>

          {/* Bottom row: all page links, scrollable on small screens */}
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm transition-all ${
                    isActive
                      ? 'bg-[#E50914]/15 text-white font-semibold border border-[#E50914]/40'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="pt-[92px] md:pt-28">
        <Outlet context={{ openProjectModal: () => setShowProjectModal(true) }} />
      </main>

      {/* Footer */}
      <footer className="py-10 md:py-16 px-6 bg-zinc-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="text-center md:text-left">
              <div className="font-semibold text-lg tracking-tight mb-2">YOUR EDITOR FRIEND</div>
              <div className="text-zinc-500 text-sm font-light">Janish Prabu · Premium Editing</div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {navLinks.map((link) => (
                <Link key={link.name} to={link.to} className="text-sm text-zinc-400 hover:text-white transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-sm text-zinc-400">
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={14} className="text-[#E50914]" /> {EMAIL}
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <MessageCircle size={14} fill="currentColor" className="text-[#25D366]" /> {WHATSAPP_DISPLAY}
              </a>
            </div>
            <div className="flex gap-5 items-center text-zinc-500">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href={YOUTUBE.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Youtube size={20} /></a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><MessageCircle size={20} fill="currentColor" /></a>
            </div>
            <div className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] font-medium">&copy; {new Date().getFullYear()} Your Editor Friend</div>
          </div>
        </div>
      </footer>

      <ProjectModal open={showProjectModal} onClose={() => setShowProjectModal(false)} />
    </div>
  );
};

// Hook for pages to open the "Start Your Project" modal from the shared layout
export const useProjectModal = () =>
  useOutletContext<{ openProjectModal: () => void }>();
