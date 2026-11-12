import type { CaseView, PageCtx } from '@/lib/view';
import { testimonialCards } from '@/lib/testimonials';
import { otherClientCards } from '@/lib/tstories';
import { cdnImage } from '@/lib/cdn';
import { Arrow } from '../Mark';
import TestimonialCardItem, { tvLabels } from './TestimonialCard';

/** «قصص أخرى» at the bottom of a client page (Mohamed, Nov 9, 2026: «قصص أخرى» is CARDS — the story rings are only
 *  Home's «شغلنا من جوّا»). The other clients with a testimonial video show the very card of «عملاؤنا يحكون» (one
 *  component: TestimonialCard), in the admin's testimonials order; then every other client as a client card — its
 *  picture, name, one short line and its page — in the «العملاء» order. Phones: one row that scrolls sideways like
 *  the testimonials; laptops: a grid. In the admin every card opens that client's record. */
export function otherStories(c: CaseView, ctx: PageCtx) {
  const tcards = testimonialCards(ctx.cases, ctx.proof?.order).filter((x) => x.key !== c.key);
  const ccards = otherClientCards(ctx.cases, c.key, testimonialCards(ctx.cases).map((x) => x.key));
  return { tcards, ccards, count: tcards.length + ccards.length };
}

export default function OtherStories({ list, ctx, readLabel }: { list: ReturnType<typeof otherStories>; ctx: PageCtx; readLabel: string }) {
  const L = ctx.lang === 'en' ? 'en' : 'ar';
  const proof = ctx.proof ?? null;
  const t = tvLabels(proof, L);
  const { tcards, ccards } = list;
  if (!list.count) return null;
  const fid = typeof proof?._key === 'string' ? proof._key : undefined;
  return (
    <ul className="tvcards tvcards--more">
      {tcards.map((x) => <TestimonialCardItem key={x.key} c={x} t={t} lang={L} fid={fid} />)}
      {ccards.map((x) => {
        const body = (
          <>
            <span className="ccard__media">
              {x.poster
                ? <img src={x.poster} alt="" width={432} height={540} loading="lazy" decoding="async" />
                : x.logo?.src ? <img className="ccard__logo" src={cdnImage(x.logo.src, 240, true)} alt="" width={120} height={120} loading="lazy" decoding="async" />
                  : <b aria-hidden="true">{x.name.trim().charAt(0)}</b>}
            </span>
            <span className="tvcard__body">
              <span className="tvcard__who"><b>{x.name}</b>{x.sub && <span>{x.sub}</span>}</span>
              {x.short && <span className="tvcard__short">{x.short}</span>}
              {x.href && <span className="link tvcard__go" data-f="s:caseLabels.read">{readLabel}<Arrow /></span>}
            </span>
          </>
        );
        return (
          // the admin's preview: a click on the card's picture, name or line opens that client's record
          <li key={x.key} className="tvcard ccard" data-reveal data-rec-story={x.storyKey || x.key} data-rec-case={x.caseKey || x.key}>
            {x.href ? <a className="ccard__in" href={x.href} aria-label={x.name + ' — ' + readLabel}>{body}</a> : <div className="ccard__in">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
