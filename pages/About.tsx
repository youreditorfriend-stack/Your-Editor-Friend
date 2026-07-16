import React from 'react';
import { motion } from 'framer-motion';
import { Youtube, Users, Video, ExternalLink } from 'lucide-react';
import { YOUTUBE, youtubeThumb, useYouTubeStats } from '../src/lib/site';

export const About: React.FC = () => {
  const yt = useYouTubeStats();

  return (
    <div className="px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="text-center py-8 md:py-24">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#E50914] font-bold mb-3">About</div>
          <h1 className="text-2xl md:text-5xl font-semibold tracking-tight mb-3 md:mb-4">Hi, I'm Janish Prabu 👋</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
            Founder of <span className="text-white">Your Editor Friend</span> — a YouTuber teaching video editing in Tamil,
            and a freelance editor helping brands and creators grow with cinematic, high-retention videos.
          </p>
        </div>

        {/* Channel stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16 max-w-3xl mx-auto">
          {[
            { icon: <Users size={20} />, value: yt.subscribers, label: 'Subscribers' },
            { icon: <Video size={20} />, value: yt.videoCount, label: 'Videos' },
            { icon: <Youtube size={20} />, value: 'Tamil', label: 'Editing Tutorials' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 text-center"
            >
              <div className="text-[#E50914] flex justify-center mb-3">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-zinc-500 text-xs uppercase tracking-widest mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Latest uploads — live playlist embed */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Youtube className="text-[#E50914]" /> Latest Videos
            </h2>
            <a
              href={YOUTUBE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
            >
              View channel <ExternalLink size={14} />
            </a>
          </div>

          {/* Auto-updating: embeds the channel's uploads playlist */}
          <div className="rounded-3xl overflow-hidden border border-white/5 aspect-video bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/videoseries?list=${YOUTUBE.uploadsPlaylistId}`}
              title="Your Editor Friend — Latest Videos"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Recent thumbnails */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {yt.latestVideoIds.map(id => (
              <a
                key={id}
                href={`https://www.youtube.com/watch?v=${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-black"
              >
                <img src={youtubeThumb(id)} alt="Video thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
              </a>
            ))}
          </div>
        </div>

        {/* Subscribe CTA */}
        <div className="text-center rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/80 to-[#1a0505] py-14 px-6">
          <img src={yt.avatar} alt="Channel avatar" referrerPolicy="no-referrer" className="w-20 h-20 rounded-full border-4 border-[#E50914]/30 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">Learn editing with me — free</h2>
          <p className="text-zinc-400 font-light mb-8 max-w-xl mx-auto">
            New Tamil editing tutorials every week. Join {yt.subscribers}+ creators leveling up their edits.
          </p>
          <a
            href={`${YOUTUBE.url}?sub_confirmation=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-red-700 text-white px-10 py-4 rounded-full text-base font-semibold transition-all transform hover:scale-105"
          >
            <Youtube size={20} /> Subscribe on YouTube
          </a>
        </div>
      </div>
    </div>
  );
};
