import React from 'react';
import { Building2, Clapperboard, Layers, Smartphone, Type } from 'lucide-react';

export interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string; // icon accent
}

export const services: ServiceItem[] = [
  {
    id: 'short-form-ai-ads',
    title: 'Short Form AI Ads',
    desc: 'Reels & shorts that stop the scroll',
    icon: <Smartphone size={18} strokeWidth={1.8} />,
    color: 'text-red-400',
  },
  {
    id: 'real-estate-ads',
    title: 'Real Estate Ads',
    desc: 'Property tours that sell',
    icon: <Building2 size={18} strokeWidth={1.8} />,
    color: 'text-blue-400',
  },
  {
    id: 'commercial-ads',
    title: 'Commercial Ads',
    desc: 'Brand films with a story',
    icon: <Clapperboard size={18} strokeWidth={1.8} />,
    color: 'text-green-400',
  },
  {
    id: 'title-cards',
    title: 'Title Cards',
    desc: 'Intros & titles with impact',
    icon: <Type size={18} strokeWidth={1.8} />,
    color: 'text-amber-400',
  },
  {
    id: 'motion-graphics',
    title: 'Motion Graphics',
    desc: 'Animated text & elements',
    icon: <Layers size={18} strokeWidth={1.8} />,
    color: 'text-purple-400',
  },
];
