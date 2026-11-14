import type { TestimonialCard } from '@/lib/testimonials';
import type { Raw } from '@/lib/view';
import VideoPlayer from '../VideoPlayer';
import StoryMore from '../StoryMore';

export const TV_LABELS = {
  ar: { challenge: 'التحدي', solution: 'الحل', result: 'النتيجة', full: 'القصة كاملة', page: 'صفحة العميل', close: 'إغلاق', more: 'شوف كل الآراء', prev: 'الفيديوهات السابقة', next: 'الفيديوهات التالية', none: 'لا توجد آراء بعد — أضف لأي عميل فيديو «رأي العميل» وجملة قصيرة من «العملاء».', noneHome: 'ولا فيديو مفعّل للرئيسية — فعّل «يظهر بالرئيسية» لفيديو من إعدادات هذا القسم.' },
  en: { challenge: 'The challenge', solution: 'What we did', result: 'The result', full: 'The full story', page: 'Client page', close: 'Close', more: 'See all testimonials', prev: 'Previous videos', next: 'Next videos', none: 'No testimonials yet.', noneHome: 'No video is switched on for Home.' },
};
export type TvLabels = (typeof TV_LABELS)['ar'];

/** The card's words: the «عملاؤنا يحكون» section's own fields (admin), else the words above. */
export function tvLabels(s: Raw | null | undefined, lang: 'ar' | 'en'): TvLabels {
  const t0 = TV_LABELS[lang];
  const lb = (k: string, d: string) => (typeof s?.[k] === 'string' && s[k].trim() ? s[k] : d);
  return { ...t0, full: lb('fullStory', t0.full), challenge: lb('lblChallenge', t0.challenge), solution: lb('lblSolution', t0.solution), result: lb('lblResult', t0.result), page: lb('lblPage', t0.page), close: lb('lblClose', t0.close) };
}

/** One testimonial video card — the ONE component «عملاؤنا يحكون» (Home + «أعمالنا») and «قصص أخرى» on each
 *  client page use (Nov 9, 2026 — Mohamed: the other clients show as these cards, not story rings). The video is the
 *  card; name, role, short line and «القصة كاملة» sit on it (styles .tvcard* in globals.css). `fid` = the section
 *  whose «القصة كاملة» label this is, when the card sits outside it (the admin's click-to-edit). */
export default function TestimonialCardItem({ c, t, lang, fid }: { c: TestimonialCard; t: TvLabels; lang: 'ar' | 'en'; fid?: string }) {
  const who = [c.person, c.role].filter(Boolean).join(' · ');
  const parts = [
    c.challenge && { h: t.challenge, p: c.challenge },
    c.solution && { h: t.solution, p: c.solution, sol: true },
    c.result && c.result !== c.short && { h: t.result, p: c.result },
  ].filter(Boolean) as { h: string; p: string; sol?: boolean }[];
  return (
    // the admin's preview: a click on the card's name, person, line or video opens that client's record
    <li className="tvcard" data-reveal data-rec-story={c.storyKey || undefined} data-rec-case={c.caseKey || undefined}>
      <VideoPlayer item={c.video as never} name={c.client} lang={lang} label={(lang === 'ar' ? 'شاهد: ' : 'Watch: ') + (c.person || c.client)} close={t.close} className="tvcard__vid" posterSize={[432, 540]} modal />
      <div className="tvcard__body">
        <p className="tvcard__who"><b>{c.client}</b>{who && <span data-rf="testimonial.name">{who}</span>}</p>
        {c.short && <p className="tvcard__short">{c.short}</p>}
        <StoryMore label={t.full} labelField="fullStory" labelFid={fid} close={t.close} client={c.client} who={who} parts={parts}
          page={c.href ? { href: c.href, label: t.page } : null} />
      </div>
    </li>
  );
}
