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
  { id: 'fast', label: 'Need fast delivery ⚡' },
  { id: 'broll', label: 'Add B-roll footage 🎞️' },
  { id: 'viral', label: 'Viral captions format 📱' },
  { id: 'sound', label: 'Custom Sound Design 🎧' },
  { id: 'thumb', label: 'Provide Thumbnails 🖼️' }
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
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
- Add-ons: ${selectedTags.map(id => QUICK_TAGS.find(t => t.id === id)?.label).join(', ') || 'None'}
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
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#E50914] pb-32">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </Link>
          <div className="font-bold tracking-tighter text-sm">YOUR EDITOR FRIEND</div>
        </div>
      </nav>

      <main className="pt-24 px-4">
        <div className="max-w-xl mx-auto">
          {/* 1. HEADER */}
          <header className="mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-black tracking-tighter mb-2"
            >
              BUILD YOUR <span className="text-[#E50914]">CUSTOM</span> PLAN
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 text-sm font-light leading-relaxed"
            >
              Select your preferred style, tell us your requirements, and get an exact quote tailored to your vision.
            </motion.p>
          </header>

          {/* 2. CATEGORY SELECTOR (Horizontal Scroll) */}
          <section className="mb-8 -mx-4 px-4 overflow-x-auto no-scrollbar flex gap-2 pb-2">
            {dynamicCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedSubStyle(null);
                }}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold border transition-all shrink-0 ${
                  activeCategory.id === cat.id 
                    ? 'bg-[#E50914] border-[#E50914] text-white shadow-lg shadow-red-900/20' 
                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </section>

          {/* 3. HERO VIDEO PREVIEW */}
          <section className="mb-8">
            <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${selectedSubStyle?.videoUrl || currentAdminStyle?.videoUrl || 'KSoPrGLdUog'}?autoplay=1&mute=1&controls=0&loop=1&playlist=${selectedSubStyle?.videoUrl || currentAdminStyle?.videoUrl || 'KSoPrGLdUog'}&modestbranding=1&rel=0`}
                title={activeCategory.label}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-lg font-bold mb-1">{selectedSubStyle?.name || activeCategory.label}</h3>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  {selectedSubStyle?.description || currentAdminStyle?.description || 'Premium high-retention video editing.'}
                </p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">Base Price</div>
              <div className="text-3xl font-black text-white tracking-tighter">
                ₹{basePrice.toLocaleString()} <span className="text-sm text-zinc-500 font-bold">/ VIDEO</span>
              </div>
            </div>
          </section>

          {/* 4. STYLE SELECTION */}
          {subStyles.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Select Reference Style</h2>
              <div className="space-y-3">
                {subStyles.map((style: any) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedSubStyle(style)}
                    className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 group ${
                      selectedSubStyle?.id === style.id 
                        ? 'bg-zinc-900 border-[#E50914] shadow-lg shadow-red-900/10' 
                        : 'bg-zinc-900/30 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-white/5">
                      <img 
                        src={`https://img.youtube.com/vi/${style.videoUrl}/mqdefault.jpg`} 
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold mb-0.5">{style.name}</div>
                      <div className="text-[10px] text-zinc-500 font-medium">Base: ₹{style.basePrice.toLocaleString()} / video</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedSubStyle?.id === style.id ? 'bg-[#E50914] border-[#E50914]' : 'border-white/10'
                    }`}>
                      {selectedSubStyle?.id === style.id && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 5. QUANTITY SLIDER */}
          <section className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500">Videos needed per month</h2>
              <span className="text-[#E50914] font-black text-2xl">{quantity}</span>
            </div>
            <div className="relative px-2">
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#E50914]"
              />
              <div className="flex justify-between mt-2 px-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <span key={n} className={`text-[10px] font-bold ${quantity === n ? 'text-[#E50914]' : 'text-zinc-700'}`}>{n}</span>
                ))}
              </div>
            </div>
          </section>

          {/* 6. QUICK REQUIREMENTS (Add-ons) */}
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Quick Requirements</h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'bg-[#E50914]/10 border-[#E50914] text-[#E50914]'
                      : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          {/* 7. USER INPUT FORMS */}
          <section className="space-y-6 mb-12">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Paste Reference Video Link</label>
              <input 
                type="url" 
                placeholder="https://instagram.com/reel/..."
                value={refLink}
                onChange={(e) => setRefLink(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Any specific requirements?</label>
              <textarea 
                rows={3}
                placeholder="Tell us about your brand vision..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-[#E50914] outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 block">WhatsApp Number</label>
                <input 
                  type="tel" 
                  placeholder="+91 00000 00000"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-[#E50914] outline-none transition-all"
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 8. STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Estimated Total</span>
            <div className="text-2xl font-black text-white tracking-tighter">
              <NumberCounter value={final} />
            </div>
          </div>
          <button 
            onClick={handleSendWhatsApp}
            disabled={!isFormValid}
            className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 ${
              isFormValid 
                ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20' 
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            Get Custom Quote
          </button>
        </div>
      </div>
    </div>
  );
};
