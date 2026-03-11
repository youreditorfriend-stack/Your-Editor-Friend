
export interface Video {
  id: string;
  title: string;
  youtubeId: string;
  enabled: boolean;
}

export interface PortfolioCategory {
  id: string;
  name: string;
  enabled: boolean;
  videos: Video[];
}

export interface PricingStyle {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  videoUrl: string;
  enabled: boolean;
}

export interface PricingCategory {
  id: string;
  name: string;
  enabled: boolean;
  styles: PricingStyle[];
}

export const PORTFOLIO_DATA: PortfolioCategory[] = [
  {
    id: '1',
    name: 'Personal Branding',
    enabled: true,
    videos: [
      { id: 'pb1', title: 'Personal Brand Story', youtubeId: 'dQw4w9WgXcQ', enabled: true },
      { id: 'pb2', title: 'Executive Interview', youtubeId: 'dQw4w9WgXcQ', enabled: true },
      { id: 'pb3', title: 'Lifestyle Vlog', youtubeId: 'dQw4w9WgXcQ', enabled: true },
    ]
  },
  {
    id: '2',
    name: 'Real Estate',
    enabled: true,
    videos: [
      { id: 're1', title: 'Luxury Villa Tour', youtubeId: 'dQw4w9WgXcQ', enabled: true },
      { id: 're2', title: 'Modern Apartment Showcase', youtubeId: 'dQw4w9WgXcQ', enabled: true },
    ]
  },
  {
    id: '3',
    name: 'AI Advertisement',
    enabled: true,
    videos: [
      { id: 'ai1', title: 'Product Launch AI Ad', youtubeId: 'dQw4w9WgXcQ', enabled: true },
      { id: 'ai2', title: 'SaaS Explainer', youtubeId: 'dQw4w9WgXcQ', enabled: true },
    ]
  },
  {
    id: '4',
    name: 'Motion Graphics',
    enabled: true,
    videos: [
      { id: 'mg1', title: 'Dynamic Logo Animation', youtubeId: 'dQw4w9WgXcQ', enabled: true },
      { id: 'mg2', title: 'Infographic Video', youtubeId: 'dQw4w9WgXcQ', enabled: true },
    ]
  }
];

export const PRICING_DATA: PricingCategory[] = [
  {
    id: 'p1',
    name: 'Personal Branding',
    enabled: true,
    styles: [
      {
        id: 'style1',
        name: 'Style A - Cinematic Storytelling',
        description: 'High-end edits with color grading and sound design.',
        basePrice: 2500,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        enabled: true
      },
      {
        id: 'style2',
        name: 'Style B - Fast-Paced Viral',
        description: 'Dynamic cuts and captions for maximum engagement.',
        basePrice: 1500,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        enabled: true
      },
      {
        id: 'style1-c',
        name: 'Style C - Dynamic Captions',
        description: 'Engaging captions with custom text animations and emojis.',
        basePrice: 1800,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        enabled: true
      }
    ]
  },
  {
    id: 'p2',
    name: 'Real Estate',
    enabled: true,
    styles: [
      {
        id: 'style3',
        name: 'Professional Real Estate',
        description: 'Smooth transitions and elegant property showcases.',
        basePrice: 3000,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        enabled: true
      }
    ]
  },
  {
    id: 'p3',
    name: 'AI Advertisement',
    enabled: true,
    styles: [
      {
        id: 'style4',
        name: 'AI Product Ad',
        description: 'Futuristic visuals and high-conversion hooks.',
        basePrice: 2000,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        enabled: true
      }
    ]
  },
  {
    id: 'p4',
    name: 'Motion Graphics',
    enabled: true,
    styles: [
      {
        id: 'style5',
        name: '2D Animation',
        description: 'Clean and professional vector animations.',
        basePrice: 4000,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        enabled: true
      }
    ]
  }
];
