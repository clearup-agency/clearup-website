import ar from './ar';
import en from './en';
export const dicts = { ar, en };
export type Lang = keyof typeof dicts;
export const LANGS: Lang[] = ['ar', 'en'];
export const WHATSAPP = 'https://wa.me/905824005288'; // ClearUp's content file (Nov 8, 2026)
export const INSTAGRAM = 'https://instagram.com/clearup.agency';
export const FOUNDER_IG = 'https://instagram.com/abd.ulmenem';

// Testimonial videos: 'local' plays /media/*.mp4 inline (default); 'instagram' opens the original reel
// (used for the light static preview).
export const VIDEO_MODE: 'local' | 'instagram' = process.env.NEXT_PUBLIC_VIDEO_MODE === 'instagram' ? 'instagram' : 'local';
export const IG_REELS: Record<string, string> = {
  'story-masahat': 'https://www.instagram.com/reel/Del5aadglDH/',
  'story-tobtarha': 'https://www.instagram.com/reel/DeblRPHNL4W/',
  'story-alnoon': 'https://www.instagram.com/reel/DfCdu7QuFKf/',
  'story-emmar': 'https://www.instagram.com/reel/DapStldMDFF/',
};
