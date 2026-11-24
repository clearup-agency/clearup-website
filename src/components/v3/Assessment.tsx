'use client';
import { useMemo, useState } from 'react';
import SectionHead from '../SectionHead';
import { Arrow } from '../Mark';
import { Ph } from './Blocks';

/* «المشخّص الذكي» — the free readiness assessment for organizations (content document, Nov 22, 2026): 12 short
   questions on four axes funders look at, 25 points each; every answer scores 0–3 (weakest → strongest) and an axis
   is scaled to 25. The result: the score out of 100, its level, a bar per axis, the first three steps (taken from the
   weakest axes, each with the programme it leads to), and the accelerator line when the answers fit its rules.
   `teaser` = Home's short version: the two choice cards, linking to the assessment page.
   The voice conversation is the next build (the text version is faster to build, so it launches first). */

type Q = { q: string; opts: string[] };
type Axis = { t: string; qs: Q[]; step?: string };
type Level = { min: number; max: number; name: string; msg: string };
type Btn = { label?: string; href?: string };
type Data = {
  anchor?: string; kicker?: string; title?: string; lead?: string; teaser?: boolean; teaserCta?: string; pageHref?: string;
  voice?: { t?: string; d?: string; cta?: string; soon?: string }; text?: { t?: string; d?: string; cta?: string };
  privacy?: string; axes?: Axis[]; levels?: Level[];
  labels?: { question?: string; of?: string; next?: string; back?: string; result?: string; steps?: string; restart?: string; axes?: string };
  primary?: Btn; secondary?: Btn; eligible?: string; eligibleCta?: Btn; eligibleAxis?: number; eligibleQ?: number;
};

export default function Assessment({ s, hrefs }: { s: Data; hrefs: { book: string; accelerator: string; assessment: string } }) {
  const axes = (s.axes ?? []).filter((a) => a && a.qs?.length);
  const flat = useMemo(() => axes.flatMap((a, ai) => a.qs.map((q, qi) => ({ ...q, ai, qi }))), [axes]);
  const [stage, setStage] = useState<'pick' | 'quiz' | 'done'>('pick');
  const [at, setAt] = useState(0);
  const [ans, setAns] = useState<number[]>([]);
  const lb = s.labels ?? {};

  const pick = (v: number) => {
    const next = ans.slice();
    next[at] = v;
    setAns(next);
    if (at + 1 < flat.length) setAt(at + 1);
    else setStage('done');
  };

  const axisScore = (ai: number) => {
    const qs = flat.map((q, i) => ({ q, i })).filter((x) => x.q.ai === ai);
    const got = qs.reduce((n, x) => n + (ans[x.i] ?? 0), 0);
    return Math.round((got / (qs.length * 3)) * 25);
  };
  const scores = axes.map((_, i) => axisScore(i));
  const total = scores.reduce((a, b) => a + b, 0);
  const level = (s.levels ?? []).find((l) => total >= l.min && total <= l.max);
  const weakest = scores.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v).slice(0, 3);
  // the accelerator's rules from the answers: at least one funder in the last two years
  const eqIdx = flat.findIndex((q) => q.ai === (s.eligibleAxis ?? 2) && q.qi === (s.eligibleQ ?? 0));
  const eligible = eqIdx >= 0 && (ans[eqIdx] ?? 0) >= 1;

  const cards = (
    <div className="asx__pick">
      <div className="asx__opt asx__opt--voice" data-reveal>
        <h3>{s.voice?.t}</h3>
        <p>{s.voice?.d}</p>
        <button type="button" className="btn btn--ghost" disabled aria-disabled="true">{s.voice?.cta}{s.voice?.soon && <small>{s.voice.soon}</small>}</button>
      </div>
      <div className="asx__opt" data-reveal>
        <h3>{s.text?.t}</h3>
        <p>{s.text?.d}</p>
        {s.teaser
          ? <a className="btn" href={hrefs.assessment + '#assess'}>{s.text?.cta}</a>
          : <button type="button" className="btn" onClick={() => { setStage('quiz'); setAt(0); setAns([]); }}>{s.text?.cta}</button>}
      </div>
    </div>
  );

  return (
    <section className="asx section" id={s.anchor || 'assess'}>
      <div className="wrap">
        {s.kicker && <p className="asx__k"><Ph t={s.kicker} /></p>}
        <SectionHead title={s.title} lead={s.lead} />
        {/* Home's short version as the content file writes it (Nov 24, 2026): the text and one button */}
        {s.teaser && s.teaserCta
          ? <p className="asx__go"><a className="btn btn--lg" href={hrefs.assessment + '#assess'}>{s.teaserCta}<span className="btn__ic"><Arrow /></span></a></p>
          : (s.teaser || stage === 'pick') && cards}
        {stage === 'quiz' && !s.teaser && flat[at] && (
          <div className="asx__quiz" aria-live="polite">
            <div className="asx__bar"><i style={{ width: `${(at / flat.length) * 100}%` }} /></div>
            <p className="asx__meta">{axes[flat[at].ai].t} · {lb.question} {at + 1} {lb.of} {flat.length}</p>
            <h3 className="asx__q">{flat[at].q}</h3>
            <ul className="asx__ans">
              {flat[at].opts.map((o, v) => (
                <li key={v}><button type="button" className={'asx__a' + (ans[at] === v ? ' is-on' : '')} onClick={() => pick(v)}>{o}</button></li>
              ))}
            </ul>
            {at > 0 && <button type="button" className="asx__back" onClick={() => setAt(at - 1)}>{lb.back}</button>}
          </div>
        )}
        {stage === 'done' && !s.teaser && (
          <div className="asx__res" aria-live="polite">
            <p className="asx__meta">{lb.result}</p>
            <p className="asx__score"><span className="num">{total}</span><em>/ 100</em></p>
            {level && <p className="asx__lvl"><b>{level.name}</b> · {level.msg}</p>}
            <h4 className="asx__h">{lb.axes}</h4>
            <ul className="asx__axes">
              {axes.map((a, i) => (
                <li key={i}><span>{a.t}</span><i><b style={{ width: `${(scores[i] / 25) * 100}%` }} /></i><em className="num">{scores[i]}/25</em></li>
              ))}
            </ul>
            <h4 className="asx__h">{lb.steps}</h4>
            <ol className="asx__steps">{weakest.map((w) => <li key={w.i}>{axes[w.i].step}</li>)}</ol>
            {eligible && s.eligible && (
              <p className="asx__elig">{s.eligible} <a className="link" href={hrefs.accelerator + '#apply'}>{s.eligibleCta?.label}</a></p>
            )}
            <div className="cta-row">
              <a className="btn btn--lg" href={hrefs.book}>{s.primary?.label}</a>
              <a className="btn btn--lg btn--ghost" href={hrefs.book}>{s.secondary?.label}</a>
            </div>
            <button type="button" className="asx__back" onClick={() => { setStage('pick'); setAns([]); setAt(0); }}>{lb.restart}</button>
          </div>
        )}
        {s.privacy && !(s.teaser && s.teaserCta) && <p className="asx__priv">{s.privacy}</p>}
      </div>
    </section>
  );
}
