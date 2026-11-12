import type { PageCtx, Raw } from '@/lib/view';
import { Arrow } from '../Mark';
import SectionHead from '../SectionHead';
import TestimonialCardItem, { tvLabels } from './TestimonialCard';
import TestimonialRail from './TestimonialRail';
import { homeCards, testimonialCards } from '@/lib/testimonials';
export { testimonialCards };

/** «آراء العملاء» (Nov 8, 2026 — Mohamed + Munim: testimonials leave the stories row for their own section): per
 *  client the video, the name and ONE short line (the full text no longer sits under the video — Mohamed, Nov 8);
 *  «القصة كاملة» opens the challenge, what we did and the result in a panel. The same component and the same data
 *  (the «العملاء» records) on Home and on «أعمالنا».
 *  Nov 9, 2026 (Mohamed: on a phone the card filled the whole screen): the name, role, short line and «القصة كاملة»
 *  sit as an overlay on the bottom of the video (.tvcard__body over .tvcard__vid, styles in globals.css), so the
 *  card is the video's size only. */
export default function Proof({ s, ctx }: { s: Raw; ctx: PageCtx }) {
  const L = ctx.lang === 'en' ? 'en' : 'ar';
  // the labels are fields of this section since Nov 9, 2026 (admin: everything editable); empty = the defaults
  const t = tvLabels(s, L);
  // Nov 9, 2026 (Mohamed: more videos over time): one order for all (dragged in the admin); Home shows the ones
  // switched on «يظهر بالرئيسية», up to «عدد الفيديوهات بالرئيسية»; «أعمالنا» (any other page) shows them all
  const all = testimonialCards(ctx.cases, s.order);
  const home = ctx.page === 'home';
  const cards = home ? homeCards(all, s) : all;
  const more = home && all.length > cards.length && cards.length > 0;
  if (!cards.length && !ctx.preview) return null;
  return (
    <section className="proof proof--cards section" id="testimonials">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        {cards.length ? (
          // Nov 11, 2026 (Mohamed): fixed-size cards in one sideways row (4 on a laptop, 3 on a tablet), arrows / swipe
          <TestimonialRail prev={t.prev} next={t.next}>
            {cards.map((c) => <TestimonialCardItem key={c.key} c={c} t={t} lang={L} />)}
          </TestimonialRail>
        ) : <p className="ph-admin">{home && all.length ? t.noneHome : t.none}</p>}
        {more && <p className="proof__more"><a href={ctx.links.work + '#testimonials'}>{s.allTestimonials || t.more}<Arrow /></a></p>}
        {s.all && <p className="proof__all" data-reveal><a className="btn btn--ghost" href={ctx.links.work}>{s.all}<Arrow /></a></p>}
      </div>
    </section>
  );
}
