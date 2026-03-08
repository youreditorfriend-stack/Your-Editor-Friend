import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Briefcase, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ChevronDown,
  Save,
  Loader2,
  ArrowLeft,
  Youtube,
  Type,
  ExternalLink,
  Tag,
  CheckCircle2,
  X,
  GripVertical,
  Lock,
  LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PortfolioVideo {
  id: string;
  title: string;
  youtubeId?: string;
  imgId?: string;
  enabled: boolean;
}

interface PortfolioCategory {
  id: string;
  name: string;
  enabled: boolean;
  videos: PortfolioVideo[];
}

interface ReferenceStyle {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  basePrice: number;
  enabled: boolean;
}

interface PricingCategory {
  id: string;
  name: string;
  enabled: boolean;
  styles: ReferenceStyle[];
}

interface AppData {
  portfolio: PortfolioCategory[];
  pricing: PricingCategory[];
}

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'pricing'>('portfolio');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('admin_token', result.token);
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError('Invalid password');
      }
    } catch (error) {
      setLoginError('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setData(null);
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/portfolio');
      const jsonData = await res.json();
      setData(jsonData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ text: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        setMessage({ text: 'Changes saved successfully!', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setMessage({ text: 'Failed to save changes', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Portfolio Actions
  const addPortfolioCategory = () => {
    if (!data) return;
    const newCat: PortfolioCategory = {
      id: `cat-${Date.now()}`,
      name: 'New Category',
      enabled: true,
      videos: []
    };
    setData({ ...data, portfolio: [...data.portfolio, newCat] });
  };

  const updatePortfolioCategory = (id: string, field: keyof PortfolioCategory, value: any) => {
    if (!data) return;
    setData({
      ...data,
      portfolio: data.portfolio.map(cat => cat.id === id ? { ...cat, [field]: value } : cat)
    });
  };

  const deletePortfolioCategory = (id: string) => {
    if (!data) return;
    if (window.confirm('Are you sure you want to delete this category and all its videos?')) {
      setData({ ...data, portfolio: data.portfolio.filter(cat => cat.id !== id) });
    }
  };

  const addVideo = (catId: string) => {
    if (!data) return;
    const newVid: PortfolioVideo = {
      id: `vid-${Date.now()}`,
      title: 'New Video',
      youtubeId: '',
      enabled: true
    };
    setData({
      ...data,
      portfolio: data.portfolio.map(cat => 
        cat.id === catId ? { ...cat, videos: [newVid, ...cat.videos] } : cat
      )
    });
  };

  const updateVideo = (catId: string, vidId: string, field: keyof PortfolioVideo, value: any) => {
    if (!data) return;
    setData({
      ...data,
      portfolio: data.portfolio.map(cat => 
        cat.id === catId ? {
          ...cat,
          videos: cat.videos.map(vid => vid.id === vidId ? { ...vid, [field]: value } : vid)
        } : cat
      )
    });
  };

  const deleteVideo = (catId: string, vidId: string) => {
    if (!data) return;
    setData({
      ...data,
      portfolio: data.portfolio.map(cat => 
        cat.id === catId ? { ...cat, videos: cat.videos.filter(vid => vid.id !== vidId) } : cat
      )
    });
  };

  // Pricing Actions
  const addPricingCategory = () => {
    if (!data) return;
    const newCat: PricingCategory = {
      id: `pcat-${Date.now()}`,
      name: 'New Pricing Category',
      enabled: true,
      styles: []
    };
    setData({ ...data, pricing: [...data.pricing, newCat] });
  };

  const updatePricingCategory = (id: string, field: keyof PricingCategory, value: any) => {
    if (!data) return;
    setData({
      ...data,
      pricing: data.pricing.map(cat => cat.id === id ? { ...cat, [field]: value } : cat)
    });
  };

  const deletePricingCategory = (id: string) => {
    if (!data) return;
    if (window.confirm('Are you sure you want to delete this pricing category?')) {
      setData({ ...data, pricing: data.pricing.filter(cat => cat.id !== id) });
    }
  };

  const addStyle = (catId: string) => {
    if (!data) return;
    const newStyle: ReferenceStyle = {
      id: `style-${Date.now()}`,
      name: 'New Style',
      description: '',
      videoUrl: '',
      basePrice: 1500,
      enabled: true
    };
    setData({
      ...data,
      pricing: data.pricing.map(cat => 
        cat.id === catId ? { ...cat, styles: [newStyle, ...cat.styles] } : cat
      )
    });
  };

  const updateStyle = (catId: string, styleId: string, field: keyof ReferenceStyle, value: any) => {
    if (!data) return;
    setData({
      ...data,
      pricing: data.pricing.map(cat => 
        cat.id === catId ? {
          ...cat,
          styles: cat.styles.map(style => style.id === styleId ? { ...style, [field]: value } : style)
        } : cat
      )
    });
  };

  const deleteStyle = (catId: string, styleId: string) => {
    if (!data) return;
    setData({
      ...data,
      pricing: data.pricing.map(cat => 
        cat.id === catId ? { ...cat, styles: cat.styles.filter(style => style.id !== styleId) } : cat
      )
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndPortfolio = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && data) {
      const oldIndex = data.portfolio.findIndex((cat) => cat.id === active.id);
      const newIndex = data.portfolio.findIndex((cat) => cat.id === over.id);
      setData({
        ...data,
        portfolio: arrayMove(data.portfolio, oldIndex, newIndex),
      });
    }
  };

  const handleDragEndVideos = (catId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && data) {
      setData({
        ...data,
        portfolio: data.portfolio.map((cat) => {
          if (cat.id === catId) {
            const oldIndex = cat.videos.findIndex((vid) => vid.id === active.id);
            const newIndex = cat.videos.findIndex((vid) => vid.id === over.id);
            return {
              ...cat,
              videos: arrayMove(cat.videos, oldIndex, newIndex),
            };
          }
          return cat;
        }),
      });
    }
  };

  const handleDragEndPricing = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && data) {
      const oldIndex = data.pricing.findIndex((cat) => cat.id === active.id);
      const newIndex = data.pricing.findIndex((cat) => cat.id === over.id);
      setData({
        ...data,
        pricing: arrayMove(data.pricing, oldIndex, newIndex),
      });
    }
  };

  const handleDragEndStyles = (catId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && data) {
      setData({
        ...data,
        pricing: data.pricing.map((cat) => {
          if (cat.id === catId) {
            const oldIndex = cat.styles.findIndex((style) => style.id === active.id);
            const newIndex = cat.styles.findIndex((style) => style.id === over.id);
            return {
              ...cat,
              styles: arrayMove(cat.styles, oldIndex, newIndex),
            };
          }
          return cat;
        }),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E50914]" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/50 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#E50914]/10 rounded-2xl flex items-center justify-center text-[#E50914] mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white mb-2">ADMIN ACCESS</h1>
            <p className="text-zinc-500 text-sm">Please enter your password to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[#E50914] outline-none transition-all placeholder:text-zinc-700"
                autoFocus
              />
              {loginError && (
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-3 text-center">
                  {loginError}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-[#E50914] text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all transform active:scale-95 shadow-xl shadow-red-900/20"
            >
              Unlock Dashboard
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-zinc-600 hover:text-white text-xs font-medium transition-colors">
              Back to Website
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8">
            <ArrowLeft size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Back to Site</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tighter text-white">ADMIN <span className="text-[#E50914]">HUB</span></h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'portfolio' ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
          >
            <Briefcase size={18} /> Portfolio Management
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'pricing' ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
          >
            <DollarSign size={18} /> Pricing Management
          </button>
          
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </nav>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save All Changes
          </button>
          {message && (
            <div className={`mt-4 text-[10px] font-bold uppercase tracking-widest text-center ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {message.text}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'portfolio' ? (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase">Portfolio Management</h2>
                  <p className="text-zinc-500 text-sm">Manage your categories and showcase videos.</p>
                </div>
                <button
                  onClick={addPortfolioCategory}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <Plus size={18} /> Add Category
                </button>
              </div>

              <div className="space-y-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndPortfolio}
                >
                  <SortableContext
                    items={data?.portfolio.map(cat => cat.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {data?.portfolio.map((cat) => (
                      <SortableCategoryItem
                        key={cat.id}
                        cat={cat}
                        updatePortfolioCategory={updatePortfolioCategory}
                        deletePortfolioCategory={deletePortfolioCategory}
                        addVideo={addVideo}
                        updateVideo={updateVideo}
                        deleteVideo={deleteVideo}
                        handleDragEndVideos={handleDragEndVideos}
                        sensors={sensors}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase">Pricing Management</h2>
                  <p className="text-zinc-500 text-sm">Manage categories and reference styles for the quote builder.</p>
                </div>
                <button
                  onClick={addPricingCategory}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <Plus size={18} /> Add Category
                </button>
              </div>

              <div className="space-y-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndPricing}
                >
                  <SortableContext
                    items={data?.pricing.map(cat => cat.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {data?.pricing.map((cat) => (
                      <SortablePricingCategoryItem
                        key={cat.id}
                        cat={cat}
                        updatePricingCategory={updatePricingCategory}
                        deletePricingCategory={deletePricingCategory}
                        addStyle={addStyle}
                        updateStyle={updateStyle}
                        deleteStyle={deleteStyle}
                        handleDragEndStyles={handleDragEndStyles}
                        sensors={sensors}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const SortableCategoryItem = ({ 
  cat, 
  updatePortfolioCategory, 
  deletePortfolioCategory, 
  addVideo, 
  updateVideo, 
  deleteVideo,
  handleDragEndVideos,
  sensors
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
      {/* Category Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-zinc-600 hover:text-white transition-colors">
            <GripVertical size={20} />
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E50914]/10 flex items-center justify-center text-[#E50914]">
            <Tag size={20} />
          </div>
          <input
            type="text"
            value={cat.name}
            onChange={(e) => updatePortfolioCategory(cat.id, 'name', e.target.value)}
            className="bg-transparent border-none text-xl font-bold focus:outline-none focus:ring-0 p-0 w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => updatePortfolioCategory(cat.id, 'enabled', !cat.enabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${cat.enabled ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
          >
            {cat.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            {cat.enabled ? 'Visible' : 'Hidden'}
          </button>
          <button
            onClick={() => deletePortfolioCategory(cat.id)}
            className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Videos in this category</h3>
          <button
            onClick={() => addVideo(cat.id)}
            className="text-[10px] font-black uppercase tracking-widest text-[#E50914] flex items-center gap-1.5 hover:text-red-400 transition-colors"
          >
            <Plus size={14} /> Add Video
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEndVideos(cat.id, event)}
        >
          <SortableContext
            items={cat.videos.map((v: any) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cat.videos.map((vid: any) => (
                <SortableVideoItem
                  key={vid.id}
                  vid={vid}
                  catId={cat.id}
                  updateVideo={updateVideo}
                  deleteVideo={deleteVideo}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {cat.videos.length === 0 && (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
            <p className="text-zinc-600 text-xs">No videos added to this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SortableVideoItem = ({ vid, catId, updateVideo, deleteVideo }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: vid.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-black/40 border rounded-2xl p-4 space-y-4 transition-all ${vid.enabled ? 'border-white/10' : 'border-white/5 opacity-50'}`}
    >
      <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 relative group">
        {vid.youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`}
            className="w-full h-full object-cover"
            alt=""
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800">
            <Youtube size={32} />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <div {...attributes} {...listeners} className="p-2 rounded-lg bg-black/60 backdrop-blur-md text-white/50 hover:text-white cursor-grab active:cursor-grabbing transition-colors">
            <GripVertical size={14} />
          </div>
        </div>
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => updateVideo(catId, vid.id, 'enabled', !vid.enabled)}
            className={`p-2 rounded-lg backdrop-blur-md transition-all ${vid.enabled ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800/80 text-zinc-500'}`}
          >
            {vid.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={() => deleteVideo(catId, vid.id)}
            className="p-2 rounded-lg bg-red-500/20 text-red-500 backdrop-blur-md"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">Video Title</label>
          <input
            type="text"
            value={vid.title}
            onChange={(e) => updateVideo(catId, vid.id, 'title', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E50914]"
          />
        </div>
        <div>
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">YouTube ID</label>
          <input
            type="text"
            value={vid.youtubeId || ''}
            onChange={(e) => updateVideo(catId, vid.id, 'youtubeId', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E50914]"
            placeholder="e.g. KSoPrGLdUog"
          />
        </div>
      </div>
    </div>
  );
};

const SortablePricingCategoryItem = ({
  cat,
  updatePricingCategory,
  deletePricingCategory,
  addStyle,
  updateStyle,
  deleteStyle,
  handleDragEndStyles,
  sensors
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
      {/* Category Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-zinc-600 hover:text-white transition-colors">
            <GripVertical size={20} />
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E50914]/10 flex items-center justify-center text-[#E50914]">
            <DollarSign size={20} />
          </div>
          <input
            type="text"
            value={cat.name}
            onChange={(e) => updatePricingCategory(cat.id, 'name', e.target.value)}
            className="bg-transparent border-none text-xl font-bold focus:outline-none focus:ring-0 p-0 w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => updatePricingCategory(cat.id, 'enabled', !cat.enabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${cat.enabled ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
          >
            {cat.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            {cat.enabled ? 'Visible' : 'Hidden'}
          </button>
          <button
            onClick={() => deletePricingCategory(cat.id)}
            className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Styles List */}
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Reference Styles</h3>
          <button
            onClick={() => addStyle(cat.id)}
            className="text-[10px] font-black uppercase tracking-widest text-[#E50914] flex items-center gap-1.5 hover:text-red-400 transition-colors"
          >
            <Plus size={14} /> Add Style
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEndStyles(cat.id, event)}
        >
          <SortableContext
            items={cat.styles.map((s: any) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {cat.styles.map((style: any) => (
                <SortableStyleItem
                  key={style.id}
                  styleData={style}
                  catId={cat.id}
                  updateStyle={updateStyle}
                  deleteStyle={deleteStyle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {cat.styles.length === 0 && (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
            <p className="text-zinc-600 text-xs">No reference styles added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SortableStyleItem = ({ styleData: style, catId, updateStyle, deleteStyle }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: style.id });

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={`bg-black/40 border rounded-2xl p-6 transition-all ${style.enabled ? 'border-white/10' : 'border-white/5 opacity-50'}`}
    >
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="w-full xl:w-64 aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 relative shrink-0">
          {style.videoUrl ? (
            <img
              src={`https://img.youtube.com/vi/${style.videoUrl}/mqdefault.jpg`}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-800">
              <Youtube size={32} />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <div {...attributes} {...listeners} className="p-2 rounded-lg bg-black/60 backdrop-blur-md text-white/50 hover:text-white cursor-grab active:cursor-grabbing transition-colors">
              <GripVertical size={14} />
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">Style Name</label>
              <input
                type="text"
                value={style.name}
                onChange={(e) => updateStyle(catId, style.id, 'name', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E50914]"
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">Description</label>
              <textarea
                value={style.description}
                onChange={(e) => updateStyle(catId, style.id, 'description', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E50914] h-20 resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">Base Price (₹)</label>
                <input
                  type="number"
                  value={style.basePrice}
                  onChange={(e) => updateStyle(catId, style.id, 'basePrice', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E50914]"
                />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 block">YouTube ID</label>
                <input
                  type="text"
                  value={style.videoUrl}
                  onChange={(e) => updateStyle(catId, style.id, 'videoUrl', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#E50914]"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={() => updateStyle(catId, style.id, 'enabled', !style.enabled)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${style.enabled ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
              >
                {style.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                {style.enabled ? 'Style Enabled' : 'Style Disabled'}
              </button>
              <button
                onClick={() => deleteStyle(catId, style.id)}
                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
