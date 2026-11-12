import type { PageCtx, Raw } from '@/lib/view';
import { TestimonialStories } from '../ClientStories';
import { workClients, workStories } from '@/lib/tstories';

/** The clients as Instagram-style story rings (one avatar per client — every client with a project story, a
 *  testimonial or works, in the order of «العملاء» — tapping one plays that client's videos and works full-screen;
 *  every story links its client page). The same list + component show under «قصص أخرى» on each client page
 *  (CasePage). Since Nov 8, 2026 (Mohamed, second round) the Work page's own stories row is «من شغلنا» — the same
 *  works stories as Home — and this client row is switched off there in the admin; text-only cards (a programme
 *  with no picture or video, e.g. the women empowerment programme) are no longer listed. */
export default function WorkIndex({ s, ctx }: { s: Raw; ctx: PageCtx }) {
  const L = ctx.lang === 'en' ? 'en' : 'ar';
  const clients = workClients(ctx.cases);
  const stories = workStories(clients);
  return (
    <section className="work work--stories section section--tight" id="work">
      <div className="wrap">
        {stories.length
          ? <TestimonialStories clients={stories} lang={L} kind="work" />
          : <p className="work__empty">{s.empty}</p>}
      </div>
    </section>
  );
}
