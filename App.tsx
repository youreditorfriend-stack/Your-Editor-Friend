
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Instagram, 
  Youtube, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Zap, 
  Menu, 
  X,
  ExternalLink,
  MessageCircle,
  Phone
} from 'lucide-react';
import { PortfolioGrid, ServiceBento } from './components/Portfolio';

const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Real Estate');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const navLinks = [
    { name: 'Services', href: '#services' },
    { name: 'Portfolio', href: '#portfolio' },
    { name: 'Process', href: '#process' },
  ];

  const categories = ['Real Estate', 'Personal branding', 'Ai advertisement'];

  const scrollTo = (id: string) => {
    setIsMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const WHATSAPP_NUMBER = "916374343169"; 
  const WHATSAPP_DISPLAY = "+91 63743 43169";
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Janish,%20I'm%20interested%20in%20your%20video%20editing%20services!`;

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

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-[#0A0A0A]/80 backdrop-blur-xl border-white/10 py-4' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="font-semibold text-lg tracking-tight">YOUR EDITOR FRIEND</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button 
                key={link.name} 
                onClick={() => scrollTo(link.href.replace('#', ''))}
                className="text-sm font-normal text-zinc-400 hover:text-white transition-colors"
              >
                {link.name}
              </button>
            ))}
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2"
            >
              Let's Talk <MessageCircle size={16} />
            </a>
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 bg-black transition-transform duration-500 flex flex-col items-center justify-center gap-8 ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <span className="text-xl font-semibold tracking-tight text-white/50 mb-4">YOUR EDITOR FRIEND</span>
        {navLinks.map((link) => (
          <button 
            key={link.name} 
            onClick={() => scrollTo(link.href.replace('#', ''))}
            className="text-3xl font-semibold hover:text-[#E50914]"
          >
            {link.name}
          </button>
        ))}
        <div className="flex flex-col gap-4 mt-8 w-full px-12">
          <a href={WHATSAPP_LINK} className="bg-[#25D366] text-white py-4 rounded-full text-xl font-semibold text-center flex items-center justify-center gap-3">
            <MessageCircle size={24} fill="currentColor" /> {WHATSAPP_DISPLAY}
          </a>
          <a href="mailto:youreditorfriend@gmail.com" className="bg-[#E50914] text-white py-4 rounded-full text-xl font-semibold text-center flex items-center justify-center gap-3">
            <Mail size={24} /> Email Me
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        {/* Ambient Background Gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#E50914]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          style={{ opacity, scale }}
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium tracking-[0.2em] text-[#E50914] uppercase mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Available for New Projects
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-semibold tracking-tight leading-[1.05] mb-8"
          >
            I turn raw footage <br /> 
            <span className="font-black">into <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-500">Business Growth</span></span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
          >
            Janish Prabu here. Founder of <span className="text-white font-normal">Your Editor Friend</span>. We help businesses and brands build trust and scale through cinematic, high-retention video editing.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={() => scrollTo('portfolio')}
              className="w-full sm:w-auto bg-[#E50914] hover:bg-red-700 text-white px-10 py-4 rounded-full text-base font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-red-900/10"
            >
              View My Work <ArrowRight size={18} />
            </button>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0A0A0A] bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400 overflow-hidden">
                    {i === 4 ? '+80' : <img src={`https://i.pravatar.cc/100?u=${i}`} className="w-full h-full object-cover opacity-60" />}
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-start justify-center text-left leading-tight">
                <span className="text-sm font-medium text-white">80+ Clients</span>
                <span className="text-xs text-zinc-500 font-light tracking-wide uppercase">Global Brands</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Decorative Scroll Hint */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-700"
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-zinc-800 to-transparent"></div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-medium">Scroll</span>
        </motion.div>
      </header>

      {/* Services Section */}
      <section id="services" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Editing Expertise</h2>
            <p className="text-zinc-500 max-w-xl font-light">From viral TikTok hooks to corporate brand stories, we craft every frame with intent.</p>
          </div>
          <ServiceBento />
        </div>
      </section>

      {/* Stats / Proof */}
      <section className="py-24 bg-zinc-900/20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: 'Videos Created', value: '1,000+' },
            { label: 'Accounts Managed', value: '80+' },
            { label: 'Watch Time', value: '50M+' },
            { label: 'Avg Retention', value: '75%' },
          ].map((stat, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="text-3xl md:text-5xl font-semibold mb-2 text-white">{stat.value}</div>
              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-32 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Recent Projects</h2>
              <p className="text-zinc-500 max-w-xl font-light">A selection of work across short-form, corporate, and YouTube content.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2 rounded-full border transition-all text-xs font-medium uppercase tracking-widest ${activeCategory === cat ? 'border-white text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <PortfolioGrid activeCategory={activeCategory} />
        </div>
      </section>

      {/* Process / Why Me */}
      <section id="process" className="py-32 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E50914]/10 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center p-12">
               <div className="space-y-4 w-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-6 rounded bg-zinc-800/50 group-hover:bg-zinc-800 transition-colors`} style={{ width: `${100 - (i * 15)}%`, animationDelay: `${i * 0.2}s` }}></div>
                  ))}
               </div>
            </div>
            <div className="absolute bottom-8 left-8">
              <div className="text-7xl font-bold text-white/[0.03] select-none">PROCESS</div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-semibold mb-12 leading-tight tracking-tight">The "Editor Friend" <br /> Workflow.</h2>
            <div className="space-y-10">
              {[
                { icon: <Layers size={18} />, title: 'Strategic Ingest', desc: 'We don\'t just cut; we analyze your goals and audience before the first edit.' },
                { icon: <Zap size={18} />, title: 'Retention Optimization', desc: 'Pacing, sound design, and motion graphics optimized for engagement.' },
                { icon: <CheckCircle2 size={18} />, title: 'Seamless Handoff', desc: 'Ready-to-post files with metadata and thumbnail suggestions.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-zinc-900 flex items-center justify-center text-[#E50914] border border-white/5">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1.5">{item.title}</h3>
                    <p className="text-zinc-500 leading-relaxed font-light text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-32 px-6 bg-zinc-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8">Ready to level up your content?</h2>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
              <a 
                href="mailto:youreditorfriend@gmail.com" 
                className="group flex items-center gap-4 text-xl md:text-3xl font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <Mail size={24} className="text-[#E50914]" />
                youreditorfriend@gmail.com
              </a>
              <span className="hidden md:block text-zinc-800 text-2xl">|</span>
              <a 
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 text-xl md:text-3xl font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <MessageCircle size={24} fill="currentColor" className="text-[#25D366]" />
                {WHATSAPP_DISPLAY}
              </a>
            </div>

            <a 
              href={WHATSAPP_LINK} 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#E50914] hover:bg-red-700 text-white px-12 py-5 rounded-full text-xl font-bold inline-flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-red-900/20"
            >
              Start Your Project <ArrowRight size={24} />
            </a>
          </motion.div>
          
          <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-zinc-500 text-[11px] uppercase tracking-[0.2em] font-medium">
            <div className="flex items-center gap-6">
               <span className="text-white tracking-tighter">YOUR EDITOR FRIEND</span>
               <span>&copy; 2024</span>
            </div>
            <div className="flex gap-6 items-center">
              <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Youtube size={20} /></a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><MessageCircle size={20} fill="currentColor" /></a>
              <a href="mailto:youreditorfriend@gmail.com" className="hover:text-white transition-colors"><Mail size={20} /></a>
            </div>
            <div className="font-normal text-zinc-600">Janish Prabu &middot; Premium Editing</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
