import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Instagram, Mail, MessageCircle, Youtube } from 'lucide-react';
import { useProjectModal } from '../components/Layout';
import { EMAIL, WHATSAPP_LINK, WHATSAPP_DISPLAY, INSTAGRAM_URL, YOUTUBE } from '../src/lib/site';

export const Contact: React.FC = () => {
  const { openProjectModal } = useProjectModal();

  const channels = [
    {
      icon: <MessageCircle size={24} fill="currentColor" />,
      color: 'text-[#25D366]',
      title: 'WhatsApp',
      detail: WHATSAPP_DISPLAY,
      sub: 'Fastest reply — usually within a few hours',
      href: WHATSAPP_LINK,
    },
    {
      icon: <Mail size={24} />,
      color: 'text-[#E50914]',
      title: 'Email',
      detail: EMAIL,
      sub: 'For detailed briefs and collaborations',
      href: `mailto:${EMAIL}`,
    },
    {
      icon: <Instagram size={24} />,
      color: 'text-pink-500',
      title: 'Instagram',
      detail: '@iamyoureditorfriend',
      sub: 'DM me your reels & references',
      href: INSTAGRAM_URL,
    },
    {
      icon: <Youtube size={24} />,
      color: 'text-[#E50914]',
      title: 'YouTube',
      detail: YOUTUBE.handle,
      sub: 'Comment on any video — I read them all',
      href: YOUTUBE.url,
    },
  ];

  return (
    <div className="px-6 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="text-center py-8 md:py-24">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3">Contact</div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">Ready to level up your content?</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light">
            Project idea, product doubt, or collab — pick whichever channel works for you.
          </p>
        </div>

        {/* Contact channels */}
        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {channels.map((c, i) => (
            <motion.a
              key={c.title}
              href={c.href}
              target={c.href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-3xl border border-white/5 bg-zinc-900/50 p-8 hover:border-white/15 transition-all"
            >
              <div className={`${c.color} mb-5`}>{c.icon}</div>
              <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
              <div className="text-zinc-300 text-sm mb-2">{c.detail}</div>
              <p className="text-zinc-600 text-xs font-light">{c.sub}</p>
            </motion.a>
          ))}
        </div>

        {/* Start project CTA */}
        <div className="text-center rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/80 to-[#1a0505] py-14 px-6">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight mb-4">Start your project today</h2>
          <p className="text-zinc-400 font-light mb-8 max-w-xl mx-auto">
            Answer 3 quick questions and your brief lands straight on my WhatsApp.
          </p>
          <button
            onClick={openProjectModal}
            className="bg-[#E50914] hover:bg-red-700 text-white px-10 md:px-12 py-4 md:py-5 rounded-full text-lg font-bold inline-flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-red-900/20"
          >
            Start Your Project <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
