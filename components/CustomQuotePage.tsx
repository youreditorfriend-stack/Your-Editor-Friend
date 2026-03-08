import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion';
import { 
  ArrowLeft, 
  MessageCircle, 
  Zap, 
  Upload, 
  Link as LinkIcon, 
  Smartphone, 
  TrendingUp, 
  Play, 
  Layers,
  ChevronRight,
  CheckCircle2,
  Info,
  User,
  Phone,
  ShoppingBag,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CustomStyle {
  id: string;
  name: string;
  videoUrl: string;
  description: string;
  singlePrice: number;
  discount6to15: number;
  discount16plus: number;
  category: string;
}

const CATEGORIES = [
  { id: 'Personal Branding', label: 'Personal Branding', icon: <Smartphone size={18} /> },
  { id: 'Real Estate', label: 'Real Estate', icon: <TrendingUp size={18} /> },
  { id: 'AI Advertisement', label: 'AI Advertisement', icon: <Zap size={18} /> },
  { id: 'Motion Graphics', label: 'Motion Graphics', icon: <Layers size={18} /> },
  { id: 'Basic Business Reel', label: 'Basic Business Reel', icon: <Briefcase size={18} /> },
  { id: 'Normal Business Shop Edit', label: 'Normal Business Shop Edit', icon: <ShoppingBag size={18} /> }
];

const QUICK_TAGS = [
  'Need fast delivery ⚡',
  'Add B-roll footage 🎞️',
  'Viral captions format 🔠',
  'Custom Sound Design 🎧',
  'Provide Thumbnails 🖼️'
];

const NumberCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 0.5,
      onUpdate: (latest) => setDisplayValue(Math.round(latest))
    });
    return () => controls.stop();
  }, [value]);

  return <span>₹{displayValue.toLocaleString()}</span>;
};

