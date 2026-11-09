import React from 'react';
import { Link } from 'react-router-dom';
import { REGULAR_PRICE, isFull, nextSlot, priceForSlot, type TitleCardOffer } from '../src/lib/titlecard';

// Title card launch offer card, shown under the home hero (admin → Edit orders → Settings).
export const HomeOfferCard: React.FC<{ offer: TitleCardOffer }> = ({ offer }) => {
  const full = isFull(offer);
  const price = priceForSlot(offer, nextSlot(offer));
  const left = Math.max(0, offer.total - offer.booked);
  return (
    <Link to="/titlecard" className="block text-left max-w-[560px] mx-auto mt-7 rounded-[18px] overflow-hidden border border-[#FF7A1A]/40 bg-gradient-to-b from-[#160d06] to-[#0f0f0f] relative">
      <span className="absolute left-2.5 top-2.5 z-10 bg-[#FF7A1A] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wide">{full ? 'SOLD OUT' : 'LAUNCH OFFER'}</span>
      <video src={offer.demoVideo} poster={offer.poster} autoPlay muted loop playsInline preload="metadata" className="w-full aspect-[2.4/1] object-cover block" />
      <div className="px-3.5 pt-3 pb-3.5">
        <h3 className="text-[17px] font-extrabold">Your name in this title card</h3>
        <p className="text-zinc-400 text-[12.5px] mt-0.5">Send your photo — I'll edit it for you. Project file included.</p>
        <div className="flex items-end justify-between gap-3 mt-2.5">
          <div>
            {price < REGULAR_PRICE && !full && <s className="block text-zinc-500 text-xs">₹{REGULAR_PRICE}</s>}
            <b className="text-[22px] font-extrabold text-[#FF7A1A]">₹{price}</b>
            {price < REGULAR_PRICE && !full && <span className="text-zinc-400 text-[11px] ml-1">launch price</span>}
          </div>
          <span className="bg-[#FF7A1A] text-black font-extrabold text-sm px-4 py-2.5 rounded-xl whitespace-nowrap">{full ? 'Join waitlist' : 'Book now'}</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#222] mt-3 overflow-hidden"><i className="block h-full bg-[#FF7A1A] rounded-full" style={{ width: `${Math.min(100, offer.booked / Math.max(1, offer.total) * 100)}%` }} /></div>
        <div className="flex justify-between text-[11.5px] text-zinc-400 mt-1.5">
          <span>{offer.booked}/{offer.total} slots booked</span>
          <span>{full ? `${offer.waitlist} on waiting list` : <>Only <b className="text-[#FF7A1A]">{left} left</b></>}</span>
        </div>
      </div>
    </Link>
  );
};
