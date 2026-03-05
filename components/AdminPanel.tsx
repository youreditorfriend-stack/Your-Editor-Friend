import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Youtube, 
  Type, 
  Tag,
  ExternalLink,
  Loader2,
  Lock,
  LogIn
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  youtubeId?: string;
  imgId?: string;
}

const CATEGORIES = ['Personal branding', 'AI Advertisement', 'Real Estate', 'Motion graphics', 'Youtube long form'];

export const AdminPanel: React.FC = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      verifyPassword(savedPassword);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyPassword = async (pwd: string) => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('admin_password', pwd);
        fetchPortfolio();
      } else {
        setAuthError('Invalid password');
        localStorage.removeItem('admin_password');
      }
    } catch (error) {
      setAuthError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    verifyPassword(password);
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const pwd = localStorage.getItem('admin_password');
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, data: items }),
      });
      if (res.ok) {
        setMessage('Portfolio updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Unauthorized. Please log in again.');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to save portfolio:', error);
      setMessage('Error saving portfolio.');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      title: 'New Project',
      category: CATEGORIES[0],
      youtubeId: '',
    };
    setItems([newItem, ...items]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof PortfolioItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-xl"
        >
          <div className="w-16 h-16 bg-[#E50914]/10 rounded-2xl flex items-center justify-center text-[#E50914] mb-6 mx-auto">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access</h1>
          <p className="text-zinc-500 text-center mb-8 text-sm">Please enter your password to continue.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#E50914] outline-none transition-all"
                autoFocus
              />
              {authError && <p className="text-red-500 text-xs mt-2 ml-1">{authError}</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-[#E50914] hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogIn size={18} /> Login
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <Link to="/" className="text-zinc-500 hover:text-white text-sm transition-colors flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Back to Site
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4">
              <ArrowLeft size={16} /> Back to Site
            </Link>
            <h1 className="text-4xl font-black tracking-tighter">MASTER CONTROL</h1>
            <p className="text-zinc-500">Manage your portfolio videos and projects.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => {
                localStorage.removeItem('admin_password');
                setIsAuthenticated(false);
              }}
              className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl font-bold transition-all"
            >
              Logout
            </button>
            <button 
              onClick={addItem}
              className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={20} /> Add New
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none bg-[#E50914] hover:bg-red-700 px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </button>
          </div>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl mb-8 text-center font-bold"
          >
            {message}
          </motion.div>
        )}

        <div className="grid gap-4">
          {items.map((item) => (
            <motion.div 
              layout
              key={item.id}
              className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start md:items-center group hover:border-white/10 transition-colors"
            >
              <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                {item.youtubeId ? (
                  <img 
                    src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`} 
                    className="w-full h-full object-cover"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Youtube size={32} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-1.5">
                    <Type size={10} /> Title
                  </label>
                  <input 
                    type="text" 
                    value={item.title}
                    onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[#E50914] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-1.5">
                    <Tag size={10} /> Category
                  </label>
                  <select 
                    value={item.category}
                    onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[#E50914] outline-none transition-colors appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-1.5">
                    <Youtube size={10} /> YouTube ID
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="e.g. KSoPrGLdUog"
                      value={item.youtubeId || ''}
                      onChange={(e) => updateItem(item.id, 'youtubeId', e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[#E50914] outline-none transition-colors pr-10"
                    />
                    {item.youtubeId && (
                      <a 
                        href={`https://youtube.com/watch?v=${item.youtubeId}`} 
                        target="_blank" 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => removeItem(item.id)}
                className="p-3 rounded-xl bg-red-500/5 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all self-end md:self-center"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-zinc-500">No items found. Add your first project!</p>
          </div>
        )}
      </div>
    </div>
  );
};
