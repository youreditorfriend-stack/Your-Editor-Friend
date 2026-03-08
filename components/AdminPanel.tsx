/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  LayoutDashboard, 
  Video, 
  Settings, 
  LogOut, 
  Eye, 
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe
} from 'lucide-react';
import { setFeaturedVideo, getFeaturedVideo } from '../firebase';

const STATIC_PORTFOLIO_DATA = {
  "portfolio": [
    {
      "id": "cat-1",
      "name": "Personal Branding",
      "enabled": true,
      "videos": [
        { "id": "1", "title": "Brands pay dhoni", "youtubeId": "KSoPrGLdUog", "enabled": true },
        { "id": "2", "title": "Ram music", "youtubeId": "Dratplxyl8s", "enabled": true },
        { "id": "3", "title": "AI ML DS", "youtubeId": "cg--ED8zNDk", "enabled": true }
      ]
    },
    {
      "id": "cat-2",
      "name": "AI Advertisement",
      "enabled": true,
      "videos": [
        { "id": "4", "title": "VARQ", "youtubeId": "YIe_WVTpSd8", "enabled": true },
        { "id": "5", "title": "Ueir organics", "youtubeId": "NgUHikVfDNs", "enabled": true },
        { "id": "6", "title": "Kamal Rajini recreation", "youtubeId": "hLh0h6Vj6w8", "enabled": true }
      ]
    },
    {
      "id": "cat-3",
      "name": "Real Estate",
      "enabled": true,
      "videos": [
        { "id": "7", "title": "Premium Property Edit", "youtubeId": "r-dFqVZqWww", "enabled": true },
        { "id": "8", "title": "Flashy home reveal", "youtubeId": "wk4ezLigQ0Y", "enabled": true },
        { "id": "9", "title": "Blast turf Reveal", "youtubeId": "oEoeevc1QNM", "enabled": true }
      ]
    },
    {
      "id": "cat-4",
      "name": "Motion Graphics",
      "enabled": true,
      "videos": [
        { "id": "10", "title": "Project postmortom", "youtubeId": "NGMXnfw2QSw", "enabled": true },
        { "id": "11", "title": "Redflagged", "youtubeId": "aPpVQ63XM7g", "enabled": true },
        { "id": "12", "title": "Ashoka Gold & DIamonds", "youtubeId": "HI50vxdp5es", "enabled": true },
        { "id": "13", "title": "Toxic talks", "youtubeId": "h3q9hsEPPzg", "enabled": true }
      ]
    }
  ]
};

