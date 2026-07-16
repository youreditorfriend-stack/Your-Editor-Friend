import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { services, ServiceItem } from '../src/data/services';

const rowClass =
  'group flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all';

const RowContent: React.FC<{ s: ServiceItem; linked: boolean }> = ({ s, linked }) => (
  <>
    <span className={`${s.color} shrink-0`}>{s.icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm md:text-base font-medium text-white leading-tight">{s.title}</span>
      <span className="block text-[11px] md:text-xs text-zinc-500 font-light truncate">{s.desc}</span>
    </span>
    {linked && (
      <ArrowRight size={15} className="text-zinc-600 group-hover:text-[#E50914] group-hover:translate-x-0.5 transition-all shrink-0" />
    )}
  </>
);

// Compact, readable list of services — one row per service.
// `to` makes each row a link (used on the home page to jump to /services).
export const ServiceList: React.FC<{ to?: string }> = ({ to }) => (
  <div className="grid sm:grid-cols-2 gap-2.5 md:gap-3 max-w-3xl mx-auto">
    {services.map((s, i) => (
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: i * 0.05 }}
      >
        {to ? (
          <Link to={to} className={rowClass}>
            <RowContent s={s} linked />
          </Link>
        ) : (
          <div className={rowClass}>
            <RowContent s={s} linked={false} />
          </div>
        )}
      </motion.div>
    ))}
  </div>
);
