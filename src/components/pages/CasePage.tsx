import type { Dict } from '@/lib/dict';
import type { CaseView, PageCtx } from '@/lib/view';
import { filled, isPlaceholder } from '@/lib/pages';
import { cdnImage, fileUrl } from '@/lib/cdn';
import { Ph } from './Ph';
import VideoPlayer from '../VideoPlayer';
import { StoryGrid } from '../ClientStories';
import OtherStories, { otherStories } from './OtherStories';
import { sameMedia, numDir } from '@/lib/rules';

/** /<lang>/work/<slug>/ — one client's page: the challenge → the solution → the result, the numbers, all the
 *  works (the same story viewer), and what the client said (quote + video). Every part is optional: an empty or
 *  [placeholder] part is left out for visitors, so a client with works only gets a clean works page. */
export default function CasePage({ c, ctx, d, labels }: { c: CaseView; ctx: PageCtx; d: Dict; labels: Record<string, string> }) {
  const x = c.data;
  const pv = ctx.preview;
  const lang = ctx.lang;
  const L = lang === 'en' ? 'en' : 'ar';
  const metrics = (x.metrics ?? []).filter((m: any) => pv || (filled(m?.v) && filled(m?.l)));
  const did: string[] = (x.did ?? []).filter((t: string) => pv || filled(t));
  const videos = (x.videos ?? []).filter((v: any) => typeof v?.url === 'string' && v.url && !sameMedia({ src: v.url }, x.tvideo));
  const t = x.testimonial ?? {};
  const works = (x.works ?? []) as any[];
  // «قصص أخرى»: the other clients as cards (Mohamed, Nov 9, 2026 — not story rings): the testimonial clients as the
  // «عملاؤنا يحكون» card, the rest as client cards (OtherStories)
  const others = otherStories(c, ctx);
  // a cover that is the testimonial video itself (or its poster) is dropped: the same video never shows twice
  const cover = x.cover?.src && !sameMedia(x.cover, x.tvideo) ? x.cover : null;
  // the client speaking: in the header when there is no cover, else beside the quote
  const videoTop = !cover && x.tvideo;
  const blocks = [
    { k: 'problem', label: labels.problem, body: <Ph v={x.problem} preview={pv} as="p" />, has: pv || filled(x.problem) },
    { k: 'did', label: labels.did, body: <>{filled(x.solution) && <p className="cs__sol">{x.solution}</p>}{did.length > 0 && <ul className="cs__did">{did.map((s, i) => <Ph key={i} v={s} preview={pv} as="li" />)}</ul>}</>, has: filled(x.solution) || did.length > 0 },
    { k: 'result', label: labels.result, body: <Ph v={x.result} preview={pv} as="p" />, has: pv || filled(x.result) },
  ].filter((b) => b.has);
  const hasQuote = filled(t.quote);
  const who = (filled(t.name) || filled(t.role)) ? <><b>{filled(t.name) ? t.name : ''}</b>{filled(t.role) && <span>{t.role}</span>}</> : null;
  const media = cover
    ? <img className="cs__cover" src={cdnImage(cover.src, 720)} srcSet={cdnImage(cover.src, 360) !== cdnImage(cover.src, 720) ? [360, 540, 720].map((w) => `${cdnImage(cover.src, w)} ${w}w`).join(', ') : undefined}
        sizes="(max-width: 1080px) 300px, 360px" alt="" width={cover.width ?? 432} height={cover.height ?? 768} fetchPriority="high" />
    : videoTop ? <VideoPlayer item={x.tvideo} name={x.client} lang={L} label={labels.watch} labelField="s:caseLabels.watch" className="vf--big"
        priority={{ sizes: '(max-width: 1080px) 300px, 360px' }} />
    : null;
  return (
    <article className="cs" data-case={c.slug}>
      <header className="cs__head section section--tight">
        <div className={'wrap cs__grid' + (media ? '' : ' cs__grid--solo')}>
          <div className="cs__copy">
            <p className="kicker" data-f="s:caseLabels.kicker">
              {x.logo?.src ? <img className="cs__logo" src={cdnImage(x.logo.src, 96, true)} alt="" width={36} height={36} /> : <span className="sq" aria-hidden="true" />}
              {labels.kicker}
            </p>
            <h1 className="cs__t">{x.client}</h1>
            <p className="cs__meta">
              <Ph v={x.industry} preview={pv} className="chip" />
              <Ph v={x.period} preview={pv} className="chip" />
            </p>
            <Ph v={x.summary} preview={pv} as="p" className="cs__sum" />
            {metrics.length > 0 && (
              <div className="cs__res">
                <h2 className="cs__reslabel" data-f="s:caseLabels.numbers">{labels.numbers}</h2>
                <dl className="cs__nums">
                  {metrics.map((m: any, i: number) => (
                    <div key={i} className={isPlaceholder(m.v) || isPlaceholder(m.l) ? 'ph-admin' : ''}>
                      <dt>{m.l}</dt><dd className="num" dir={numDir(m.v)}>{m.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
          {media && (
            <div className="cs__media">
              {media}
              {videoTop && !hasQuote && who && <p className="cs__who">{who}</p>}
            </div>
          )}
        </div>
      </header>

      {blocks.length > 0 && (
        <section className="cs__story section section--tight">
          <div className="wrap">
            <ol className={'cs__steps cs__steps--' + blocks.length}>
              {blocks.map((b) => (
                <li key={b.k} data-reveal>
                  <h2 className="cs__h" data-f={'s:caseLabels.' + b.k}>{b.label}</h2>
                  {b.body}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {works.length > 0 && (
        <section className="cs__works section section--tight">
          <div className="wrap">
            <h2 className="cs__h" data-f="s:caseLabels.works">{labels.works}</h2>
            <StoryGrid client={{ _key: x.storyKey, name: x.client, logo: x.logo, items: works }} lang={lang} label={labels.works} />
          </div>
        </section>
      )}

      {(hasQuote || (x.tvideo && !videoTop) || (pv && !x.tvideo)) && (
        <section className="cs__quote section section--tight">
          <div className={'wrap cs__qgrid' + (x.tvideo && !videoTop ? '' : ' cs__qgrid--solo')}>
            <figure data-reveal>
              <p className="cs__qlabel" data-f="s:caseLabels.testimonial">{labels.testimonial}</p>
              {hasQuote ? <blockquote>{t.quote}</blockquote> : pv ? <Ph v={t.quote} preview={pv} as="blockquote" /> : null}
              {who && <figcaption>{who}</figcaption>}
            </figure>
            {x.tvideo && !videoTop && <div className="cs__qvid"><VideoPlayer item={x.tvideo} name={x.client} lang={L} label={labels.watch} labelField="s:caseLabels.watch" /></div>}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="cs__vids section section--tight">
          <div className="wrap">
            <h2 className="cs__h" data-f="s:caseLabels.videos">{labels.videos}</h2>
            <div className="cs__vgrid">{videos.map((v: any, i: number) => <VideoPlayer key={i} item={{ video: fileUrl(v.file) || null, link: v.url, image: v.poster?.src ? v.poster : null }} name={v.title || x.client} lang={L} label={labels.watch} posterFirst />)}</div>
          </div>
        </section>
      )}

      {others.count > 0 && (
        <section className="cs__more section section--tight">
          <div className="wrap">
            <h2 className="cs__h" data-f="s:caseLabels.more">{labels.more}</h2>
            <OtherStories list={others} ctx={ctx} readLabel={labels.read} />
            <p className="proof__all"><a className="link" href={d.links?.work} data-f="s:caseLabels.all">{labels.all}</a></p>
          </div>
        </section>
      )}
    </article>
  );
}
