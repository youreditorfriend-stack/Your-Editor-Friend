
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

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { CustomQuotePage } from './components/CustomQuotePage';

interface PricingConfig {
  price: number;
  discountThreshold: number;
  discountPercentage: number;
}

const MainSite: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Personal Branding');
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    // Fetch settings to filter categories
    const fetchSettings = async () => {
      try {
        console.log('Fetching settings from API...');
        const response = await fetch('/api/portfolio');
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        const data = await response.json();
        console.log('Settings data received:', data);
        const portfolio = data.portfolio || [];
        const enabledCats = portfolio
          .filter((cat: any) => cat.enabled !== false)
          .map((cat: any) => cat.name);
        
        console.log('Enabled categories:', enabledCats);
        setVisibleCategories(enabledCats);
        if (enabledCats.length > 0 && !enabledCats.includes(activeCategory)) {
          setActiveCategory(enabledCats[0]);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const navigate = useNavigate();

  const navLinks = [
    { name: 'Services', href: '#services' },
    { name: 'Portfolio', href: '#portfolio' },
    { name: 'Pricing', href: '/custom-quote' },
  ];

  const scrollTo = (id: string) => {
    setIsMenuOpen(false);
    if (id.startsWith('/')) {
      navigate(id);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const WHATSAPP_NUMBER = "916374343169"; 
  const WHATSAPP_DISPLAY = "+91 63743 43169";
  
  const getWhatsAppLink = (message?: string) => {
    const defaultMsg = "Hi Janish, I'm interested in your video editing services!";
    const text = encodeURIComponent(message || defaultMsg);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  };

  const WHATSAPP_LINK = getWhatsAppLink();
  const BUSINESS_PLAN_LINK = getWhatsAppLink("Hi Editorfriend. i am intrested in Business plan");
  const CREATOR_PLAN_LINK = getWhatsAppLink("Hi editorfrind i am intrested in Creator trend plan");

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
            className="text-2xl font-semibold hover:text-[#E50914]"
          >
            {link.name}
          </button>
        ))}
        <div className="flex flex-col gap-4 mt-8 w-full px-12">
          <a href={WHATSAPP_LINK} className="bg-[#25D366] text-white py-3 rounded-full text-lg font-semibold text-center flex items-center justify-center gap-3">
            <MessageCircle size={20} fill="currentColor" /> {WHATSAPP_DISPLAY}
          </a>
          <a href="mailto:youreditorfriend@gmail.com" className="bg-[#E50914] text-white py-3 rounded-full text-lg font-semibold text-center flex items-center justify-center gap-3">
            <Mail size={20} /> Email Me
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <header className="relative min-h-[85vh] flex items-center justify-center pt-12 px-6 overflow-hidden">
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
            className="text-3xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-8"
          >
            I turn raw footage <br /> 
            <span className="font-black">into <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-500">Business Growth</span></span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm md:text-lg text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
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
              onClick={() => navigate('/custom-quote')}
              className="w-full sm:w-auto bg-[#E50914] hover:bg-red-700 text-white px-10 py-4 rounded-full text-base font-medium flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-red-900/10"
            >
              Book Editing service <ArrowRight size={18} />
            </button>
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

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 md:py-32 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 mb-12 md:mb-20">
            <div>
              <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">Recent Projects</h2>
            </div>
            <div className="flex flex-wrap gap-3">
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
          </div>
          <PortfolioGrid activeCategory={activeCategory} />
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <ServiceBento />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Simple, Transparent Pricing</h2>
            <p className="text-zinc-500 max-w-xl mx-auto font-light">Choose the plan that fits your content goals. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-1 gap-8 max-w-md mx-auto">
            {/* Card 3: Build Your Own Plan (Teaser) */}
            <Link 
              to="/custom-quote"
              className="relative p-8 rounded-3xl border bg-zinc-900/50 border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col group cursor-pointer"
            >
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Build Your Own Plan</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Custom</span>
                </div>
                <p className="text-zinc-400 text-sm font-light">Need something specific? Browse our reference reels and get a custom quote tailored to your exact needs.</p>
              </div>
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="relative">
                  {/* Spreading Waves Animation */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: i * 0.8,
                        ease: "easeOut"
                      }}
                      className="absolute inset-0 rounded-full border border-[#E50914]/30"
                    />
                  ))}
                  <div className="w-20 h-20 bg-[#E50914]/10 rounded-full flex items-center justify-center text-[#E50914] group-hover:bg-[#E50914]/20 transition-colors shadow-lg shadow-red-900/20">
                    <Zap size={32} fill="currentColor" />
                  </div>
                </div>
              </div>
              <div 
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 text-white border border-white/10 group-hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Build Custom Plan <ArrowRight size={16} />
              </div>
            </Link>
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
            <h2 className="text-2xl md:text-5xl font-semibold tracking-tight mb-8">Ready to level up your content?</h2>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-12">
              <a 
                href="mailto:youreditorfriend@gmail.com" 
                className="group flex items-center gap-3 md:gap-4 text-sm md:text-lg font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <Mail size={16} className="text-[#E50914]" />
                youreditorfriend@gmail.com
              </a>
              <span className="hidden md:block text-zinc-800 text-xl">|</span>
              <a 
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 md:gap-4 text-sm md:text-lg font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <MessageCircle size={16} fill="currentColor" className="text-[#25D366]" />
                {WHATSAPP_DISPLAY}
              </a>
            </div>

            <a 
              href={WHATSAPP_LINK} 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#E50914] hover:bg-red-700 text-white px-10 md:px-12 py-4 md:py-5 rounded-full text-lg md:text-xl font-bold inline-flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-red-900/20"
            >
              Start Your Project <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </a>
          </motion.div>
          
          <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-zinc-500 text-[11px] uppercase tracking-[0.2em] font-medium">
            <div className="flex items-center gap-6">
               <span className="text-white tracking-tighter">YOUR EDITOR FRIEND</span>
               <span>&copy; 2024</span>
            </div>
            <div className="flex gap-6 items-center">
              <a href="https://www.instagram.com/iamyoureditorfriend/?hl=en" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="https://www.youtube.com/@Editor_friend" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Youtube size={20} /></a>
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

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/custom-quote" element={<CustomQuotePage />} />
      </Routes>
    </Router>
  );
};

export default App;
