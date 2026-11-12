import type ar from '@/content/ar';
import type { Img } from './view';

/** What every component receives: the copy for one section (same shape as src/content/ar.ts)
 *  plus the site-wide links/settings coming from the CMS. */
export type SiteLinks = {
  brandName: string;
  logo: Img | null;
  heroLogo?: { front?: string; back?: string; arrow?: string; image?: Img | null } | null;
  whatsapp: string;
  instagram: string;
  socials: { label: string; url: string }[];
  email: string;
};
type Base = typeof ar;
type Media = { poster?: Img | null; video?: string | null; videoUrl?: string };
export type Dict = Omit<Base, 'hero' | 'stories' | 'founder' | 'results' | 'nav'> & {
  site: SiteLinks;
  showConcept?: boolean;
  /** the admin's live preview (placeholders, source tags and hidden sections are shown, striped) */
  preview?: boolean;
  nav: Omit<Base['nav'], 'links'> & { ctaHref?: string; links: { href: string; label: string; page?: string | null }[]; home?: string; current?: string };
  /** internal URLs of the multi-page site (book = the main button's target, the Contact page) */
  links?: Record<string, string>;
  hero: Base['hero'] & { clip: Base['hero']['clip'] & Media & { posterAt?: number | null }; canvas?: { image?: Img | null }[] };
  stories: Omit<Base['stories'], 'items'> & { items: (Omit<Base['stories']['items'][number], 'file'> & Media & { _key?: string })[] };
  founder: Base['founder'] & { photo?: Img | null; photoCaption?: string; igHandle?: string };
  results: Omit<Base['results'], 'cases'> & {
    cases: (Omit<Base['results']['cases'][number], 'video'> & { _key?: string; style?: 'dashboard' | 'numbers' | 'video'; image?: Img | null; note?: string })[];
    dash?: { title?: string; curve?: string; from?: string; to?: string };
  };
};
