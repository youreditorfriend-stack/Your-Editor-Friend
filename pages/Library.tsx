import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ExternalLink, Library as LibraryIcon, Lock, MessageCircle, Play, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/lib/auth';
import { useStore } from '../src/lib/store';
import { getWhatsAppLink } from '../src/lib/site';
import { db } from '../src/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const Library: React.FC = () => {
  const { user, profile, signIn } = useAuth();
  const { store } = useStore();

  // License lookup states
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const q = query(collection(db, "users"), where("email", "==", lookupEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setLookupError("No registered user found for this email address.");
      } else {
        const uDoc = snap.docs[0];
        const uData = uDoc.data();
        const activePurchases = uData.purchases || [];
        
        // Match with store items
        const licensedProducts = (store?.products || []).filter(p => activePurchases.includes(p.id));
        const licensedCourses = (store?.courses || []).filter(c => activePurchases.includes(c.id));
        
        setLookupResult({
          name: uData.name || "Student",
          email: uData.email,
          photo: uData.photo || uData.photoURL || "",
          products: licensedProducts,
          courses: licensedCourses,
        });
      }
    } catch (err) {
      console.error(err);
      setLookupError("Failed to verify license. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="px-6 pb-24">
        <div className="max-w-md mx-auto text-center py-24">
          <div className="w-20 h-20 rounded-full bg-[#E50914]/10 border border-[#E50914]/20 flex items-center justify-center mx-auto mb-8">
            <Lock size={32} className="text-[#E50914]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-4">Login to see your library</h1>
          <p className="text-zinc-500 font-light mb-8">Your purchased products &amp; courses live here — view and download anytime.</p>
          <button
            onClick={() => signIn().catch(() => {})}
            className="bg-[#E50914] hover:bg-red-700 text-white px-10 py-4 rounded-full text-base font-semibold transition-all"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  const purchases = profile?.purchases || [];
  const ownedProducts = (store?.products || []).filter(p => purchases.includes(p.id));
  const ownedCourses = (store?.courses || []).filter(c => purchases.includes(c.id));
  const empty = ownedProducts.length === 0 && ownedCourses.length === 0;

  return (
    <div className="px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8 md:py-20">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3 flex items-center justify-center gap-2">
            <LibraryIcon size={13} /> My Library
          </div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">
            Welcome, {profile?.name?.split(' ')[0] || 'friend'} 👋
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light">
            Everything you own — view anytime, download anytime.
          </p>
        </div>

        {/* User License verification / Lookup section */}
        <div className="max-w-xl mx-auto mb-16 bg-zinc-950/40 border border-white/5 rounded-3xl p-6 md:p-8">
          <h2 className="text-sm md:text-base font-bold mb-1 text-white text-center">Verify License &amp; Purchases</h2>
          <p className="text-zinc-500 text-[11px] text-center font-light mb-6">
            Enter any registered Google account email ID to query active product and course licenses instantly.
          </p>
          <form onSubmit={handleLookup} className="flex gap-2.5">
            <input
              type="email"
              required
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="e.g. customer@gmail.com"
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E50914] transition-all"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {lookupLoading ? "Verifying..." : "Search"}
            </button>
          </form>

          {lookupError && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-xs text-center">
              ⚠️ {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="mt-6 border-t border-white/5 pt-5 space-y-4">
              <div className="flex items-center gap-3">
                {lookupResult.photo ? (
                  <img src={lookupResult.photo} alt="" className="w-9 h-9 rounded-full border border-white/15" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-xs">👤</div>
                )}
                <div>
                  <div className="font-semibold text-white text-xs">{lookupResult.name}</div>
                  <div className="text-zinc-500 text-[11px]">{lookupResult.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Active Licenses</div>
                
                {lookupResult.products.length === 0 && lookupResult.courses.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic">No active products or course licenses.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {lookupResult.products.map((p: any) => (
                      <span key={p.id} className="bg-emerald-500/10 border border-emerald-500/15 text-[#25D366] text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                        📦 {p.name}
                      </span>
                    ))}
                    {lookupResult.courses.map((c: any) => (
                      <span key={c.id} className="bg-amber-500/10 border border-amber-500/15 text-amber-400 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                        🎓 {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {empty ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl">
            <p className="text-zinc-500 mb-6">Your library is empty. Purchases appear here right after they're confirmed.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/products" className="inline-flex items-center justify-center gap-2 bg-[#E50914] hover:bg-red-700 text-white px-8 py-3 rounded-full text-sm font-semibold transition-all">
                <ShoppingBag size={16} /> Browse Products
              </Link>
              <Link to="/courses" className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-3 rounded-full text-sm font-semibold transition-all">
                <Play size={16} /> Browse Courses
              </Link>
            </div>
          </div>
        ) : (
          <>
            {ownedCourses.length > 0 && (
              <div className="mb-16">
                <h2 className="text-xl md:text-2xl font-semibold mb-8">My Courses</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {ownedCourses.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden flex flex-col sm:flex-row"
                    >
                      <img src={c.thumbnail} alt={c.title} className="sm:w-56 aspect-video object-contain bg-zinc-950/60" />
                      <div className="p-6 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                          <p className="text-zinc-500 text-xs font-light">{c.tagline}</p>
                        </div>
                        {c.accessUrl ? (
                          <a
                            href={c.accessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center justify-center gap-2 bg-[#E50914] hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                          >
                            <Play size={15} /> Watch Course
                          </a>
                        ) : (
                          <a
                            href={getWhatsAppLink(`Hi Janish! I purchased "${c.title}" — please share the course access link. My email: ${user.email}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                          >
                            <MessageCircle size={15} /> Get Access Link
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {ownedProducts.length > 0 && (
              <div>
                <h2 className="text-xl md:text-2xl font-semibold mb-8">My Products</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {ownedProducts.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden flex flex-col"
                    >
                      <img src={p.image} alt={p.name} className="aspect-square object-contain bg-zinc-950/60" />
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-semibold text-sm mb-3 flex-1">{p.name}</h3>
                        {p.downloadUrl ? (
                          <a
                            href={p.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-green-400 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                          >
                            <Download size={15} /> Download
                          </a>
                        ) : (
                          <a
                            href={getWhatsAppLink(`Hi Janish! I own "${p.name}" — please share the download link. My email: ${user.email}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                          >
                            <ExternalLink size={14} /> Get Link
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
