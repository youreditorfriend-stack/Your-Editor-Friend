import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft, 
  MessageCircle, 
  Zap, 
  Upload, 
  Link as LinkIcon, 
  Smartphone, 
  TrendingUp, 
  Info,
  User,
  Phone,
  ShoppingBag,
  Briefcase,
  Layers,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface CustomStyle {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  desc: string;
}

interface StyleCategory {
  id: string;
  label: string;
  styles: CustomStyle[];
}

export const CustomQuotePage: React.FC = () => {
  const [categories, setCategories] = useState<StyleCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<StyleCategory | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CustomStyle | null>(null);
  const [quantity, setQuantity] = useState(5);
  const [refLink, setRefLink] = useState('');
  const [requirements, setRequirements] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const totalContainerRef = useRef<HTMLDivElement>(null);

  const [rawPricing, setRawPricing] = useState<any[]>([]);

  useEffect(() => {
    // Mocking data fetching
    const mockData: StyleCategory[] = [
      {
        id: 'branding',
        label: 'Personal Branding',
        styles: [
          { id: 'styleA', name: 'Style A - Basic Captions', price: '₹3,000', priceNum: 3000, desc: 'Simple captions and basic cuts.' },
          { id: 'styleB', name: 'Style B - Advanced Graphics', price: '₹2,000', priceNum: 2000, desc: 'Premium graphics and motion elements for higher engagement.' },
          { id: 'styleC', name: 'Style C - Cinematic Storytelling', price: '₹2,500', priceNum: 2500, desc: 'Color grading, sound design, and cinematic cuts.' }
        ]
      },
      { id: 'realestate', label: 'Real Estate', styles: [] },
      { id: 'ai', label: 'AI Advertisement', styles: [] },
      { id: 'motion', label: 'Motion Graphics', styles: [] }
    ];
    setCategories(mockData);
    setActiveCategory(mockData[0]);
    setSelectedStyle(mockData[0].styles[1]);
  }, []);

  // Default base price
  const basePrice = selectedStyle ? selectedStyle.priceNum : 1500;

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

  const isFormValid = fullName.trim() !== '' && contactNumber.trim() !== '';

  const handleSendWhatsApp = () => {
    if (!isFormValid) return;
    generatePDF();
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- 1. Fetch & Sanitize Data ---
    const sanitize = (text: string) => text.replace(/[^\x00-\x7F]/g, "").trim();
    
    const clientName = sanitize(fullName || 'Valued Client');
    const clientPhone = sanitize(contactNumber || '');
    
    const formattedFinalTotal = 'Rs. ' + final.toLocaleString('en-IN');
    const formattedOriginalTotal = 'Rs. ' + original.toLocaleString('en-IN');
    
    const selectedStyleLabel = 'Custom Selection';
    const videoCount = `${quantity} Videos`;
    
    const selectedAddonLabels = QUICK_ADDONS
      .filter(addon => selectedAddons[addon.id])
      .map(addon => sanitize(addon.label));
    
    const cleanAddons = selectedAddonLabels.join(', ');
    const isDiscountApplied = discount > 0;
    const discountText = `${discount}% OFF Applied`;

    // Helper Function for Background
    const setDarkBackground = () => {
        doc.setFillColor(15, 15, 15);
        doc.rect(0, 0, 210, 297, 'F');
    };

    // --- 2. FULL DARK BACKGROUND ---
    setDarkBackground();

    // --- 3. HEADER ---
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32); 
    doc.text('QUOTATION', 15, 30);

    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text('YOUR EDITOR FRIEND', 195, 30, { align: 'right' });

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(15, 40, 195, 40);

    // --- 4. BILLING INFO ---
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text('BILL TO:', 15, 55);
    
    doc.setFontSize(14); 
    doc.setTextColor(255, 255, 255);
    doc.text(clientName, 15, 62);
    
    doc.setFontSize(11); 
    doc.setFont("helvetica", "normal");
    doc.text('Ph: ' + clientPhone, 15, 68);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Date:', 150, 62);
    doc.setTextColor(255, 255, 255);
    doc.text(new Date().toLocaleDateString('en-IN'), 195, 62, { align: 'right' });

    const validTill = new Date();
    validTill.setDate(validTill.getDate() + 15);
    doc.setTextColor(150, 150, 150);
    doc.text('Valid Till:', 150, 68);
    doc.setTextColor(255, 255, 255);
    doc.text(validTill.toLocaleDateString('en-IN'), 195, 68, { align: 'right' });

    // --- 5. DYNAMIC TABLE ROWS (Back to 3 Columns) ---
    const tableBodyRows: any[] = [];
    
    // Main Service Row
    tableBodyRows.push([
        selectedStyleLabel + '\nComplete editing, motion graphics, and captions.', 
        videoCount, 
        { content: formattedOriginalTotal, styles: { fontStyle: 'bold' } }
    ]);

    // Add-ons Row (With Reference Link)
    if ((cleanAddons && cleanAddons.length > 0) || refLink) {
        const refText = refLink ? `\nRef: ${sanitize(refLink)}` : '';
        tableBodyRows.push([
            { content: 'Add-ons: ' + (cleanAddons || 'None') + refText, styles: { fontStyle: 'italic', textColor: [180, 180, 180] } },
            '-', 
            { content: 'Included', styles: { fontStyle: 'bold' } }
        ]);
    }

    // Discount Row (Original Price Strike-through)
    if (isDiscountApplied) {
        tableBodyRows.push([
            { content: 'Discount: ' + discountText, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } },
            '-',
            { content: formattedOriginalTotal, styles: { textColor: [255, 80, 80] } } // Strike-out old price manually in didDrawCell
        ]);
    }

    // Draw the Table
    autoTable(doc, {
        startY: 85,
        head: [['Description', 'Quantity', 'Amount']],
        body: tableBodyRows,
        theme: 'plain',
        margin: { left: 15, right: 15 }, 
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', cellPadding: 8, fontSize: 10 },
        bodyStyles: { fillColor: [20, 20, 20], textColor: [200, 200, 200], cellPadding: 8, fontSize: 10 }, 
        columnStyles: {
            0: { cellWidth: 100 }, // Description
            1: { halign: 'center', cellWidth: 35 }, // Quantity
            2: { halign: 'right', cellWidth: 45, fontStyle: 'bold', fontSize: 11, textColor: [255, 255, 255] } // Amount
        },
        didDrawCell: function(data) {
            if (data.row.section === 'body') {
                doc.setDrawColor(40, 40, 40);
                doc.setLineWidth(0.2);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);

                // Manual Strikethrough for original price in discount row (Column 2)
                if (isDiscountApplied && data.row.index === tableBodyRows.length - 1 && data.column.index === 2) {
                    const textWidth = doc.getTextWidth(formattedOriginalTotal);
                    // Right aligned cell: x is start of text
                    const x = data.cell.x + data.cell.width - data.cell.padding('right') - textWidth;
                    const y = data.cell.y + (data.cell.height / 2) + 0.5;
                    
                    doc.setDrawColor(255, 80, 80);
                    doc.setLineWidth(0.5);
                    doc.line(x, y, x + textWidth, y);
                }
            }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // --- PAGINATION CHECK 1 ---
    if (finalY > 250) {
        doc.addPage();
        setDarkBackground();
        finalY = 20;
    }

    // --- 6. ESTIMATED TOTAL (Right Aligned, Bold) ---
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text('ESTIMATED TOTAL', 195, finalY, { align: 'right' });

    // Final Price (Extra Large & Bold)
    doc.setFontSize(42); 
    doc.setTextColor(255, 255, 255);
    const finalPriceText = `Rs. ${final.toLocaleString('en-IN')}`; 
    doc.text(finalPriceText, 195, finalY + 18, { align: 'right' });

    // Update finalY for next section
    finalY += 30;

    // --- PAGINATION CHECK 2 ---
    finalY += 35;
    if (finalY > 250) {
        doc.addPage();
        setDarkBackground();
        finalY = 20;
    }

    // --- 7. TERMS & CONDITIONS ---
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text('TERMS & CONDITIONS', 15, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(170, 170, 170);
    
    const terms = [
        "1. Payment: 50% advance required to commence work. Balance upon completion.",
        "2. Revisions: Includes up to 2 major revisions. Minor tweaks within 7 days.",
        "3. Assets: Client must provide high-res raw footage & assets via cloud storage.",
        "4. Delivery: Standard turnaround is 48-72 hours per video.",
        "5. Transfer: Account Transfer / UPI accepted."
    ];

    let termY = finalY + 8;
    terms.forEach(term => {
        doc.text(term, 15, termY);
        termY += 6;
    });

    // --- 8. NEW FOOTER ---
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100); 
    doc.text('Email: youreditorfriend@gmail.com  |  Website: youreditorfriend.in  |  WhatsApp: +91 63674343169', 105, 285, { align: 'center' });

    // Save PDF
    doc.save(`Quotation_YourEditorFriend_${fullName.replace(/\s+/g, '_')}.pdf`);

    // Trigger WhatsApp Redirect
    const message = `Hi Janish! I'm looking for a custom quote:
- Name: ${fullName}
- Contact: ${contactNumber}
- Quantity: ${quantity} videos/month
- Add-ons: ${selectedAddonLabels.length > 0 ? selectedAddonLabels.join(', ') : 'None'}
- Reference Link: ${refLink || 'Not provided'}
- Requirements: ${requirements || 'None'}
- Estimated Total: ₹${final.toLocaleString()}

I have also downloaded the PDF quotation. Please check it!`;
    
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
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#E50914] custom-quote-container">
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

      <main className="pt-24 md:pt-32 pb-[280px] md:pb-[200px] px-4 md:px-6 main-content">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 md:mb-16 text-center md:text-left">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-6xl font-black tracking-tighter mb-4"
            >
              BUILD YOUR <span className="text-[#E50914]">CUSTOM</span> PLAN
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 text-base md:text-lg max-w-2xl font-light"
            >
              Select your preferred style, tell us your requirements, and get an exact quote tailored to your vision.
            </motion.p>
          </header>

          <div className="space-y-12 md:space-y-20">
            {/* Style Selection Section */}
            <section className="space-y-8">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Smartphone size={24} className="text-[#E50914]" /> 1. Select Your Style
              </h2>
              
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat); setSelectedStyle(cat.styles[0] || null); }}
                    className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all ${
                      activeCategory?.id === cat.id
                        ? 'bg-[#E50914] text-white'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {activeCategory && activeCategory.styles.length > 0 && (
                <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-6 md:p-10 flex flex-col md:flex-row gap-10">
                  <div className="w-full md:w-5/12 flex justify-center">
                    <div className="relative w-full max-w-[280px] aspect-[9/16] bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700">
                      <img src="https://via.placeholder.com/280x500/333/fff?text=Video+Preview" alt="Video Preview" className="w-full h-full object-cover opacity-80" />
                    </div>
                  </div>

                  <div className="w-full md:w-7/12 flex flex-col justify-center">
                    <div id="dynamic-content">
                      <h1 className="text-3xl font-bold mb-3">{selectedStyle?.name} | {selectedStyle?.price}</h1>
                      <p className="text-zinc-400 mb-6 text-sm md:text-base">{selectedStyle?.desc}</p>
                      <div className="text-4xl font-extrabold mb-1">{selectedStyle?.price} <span className="text-sm font-medium text-zinc-500 tracking-widest uppercase">/ Video</span></div>
                    </div>

                    <div className="w-full h-px bg-zinc-800 my-8"></div>

                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Variations</h3>
                    
                    <div className="flex flex-col gap-3">
                      {activeCategory.styles.map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setSelectedStyle(style)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex justify-between items-center ${
                            selectedStyle?.id === style.id ? 'border-[#E50914] bg-[#1a1a1a]' : 'border-zinc-800 bg-[#121212] hover:border-zinc-600'
                          }`}
                        >
                          <span className="font-semibold text-sm">{style.name} | {style.price}</span>
                          {selectedStyle?.id === style.id && <CheckCircle2 size={16} className="text-[#E50914]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Requirements Section */}
            <section className="space-y-8 md:space-y-12">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Zap size={24} className="text-[#E50914]" /> 2. Tell us what you need
              </h2>

              <div className="space-y-8 md:space-y-12">
                {/* Quantity Slider */}
                <div className="bg-zinc-900/30 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/5">
                  <div className="flex justify-between items-end mb-6">
                    <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Videos needed per month</label>
                    <span className="text-[#E50914] font-black text-3xl md:text-4xl">{quantity}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                  />
                  <div className="flex justify-between mt-4 text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-700 font-bold">
                      <span>1 Video</span>
                      <span>30 Videos</span>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="space-y-4">
                  <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block">Quick Add-ons</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 addons-grid">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 input-group">
                    <div>
                      <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block flex items-center gap-2">
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
                      <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block">Specific Requirements</label>
                      <textarea 
                        rows={1}
                        placeholder="Tell us more about your vision..."
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700 resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 input-group">
                    <div>
                      <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block flex items-center gap-2">
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
                      <label className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3 block flex items-center gap-2">
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
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 relative z-10 pricing-bar-content">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-12">
            
            {/* Left Side: Estimated Total */}
            <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
              <div className="flex flex-col items-start">
                <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-0 md:mb-1">Estimated Total</span>
                <div className="flex items-baseline gap-2 md:gap-4">
                  <div className="text-2xl md:text-6xl font-black text-white tracking-tighter price-display">
                    <NumberCounter value={final} />
                  </div>
                  {discount > 0 && (
                    <div className="text-zinc-500 text-sm md:text-lg line-through decoration-red-500/50 font-medium">
                      ₹{original.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Discount Badge */}
              <div className="md:hidden">
                <AnimatePresence>
                  {discount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#E50914] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    >
                      {discount}% OFF
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Middle: Discount Badge (Desktop) */}
            <div className="hidden md:flex flex-1 justify-center">
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
                className={`w-full md:w-auto px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl get-quote-btn ${
                  isFormValid 
                    ? 'bg-[#E50914] text-white hover:bg-red-700 shadow-red-900/20' 
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                Get Custom Quote <ChevronRight size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
        &copy; 2024 YOUR EDITOR FRIEND &bull; PREMIUM VIDEO EDITING
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .custom-quote-container {
            padding: 10px !important;
          }
          
          h1 { font-size: 1.5rem !important; margin-bottom: 0.5rem !important; }
          h2 { font-size: 1.1rem !important; }
          
          .main-content {
            padding-top: 5rem !important;
            padding-bottom: 180px !important;
          }

          .category-nav {
            flex-wrap: nowrap !important;
            gap: 6px !important;
            justify-content: flex-start !important;
          }
          
          .category-btn {
            padding: 6px 12px !important;
            font-size: 0.6rem !important;
          }
          
          .style-selection-grid {
            padding: 1rem !important;
            border-radius: 1.5rem !important;
          }
          
          .video-preview-card {
            width: 100% !important;
            max-width: 180px !important;
            margin: 0 auto !important;
          }
          
          .variations-list {
            margin-top: 10px !important;
          }
          
          .pricing-bar-content {
            padding: 10px !important;
          }
          
          .price-display {
            font-size: 1.5rem !important;
          }
          
          .get-quote-btn {
            padding: 12px !important;
            font-size: 0.9rem !important;
          }
        }
      `}} />
    </div>
  );
};