export const AdminPanel: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [portfolio, setPortfolio] = useState(STATIC_PORTFOLIO_DATA.portfolio);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if user is already logged in (session storage)
    const token = sessionStorage.getItem('admin_token');
    if (token) setIsLoggedIn(true);

    // Load portfolio from localStorage if it exists
    const savedPortfolio = localStorage.getItem('portfolio_data');
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio));
    }

    // Fetch featured video from Firebase
    const fetchFeatured = async () => {
      try {
        const url = await getFeaturedVideo();
        if (url) setFeaturedVideoUrl(url);
      } catch (err) {
        console.error("Firebase fetch error:", err);
      }
    };
    fetchFeatured();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple client-side password check for static site
    if (password === 'admin123') {
      sessionStorage.setItem('admin_token', 'logged_in');
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsLoggedIn(false);
  };

  const toggleCategory = (catId: string) => {
    setPortfolio(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, enabled: !cat.enabled } : cat
    ));
  };

  const toggleVideo = (catId: string, vidId: string) => {
    setPortfolio(prev => prev.map(cat => 
      cat.id === catId ? {
        ...cat,
        videos: cat.videos.map(vid => 
          vid.id === vidId ? { ...vid, enabled: !vid.enabled } : vid
        )
      } : cat
    ));
  };

  const saveChanges = () => {
    setSaveStatus('saving');
    // Save to localStorage for the current browser
    localStorage.setItem('portfolio_data', JSON.stringify(portfolio));
    
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const handleSaveFirebaseVideo = async () => {
    if (!featuredVideoUrl.trim()) return;
    setFirebaseStatus('saving');
    try {
      await setFeaturedVideo(featuredVideoUrl);
      setFirebaseStatus('success');
      setTimeout(() => setFirebaseStatus('idle'), 2000);
    } catch (err) {
      console.error("Firebase save error:", err);
      setFirebaseStatus('error');
      setTimeout(() => setFirebaseStatus('idle'), 3000);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#E50914]/10 flex items-center justify-center text-[#E50914] mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-zinc-500 text-sm">Enter password to manage your site</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#E50914] outline-none transition-all"
              />
              {error && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-[#E50914] hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all active:scale-95"
            >
              Login
            </button>
          </form>
          
          <p className="mt-8 text-center text-zinc-600 text-[10px] uppercase tracking-widest">
            Static Site Mode &middot; Browser Persistence
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-zinc-950 border-r border-white/5 p-6 hidden md:block">
        <div className="mb-12">
          <span className="font-bold text-sm tracking-tighter text-[#E50914]">EDITOR FRIEND ADMIN</span>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'portfolio' ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Video size={18} /> Portfolio
          </button>
          <button 
            onClick={() => setActiveTab('firebase')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'firebase' ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Globe size={18} /> Featured Video
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 p-6 md:p-12">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'portfolio' && (
            <>
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Manage Portfolio</h1>
                  <p className="text-zinc-500 text-sm">Toggle visibility of your categories and videos.</p>
                </div>
                <button 
                  onClick={saveChanges}
                  disabled={saveStatus !== 'idle'}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all active:scale-95 ${saveStatus === 'success' ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                >
                  {saveStatus === 'idle' && <><Save size={18} /> Save Changes</>}
                  {saveStatus === 'saving' && <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
                  {saveStatus === 'success' && <><CheckCircle2 size={18} /> Saved!</>}
                </button>
              </header>

              <div className="space-y-8">
                {portfolio.map((cat) => (
                  <div key={cat.id} className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
                    <div className="p-6 bg-zinc-900 border-b border-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.enabled ? 'bg-[#E50914]/10 text-[#E50914]' : 'bg-zinc-800 text-zinc-600'}`}>
                          <LayoutDashboard size={20} />
                        </div>
                        <h2 className={`text-xl font-bold ${!cat.enabled && 'text-zinc-600'}`}>{cat.name}</h2>
                      </div>
                      <button 
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-2 rounded-lg transition-all ${cat.enabled ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-600 hover:bg-white/5'}`}
                      >
                        {cat.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cat.videos.map((vid) => (
                        <div key={vid.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${vid.enabled ? 'bg-black/40 border-white/10' : 'bg-zinc-950/50 border-transparent opacity-50'}`}>
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-16 h-10 bg-zinc-800 rounded-md overflow-hidden shrink-0">
                              <img 
                                src={`https://img.youtube.com/vi/${vid.youtubeId}/default.jpg`} 
                                className="w-full h-full object-cover"
                                alt=""
                              />
                            </div>
                            <span className="font-medium text-sm truncate">{vid.title}</span>
                          </div>
                          <button 
                            onClick={() => toggleVideo(cat.id, vid.id)}
                            className={`p-2 rounded-lg transition-all ${vid.enabled ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-600 hover:bg-white/5'}`}
                          >
                            {vid.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'firebase' && (
            <div className="max-w-2xl">
              <header className="mb-12">
                <h1 className="text-3xl font-bold mb-2">Featured Video</h1>
                <p className="text-zinc-500 text-sm">Update the main video on your homepage using Firebase Firestore.</p>
              </header>

              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">YouTube Embed Link</label>
                  <input 
                    id="videoLink"
                    type="text" 
                    value={featuredVideoUrl}
                    onChange={(e) => setFeaturedVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#E50914] outline-none transition-all"
                  />
                  <p className="text-[10px] text-zinc-600">Example: https://www.youtube.com/embed/dQw4w9WgXcQ</p>
                </div>

                <button 
                  id="saveBtn"
                  onClick={handleSaveFirebaseVideo}
                  disabled={firebaseStatus !== 'idle'}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all active:scale-95 ${
                    firebaseStatus === 'success' ? 'bg-green-500 text-white' : 
                    firebaseStatus === 'error' ? 'bg-red-500 text-white' :
                    'bg-[#E50914] text-white hover:bg-red-700'
                  }`}
                >
                  {firebaseStatus === 'idle' && <><Save size={18} /> Save Video to Firebase</>}
                  {firebaseStatus === 'saving' && <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  {firebaseStatus === 'success' && <><CheckCircle2 size={18} /> Saved Successfully!</>}
                  {firebaseStatus === 'error' && <><AlertCircle size={18} /> Error Saving</>}
                </button>
              </div>

              {featuredVideoUrl && (
                <div className="mt-8">
                  <p className="text-sm font-medium text-zinc-400 mb-4">Preview</p>
                  <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                    <iframe 
                      src={featuredVideoUrl}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-12 p-8 rounded-3xl bg-blue-500/5 border border-blue-500/20 text-blue-400 text-sm leading-relaxed">
            <div className="flex gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <p className="font-bold mb-1">Static Site Notice</p>
                <p>Since this is a static site without a backend, changes saved here are stored in your **browser's local storage**. They will be visible to you on this device, but to make permanent changes for all users, you must update the `STATIC_PORTFOLIO_DATA` in the source code.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
