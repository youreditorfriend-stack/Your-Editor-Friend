import React from 'react';
import { motion } from 'framer-motion';
import { Download, ExternalLink, Library as LibraryIcon, Lock, MessageCircle, Play, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/lib/auth';
import { useStore } from '../src/lib/store';
import { getWhatsAppLink } from '../src/lib/site';

export const Library: React.FC = () => {
  const { user, profile, signIn } = useAuth();
  const { store } = useStore();

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
