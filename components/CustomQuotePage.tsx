import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion';
import html2pdf from 'html2pdf.js';
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

const QUICK_ADDONS = [
  { id: 'fast_delivery', label: 'Need fast delivery ⚡' },
  { id: 'thumbnails', label: 'Provide Thumbnails 🖼️' }
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
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const totalContainerRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (discount >= 10) {
      import('canvas-confetti').then((confetti) => {
        const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
        if (canvas) {
          const myConfetti = confetti.create(canvas, {
            resize: true,
            useWorker: true
          });
          myConfetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#E50914', '#ffffff', '#ff0000'],
          });
        }
      });
    }
  }, [discount]);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isFormValid = fullName.trim() !== '' && contactNumber.trim() !== '' && (subStyles.length === 0 || selectedSubStyle);

  const handleSendWhatsApp = () => {
    if (!isFormValid) return;
    generatePDF();
  };

  const generatePDF = () => {
    const selectedAddonLabels = QUICK_ADDONS
      .filter(addon => selectedAddons[addon.id])
      .map(addon => addon.label);

    const styleDescription = `${activeCategory.label} ${selectedSubStyle ? `(${selectedSubStyle.name})` : ''}`;
    const addonsText = selectedAddonLabels.length > 0 ? ` + ${selectedAddonLabels.join(', ')}` : '';
    const fullDescription = `${styleDescription}${addonsText}`;

    // 1. Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-pdf-container';
    // Position it off-screen but keep it fully visible to the browser engine
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '-10000px';
    tempDiv.style.left = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = '#ffffff'; // Force strict white background
    tempDiv.style.padding = '0';
    tempDiv.style.zIndex = '-999';

    // 2. Build the Agency Quotation UI using inline CSS
    tempDiv.innerHTML = `
        <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #ffffff; min-height: 1130px;">
            
            <div style="background-color: #1b3b86; color: #ffffff; padding: 40px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                <div>
                    <h1 style="margin: 0; font-size: 42px; letter-spacing: 2px;">QUOTATION</h1>
                    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your Editor Friend</p>
                </div>
                <div style="background-color: #ffffff; color: #1b3b86; padding: 20px 30px; border-radius: 12px; text-align: right;">
                    <p style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Estimated Total</p>
                    <h2 style="margin: 5px 0 0 0; font-size: 32px;">₹${final.toLocaleString()}</h2>
                </div>
            </div>

            <div style="margin-bottom: 40px; padding: 0 10px;">
                <p style="margin: 5px 0; font-size: 18px;"><strong>To:</strong> ${fullName}</p>
                <p style="margin: 5px 0; font-size: 18px;"><strong>Contact:</strong> ${contactNumber}</p>
                <p style="margin: 5px 0; font-size: 16px; color: #666;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px;">
                <thead>
                    <tr style="background-color: #f3f4f6; color: #1b3b86; text-align: left;">
                        <th style="padding: 16px; border-radius: 8px 0 0 8px;">Description</th>
                        <th style="padding: 16px;">Qty</th>
                        <th style="padding: 16px; border-radius: 0 8px 8px 0;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 20px 16px; font-size: 16px;">${fullDescription}</td>
                        <td style="padding: 20px 16px; font-size: 16px;">${quantity} Videos</td>
                        <td style="padding: 20px 16px; font-size: 16px;">₹${final.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div style="padding: 20px; background-color: #f8fafc; border-left: 4px solid #1b3b86; border-radius: 0 8px 8px 0;">
                <h3 style="margin-top: 0; color: #1b3b86; font-size: 18px;">Terms and Conditions</h3>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">1. Payment Methods: Account Transfer, UPI Transfer.</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">2. 50% advance payment is required to commence work.</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">3. This quote includes up to 2 rounds of minor revisions.</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">4. This quotation is valid for 15 days.</p>
            </div>

            <div style="margin-top: 100px; text-align: center;">
                <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #ccc; font-weight: bold;">Thank you for choosing Your Editor Friend</p>
            </div>
        </div>
    `;

    // 3. Append to body so html2canvas can 'see' it
    document.body.appendChild(tempDiv);

    // 4. Generate PDF
    const opt = {
      margin: 0,
      filename: `Quotation_YourEditorFriend_${fullName.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
      jsPDF: { unit: 'px' as const, format: [800, 1130] as [number, number], orientation: 'portrait' as const }
    };

    // 5. Use a small timeout to ensure the DOM is painted before capturing
    setTimeout(() => {
      html2pdf().set(opt).from(tempDiv).save().then(() => {
        // 6. Clean up: Remove the temporary div
        document.body.removeChild(tempDiv);
        
        // 7. Trigger WhatsApp Redirect
        const message = `Hi Janish! I'm looking for a custom quote:
- Name: ${fullName}
- Contact: ${contactNumber}
- Video Type: ${activeCategory.label} ${selectedSubStyle ? `(${selectedSubStyle.name})` : ''}
- Quantity: ${quantity} videos/month
- Add-ons: ${selectedAddonLabels.length > 0 ? selectedAddonLabels.join(', ') : 'None'}
- Reference Link: ${refLink || 'Not provided'}
- Requirements: ${requirements || 'None'}
- Estimated Total: ₹${final.toLocaleString()}

I have also downloaded the PDF quotation. Please check it!`;
        
        const url = `https://wa.me/916374343169?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      });
    }, 300);
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

      <main className="pt-32 pb-[200px] px-6">
        <div className="max-w-4xl mx-auto">
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

          <div className="space-y-20">
            {/* Style Selection Section */}
            <section className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Play size={24} className="text-[#E50914]" /> 1. Select Your Style
              </h2>
              
              <div className="flex flex-wrap gap-2 pb-4">
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat);
                      setSelectedSubStyle(null);
                    }}
                    className={`px-6 py-3 rounded-full border transition-all whitespace-nowrap text-[10px] font-bold tracking-widest uppercase ${
                      activeCategory.id === cat.id 
                        ? 'bg-[#E50914] text-white border-[#E50914]' 
                        : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center bg-zinc-900/30 p-8 rounded-[2.5rem] border border-white/5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory.id + (selectedSubStyle?.id || '')}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex justify-center"
                  >
                    <div className="relative aspect-[9/16] w-full max-w-[240px] rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${selectedSubStyle?.videoUrl || currentAdminStyle?.videoUrl || 'KSoPrGLdUog'}?autoplay=1&mute=1&controls=0&loop=1&playlist=${selectedSubStyle?.videoUrl || currentAdminStyle?.videoUrl || 'KSoPrGLdUog'}&modestbranding=1&rel=0`}
                        title={activeCategory.label}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      ></iframe>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{selectedSubStyle?.name || activeCategory.label}</h3>
                    <p className="text-zinc-400 font-light leading-relaxed">
                      {selectedSubStyle?.description || currentAdminStyle?.description || 'Premium high-retention video editing.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-white tracking-tighter">
                        ₹{basePrice.toLocaleString()}
                        <span className="text-sm text-zinc-500 font-bold ml-2 uppercase tracking-widest">/ video</span>
                      </span>
                    </div>
                  </div>

                  {subStyles.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block">Variations</label>
                      <div className="grid grid-cols-1 gap-2">
                        {subStyles.map((style: any) => (
                          <button
                            key={style.id}
                            onClick={() => setSelectedSubStyle(style)}
                            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between group ${
                              selectedSubStyle?.id === style.id 
                                ? 'bg-white/10 border-[#E50914]' 
                                : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <span className="text-xs font-bold">{style.name}</span>
                            {selectedSubStyle?.id === style.id && <CheckCircle2 size={14} className="text-[#E50914]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Requirements Section */}
            <section className="space-y-12">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap size={24} className="text-[#E50914]" /> 2. Tell us what you need
              </h2>

              <div className="space-y-12">
                {/* Quantity Slider */}
                <div className="bg-zinc-900/30 p-8 rounded-[2.5rem] border border-white/5">
                  <div className="flex justify-between items-end mb-6">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Videos needed per month</label>
                    <span className="text-[#E50914] font-black text-4xl">{quantity}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                  />
                  <div className="flex justify-between mt-4 text-[10px] uppercase tracking-widest text-zinc-700 font-bold">
                      <span>1 Video</span>
                      <span>30 Videos</span>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block">Quick Add-ons</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {QUICK_ADDONS.map((addon) => (
                      <button
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        className={`p-4 rounded-2xl border text-[10px] font-bold text-left transition-all flex items-center gap-3 ${
                          selectedAddons[addon.id]
                            ? 'bg-[#E50914]/20 border-[#E50914] text-white'
                            : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        {selectedAddons[addon.id] ? <CheckCircle2 size={14} className="text-[#E50914]" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                        {addon.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid gap-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block flex items-center gap-2">
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
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block">Specific Requirements</label>
                      <textarea 
                        rows={1}
                        placeholder="Tell us more about your vision..."
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700 resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block flex items-center gap-2">
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
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block flex items-center gap-2">
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
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Full Width Fixed Bottom Pricing Bar */}
      <div 
        ref={totalContainerRef}
        style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 9999 }}
        className={`bg-zinc-900/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all overflow-hidden ${discount >= 10 ? 'animate-shimmer' : ''}`}
      >
        <canvas id="confetti-canvas" className="absolute inset-0 w-full h-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
            
            {/* Left Side: Estimated Total */}
            <div className="flex flex-col items-center md:items-start">
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1">Estimated Total</span>
              <div className="flex items-baseline gap-4">
                <div className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                  <NumberCounter value={final} />
                </div>
                {discount > 0 && (
                  <div className="text-zinc-500 text-lg line-through decoration-red-500/50 font-medium hidden md:block">
                    ₹{original.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Discount Badge */}
            <div className="flex-1 flex justify-center">
              <AnimatePresence>
                {discount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      scale: {
                        duration: 0.6,
                        repeat: Infinity,
                        repeatDelay: 1.5,
                        ease: "easeInOut"
                      }
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="flex items-center gap-2 bg-[#E50914] text-white text-xs md:text-sm font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-[0_0_30px_rgba(229,9,20,0.4)]"
                  >
                    {discount === 5 ? '🔥' : '🎉'} {discount}% OFF Applied
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side: CTA Button */}
            <div className="w-full md:w-auto">
              <button 
                onClick={handleSendWhatsApp}
                disabled={!isFormValid}
                className={`w-full md:w-auto px-12 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl ${
                  isFormValid 
                    ? 'bg-[#E50914] text-white hover:bg-red-700 shadow-red-900/20' 
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                Get Custom Quote <ChevronRight size={24} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
        &copy; 2024 YOUR EDITOR FRIEND &bull; PREMIUM VIDEO EDITING
      </footer>

      {/* Hidden PDF Template Container removed as we use Dynamic DOM Injection */}
    </div>
  );
};
