import React from 'react';
import { Link } from 'react-router-dom';
import type { TitleCardOffer } from '../src/lib/titlecard';
import { EDIT_TIERS, PROJECT_FILE } from '../src/config/titlecardPricing';

// Title card offer card, shown under the home hero (admin → Edit orders → Settings).
// Prices come from src/config/titlecardPricing.ts.
export const HomeOfferCard: React.FC<{ offer: TitleCardOffer }> = ({ offer }) => {
  const edit = EDIT_TIERS[0];
  return (
    <Link to="/titlecard" className="block text-left max-w-[560px] mx-auto mt-7 rounded-[18px] overflow-hidden border border-[#FF7A1A]/40 bg-gradient-to-b from-[#160d06] to-[#0f0f0f] relative">
      <span className="absolute left-2.5 top-2.5 z-10 bg-[#FF7A1A] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wide">NEW</span>
      <video src={offer.demoVideo} poster={offer.poster} autoPlay muted loop playsInline preload="metadata" className="w-full aspect-[2.4/1] object-cover block" />
      <div className="px-3.5 pt-3 pb-3.5">
        <h3 className="text-[17px] font-extrabold">Your name in this title card</h3>
        <p className="text-zinc-400 text-[12.5px] mt-0.5">Edit it yourself for ₹{PROJECT_FILE.price} — or I edit it with your photo for ₹{edit.price}.</p>
        <div className="flex items-end justify-between gap-3 mt-2.5">
          <div>
            <span className="text-zinc-400 text-[11px] mr-1">from</span>
            <b className="text-[22px] font-extrabold text-[#FF7A1A]">₹{PROJECT_FILE.price}</b>
          </div>
          <span className="bg-[#FF7A1A] text-black font-extrabold text-sm px-4 py-2.5 rounded-xl whitespace-nowrap">See options</span>
        </div>
      </div>
    </Link>
  );
};