export const CustomQuotePage: React.FC = () => {
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [categorySettings, setCategorySettings] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [selectedSubStyle, setSelectedSubStyle] = useState<any>(null);
  const [quantity, setQuantity] = useState(5);
  const [refLink, setRefLink] = useState('');
  const [requirements, setRequirements] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const res = await fetch('/api/portfolio');
        const data = await res.json();
        
        // Flatten styles from all enabled pricing categories
        const pricingCategories = data.pricing || [];
        const allStyles: any[] = [];
        const settings: Record<string, boolean> = {};
        
        pricingCategories.forEach((cat: any) => {
          settings[cat.name] = cat.enabled !== false;
          if (cat.enabled !== false) {
            cat.styles.forEach((style: any) => {
              if (style.enabled !== false) {
                allStyles.push({
                  ...style,
                  category: cat.name,
                  // Map basePrice to singlePrice for compatibility
                  singlePrice: style.basePrice
                });
              }
            });
          }
        });
        
        setCustomStyles(allStyles);
        setCategorySettings(settings);
        
        if (allStyles.length > 0) {
          const firstStyle = allStyles[0];
          setActiveCategory({ 
            id: firstStyle.category, 
            label: firstStyle.category, 
            icon: CATEGORIES.find(c => c.id === firstStyle.category)?.icon || <Smartphone size={18} /> 
          });
        }
      } catch (error) {
        console.error('Failed to fetch styles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStyles();
  }, []);

  // Use admin styles to build the category list, filtered by visibility settings
  const dynamicCategories = customStyles
    .reduce((acc: any[], style: any) => {
      if (!acc.find(c => c.id === style.category)) {
        acc.push({
          id: style.category,
          label: style.category,
          icon: CATEGORIES.find(c => c.id === style.category)?.icon || <Smartphone size={18} />
        });
      }
      return acc;
    }, []);

  // Get active style data from admin or defaults
  const currentAdminStyle = customStyles.find(s => s.category === activeCategory.id);
  
  // Get sub-styles for the active category from the raw data
  const [rawPricing, setRawPricing] = useState<any[]>([]);
  useEffect(() => {
    const fetchRaw = async () => {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      setRawPricing(data.pricing || []);
    };
    fetchRaw();
  }, []);

  const activePricingCategory = rawPricing.find(cat => cat.name === activeCategory.id);
  const subStyles = activePricingCategory?.styles?.filter((s: any) => s.enabled !== false) || [];

  const basePrice = selectedSubStyle?.basePrice || currentAdminStyle?.singlePrice || 1500;

  const calculateQuote = () => {
    const original = basePrice * quantity;
    let discountPercent = 0;
    
    // Use admin defined discounts if available, else fallback to defaults
    const d6to15 = 5; // Default discount
    const d16plus = 10; // Default discount

    if (quantity >= 16) discountPercent = d16plus;
    else if (quantity >= 6) discountPercent = d6to15;

    const final = original * (1 - discountPercent / 100);
    return { original, final, discount: discountPercent };
  };

  const { original, final, discount } = calculateQuote();

  const handleTagClick = (tag: string) => {
    setRequirements(prev => prev ? `${prev}\n${tag}` : tag);
  };

  const isFormValid = fullName.trim() !== '' && contactNumber.trim() !== '' && (subStyles.length === 0 || selectedSubStyle);

  const handleSendWhatsApp = () => {
    if (!isFormValid) return;

    const message = `Hi Janish! I'm looking for a custom quote:
- Name: ${fullName}
- Contact: ${contactNumber}
- Video Type: ${activeCategory.label} ${selectedSubStyle ? `(${selectedSubStyle.name})` : ''}
- Quantity: ${quantity} videos/month
- Reference Link: ${refLink || 'Not provided'}
- Requirements: ${requirements || 'None'}
- Estimated Total: ₹${final.toLocaleString()}`;
    
    const url = `https://wa.me/916374343169?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E50914]/20 border-t-[#E50914] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#E50914]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div className="font-bold tracking-tighter">YOUR EDITOR FRIEND</div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 text-center md:text-left">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-black tracking-tighter mb-4"
            >
              BUILD YOUR <span className="text-[#E50914]">CUSTOM</span> PLAN
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 text-lg max-w-2xl font-light"
            >
              Select your preferred style, tell us your requirements, and get an exact quote tailored to your vision.
            </motion.p>
          </header>

          <div className="grid lg:grid-cols-2 gap-0 items-start -mx-6 md:mx-0">
            {/* Left Section: Sticky Preview (Desktop) */}
            <section className="lg:h-[calc(100vh-8rem)] lg:sticky lg:top-32 p-6 lg:pr-12 lg:border-r border-white/5 flex flex-col">
              <div className="flex-1 flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Play size={20} className="text-[#E50914]" /> Select Your Style
                </h2>
                
                <div className="flex flex-wrap gap-3 mb-8">
                  {dynamicCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat);
                        setSelectedSubStyle(null);
                      }}
                      className={`px-6 py-2 rounded-full border transition-all text-[10px] font-bold tracking-widest uppercase ${
                        activeCategory.id === cat.id 
                          ? 'bg-[#E50914] text-white border-[#E50914]' 
                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory.id + (selectedSubStyle?.id || '')}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex flex-col items-center justify-center"
                  >
                    <div className="relative aspect-[9/16] w-full max-w-[280px] rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${selectedSubStyle?.videoUrl || currentAdminStyle?.videoUrl || 'KSoPrGLdUog'}?autoplay=1&mute=1&controls=0&loop=1&playlist=${selectedSubStyle?.videoUrl || currentAdminStyle?.videoUrl || 'KSoPrGLdUog'}&modestbranding=1&rel=0`}
                        title={activeCategory.label}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      ></iframe>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <h3 className="text-lg font-bold mb-1">{selectedSubStyle?.name || activeCategory.label}</h3>
                        <p className="text-[10px] text-zinc-400 font-light leading-relaxed line-clamp-2">
                          {selectedSubStyle?.description || currentAdminStyle?.description || 'Premium high-retention video editing.'}
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Pricing Text */}
                    <div className="mt-8 text-center">
                      <div className="flex items-baseline justify-center gap-3">
                        {discount > 0 ? (
                          <>
                            <span className="text-zinc-500 text-lg line-through decoration-red-500/50 font-medium">
                              ₹{basePrice.toLocaleString()}
                            </span>
                            <span className="text-3xl font-black text-white tracking-tighter">
                              ₹{Math.round(basePrice * (1 - discount / 100)).toLocaleString()}
                              <span className="text-sm text-zinc-500 font-bold ml-2 uppercase tracking-widest">/ video</span>
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-black text-white tracking-tighter">
                            ₹{basePrice.toLocaleString()}
                            <span className="text-sm text-zinc-500 font-bold ml-2 uppercase tracking-widest">/ video</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mt-2">
                        {discount > 0 ? `Bulk Discount Applied (${discount}% OFF)` : 'Standard Single Video Pricing'}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>

            {/* Right Section: Scrollable Form (Desktop) */}
            <section className="p-6 lg:pl-12 pb-32 lg:pb-12">
              <div className="max-w-xl mx-auto lg:mx-0 space-y-12">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap size={24} className="text-[#E50914]" /> Tell us what you need
                </h2>

                <div className="space-y-12">
                  {/* Nested Sub-Styles for Active Category */}
                  <AnimatePresence>
                    {subStyles.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block">Select Reference Style</label>
                        <div className="grid grid-cols-1 gap-3">
                          {subStyles.map((style: any) => (
                            <button
                              key={style.id}
                              onClick={() => setSelectedSubStyle(style)}
                              className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                                selectedSubStyle?.id === style.id 
                                  ? 'bg-white/10 border-[#E50914]' 
                                  : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                                  <img 
                                    src={`https://img.youtube.com/vi/${style.videoUrl}/mqdefault.jpg`} 
                                    className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                                    alt=""
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-bold">{style.name}</div>
                                  <div className="text-[10px] text-zinc-500">Base: ₹{style.basePrice.toLocaleString()} / video</div>
                                </div>
                              </div>
                              {selectedSubStyle?.id === style.id && <CheckCircle2 size={20} className="text-[#E50914]" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quantity Slider */}
                  <div>
                    <div className="flex justify-between items-end mb-6">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Videos needed per month</label>
                      <span className="text-[#E50914] font-black text-3xl">{quantity}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                    />
                    <div className="flex justify-between mt-2 text-[10px] uppercase tracking-widest text-zinc-700 font-bold">
                        <span>1 Video</span>
                        <span>30 Videos</span>
                    </div>
                  </div>

                  {/* Quick Tags */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4 block">Quick Add-ons</label>
                    <div className="grid grid-cols-2 gap-3">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagClick(tag)}
                          className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 text-[10px] font-medium text-left hover:bg-white/5 hover:border-white/10 transition-all flex items-center gap-2"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block flex items-center gap-2">
                        <LinkIcon size={12} /> Reference Video Link
                      </label>
                      <input 
                        type="text" 
                        placeholder="Instagram / TikTok / YouTube link"
                        value={refLink}
                        onChange={(e) => setRefLink(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Specific Requirements</label>
                      <textarea 
                        rows={3}
                        placeholder="Tell us more about your vision..."
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block flex items-center gap-2">
                          <User size={12} /> Full Name *
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block flex items-center gap-2">
                          <Phone size={12} /> WhatsApp Number *
                        </label>
                        <input 
                          type="tel" 
                          required
                          placeholder="+91 00000 00000"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Quote Preview */}
                  <div className="hidden lg:block p-8 bg-zinc-900/50 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Estimated Total</span>
                        {discount > 0 && (
                          <div className="text-zinc-500 text-sm line-through decoration-red-500/50">
                            ₹{original.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-5xl font-black text-white tracking-tighter">
                          <NumberCounter value={final} />
                        </div>
                        <AnimatePresence>
                          {discount > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="inline-flex items-center gap-1.5 bg-[#E50914] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-2 shadow-lg shadow-red-500/20"
                            >
                              {discount === 5 ? '🔥' : '🎉'} {discount}% OFF Applied
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-zinc-600 text-[10px] italic leading-relaxed">
                        <Info size={12} className="shrink-0" />
                        Note: This is an estimated rough pricing. Final quote may vary based on complexity.
                      </div>
                      
                      <button 
                        onClick={handleSendWhatsApp}
                        disabled={!isFormValid}
                        className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl ${
                          isFormValid 
                            ? 'bg-[#E50914] text-white hover:bg-red-700 shadow-red-900/20' 
                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        Get Custom Quote <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Checkout Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-white/10 p-4 z-50 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-opacity-90">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Total Est.</p>
          <p className="text-2xl font-black text-[#E50914] tracking-tighter">
            <NumberCounter value={final} />
          </p>
        </div>
        <button 
          onClick={handleSendWhatsApp}
          disabled={!isFormValid}
          className={`flex-1 py-4 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
            isFormValid 
              ? 'bg-[#E50914] text-white shadow-red-900/20' 
              : 'bg-zinc-800 text-zinc-600'
          }`}
        >
          Get Quote
        </button>
      </div>
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
        &copy; 2024 YOUR EDITOR FRIEND &bull; PREMIUM VIDEO EDITING
      </footer>
    </div>
  );
};
