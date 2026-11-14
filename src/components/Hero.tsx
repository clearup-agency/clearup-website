import type { Dict } from '@/lib/dict';
import type { Img } from '@/lib/view';
import { cdnImage } from '@/lib/cdn';
import { Arrow } from './Mark';
import ClipCard from './ClipCard';
import SrcTag from './SrcTag';
import { waWithText, numDir } from '@/lib/rules';

/* Hero v5 — «dark & calm» (Nov 11, 2026; Mohamed picked option A of three): a landing hero — the text on one side,
   Abdalmenem's intro video as a tall 9:16 card on the other (it took the animated logo's place). Behind both, the 9
   blocks of the Business Model Canvas as photos, grayscale and blurred under a near-black layer, with thin outlines
   of the blocks showing only around the edges; a soft purple glow sits behind the video. One accent (lavender).
   The hero is always dark, whatever colour the admin gives the section. The video is the site's one video
   component (ClipCard → VideoPlayer). The top bar stays white over it (Mohamed, Nov 11). The placeholder photos are
   ClearUp's own (their Drive folder, Nov 11, 2026). */

/** The 9 Business Model Canvas blocks, in canvas order. Each one's photo comes from the admin (hero → «خلفية
 *  الواجهة»: one row per block, same order); a block without its own photo shows the placeholder. */
export const CANVAS = [
  { area: 'kp', key: 'partners' },
  { area: 'ka', key: 'activities' },
  { area: 'kr', key: 'resources' },
  { area: 'vp', key: 'value' },
  { area: 'cr', key: 'relationships' },
  { area: 'ch', key: 'channels' },
  { area: 'cs', key: 'segments' },
  { area: 'co', key: 'cost' },
  { area: 're', key: 'revenue' },
] as const;
// the photos are blurred and faint, so a small file is enough: the 400 px one on a phone and for the narrow blocks
const SIZES = (area: string) => (area === 'co' || area === 're' ? '(max-width: 760px) 50vw, 40vw' : '(max-width: 760px) 30vw, 15vw');

type Block = { image?: Img | null };

function Canvas({ blocks }: { blocks: Block[] }) {
  return (
    <div className="hl__bg" aria-hidden="true">
      <div className="hl__photos">
        {CANVAS.map((b, i) => {
          const src = blocks[i]?.image?.src;
          return (
            <figure key={b.area} className={'hl__b hl__b--' + b.area}>
              {src
                ? <img src={cdnImage(src, 400)} alt="" loading="eager" decoding="async" fetchPriority="low" />
                : <img src={`/hero-canvas/${b.key}-400.webp`} srcSet={`/hero-canvas/${b.key}-400.webp 400w, /hero-canvas/${b.key}-800.webp 800w`}
                    sizes={SIZES(b.area)} alt="" width={800} height={533} loading="eager" decoding="async" fetchPriority="low" />}
            </figure>
          );
        })}
      </div>
      <div className="hl__shade" />
      <div className="hl__lines">{CANVAS.map((b) => <span key={b.area} className={'hl__b--' + b.area} />)}</div>
      <div className="hl__glow" />
    </div>
  );
}

// the headline: «تصاميم» struck through on line 1; line 2's first word plain, the rest in the accent
function Title({ lines, strike }: { lines: string[]; strike?: string }) {
  const [l1, l2] = lines;
  const struck = (t: string) => {
    if (!strike) return t;
    const i = t.indexOf(strike);
    return i < 0 ? t : (<>{t.slice(0, i)}<s className="hl__s">{strike}</s>{t.slice(i + strike.length)}</>);
  };
  const w2 = (l2 || '').split(' ');
  return (
    <h1 id="hero-title" className={'hl__title' + (((l1 || '') + (l2 || '')).length > 34 ? ' hl__title--long' : '')}>
      {l1 && <span className="hl__l1">{struck(l1)}</span>}
      {l2 && <span className="hl__l2">{w2[0]}{w2.length > 1 && <> <b>{w2.slice(1).join(' ')}</b></>}</span>}
    </h1>
  );
}

const WA = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>;

export default function Hero({ d }: { d: Dict }) {
  const h = d.hero;
  const stats = (d.stats ?? []).filter((x) => x && x.v && x.l);
  return (
    <section className="hl" aria-labelledby="hero-title">
      <Canvas blocks={(h.canvas ?? []) as Block[]} />
      <div className="wrap hl__in">
        <div className="hl__txt">
          {h.kicker && <p className="hl__kick">{h.kicker}</p>}
          <Title lines={h.title} strike={h.strike} />
          {h.lead && <p className="hl__lead">{h.lead}</p>}
          <div className="hl__cta">
            <a className="btn btn--lg" href={d.links?.book ?? '#book'}>{h.cta}<span className="btn__ic"><Arrow /></span></a>
            {d.site.whatsapp && h.whatsapp && <a className="hl__wa" href={waWithText(d.site.whatsapp, d.lang)} target="_blank" rel="noopener">{WA}{h.whatsapp}</a>}
          </div>
          {h.note && <p className="hl__note">{h.note}</p>}
          {/* hero figures (admin: «الأرقام أسفل الواجهة»; empty on the site today — the numbers strip follows the hero) */}
          {stats.length > 0 && (
            <dl className="hl__stats">
              {stats.map((s, i) => (
                <div key={i}><dt>{s.l}</dt><dd><span className="num" dir={numDir(s.v)}>{s.v}</span><SrcTag src={s.src} d={d} /></dd></div>
              ))}
            </dl>
          )}
        </div>
        <div className="hl__vid"><ClipCard d={d} /></div>
      </div>
    </section>
  );
}
