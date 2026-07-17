import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

// Simple expand/collapse list used on the item detail page.
// Only one row open at a time — keeps the page shorter and easier to scan.
export const FaqAccordion: React.FC<{ items: { q: string; a: string }[] }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(0);
  if (!items?.length) return null;

  return (
    <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-white/[0.03] transition-colors"
            >
              <span className="font-medium text-white pr-6">{item.q}</span>
              <ChevronDown
                size={18}
                className={`text-zinc-500 shrink-0 transition-transform ${isOpen ? "rotate-180 text-white" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
