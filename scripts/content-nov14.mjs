#!/usr/bin/env node
/* Nov 14, 2026 — ClearUp's content file «محتوى الموقع» (Google Doc), as Mohamed confirmed it:
   1. Home hero: the big headline becomes «نبني للمؤسسات أنظمة ابتكار وذكاء اصطناعي متقدمة تصنع نمواً مستداماً.»
      (no struck-through word any more), and the paragraph under it is the new one.
   2. Service 03 «التحول بالذكاء الاصطناعي والحوكمة» (was «…والأتمتة»): its three parts (إعادة تصميم العمل، نموذج التشغيل،
      بناء ونشر الأنظمة) go in «ماذا نفعل», and the card line says «…عبر ثلاثة محاور».
   3. Service 01 «الابتكار وتطوير المنتجات والخدمات»: «ماذا تحصل عليه» gains «قم ببناء قدرة داخلية…».

   Runs once by itself on the next Netlify build (netlify.toml), before `next build`: it changes the published content
   AND the admin's unpublished draft the same way, in one transaction, and keeps the content as it was before in
   «السجل» (site_v2_versions → «رجوع لما قبل هذا» in the admin). A text that already holds the new wording is left
   alone, so later builds change nothing, and anything the admin writes afterwards is never overwritten.

     node scripts/content-nov14.mjs            → dry run: prints what would change
     node scripts/content-nov14.mjs --apply    → writes it
     --soft                                    → never fails (the build goes on without it: no database, an error…) */

const ls = (ar, en) => ({ _type: 'localeString', ar, en });
const lt = (ar, en) => ({ _type: 'localeText', ar, en });

export const HERO_TITLE = [
  ls('نبني للمؤسسات أنظمة ابتكار وذكاء اصطناعي متقدمة', 'We build advanced innovation and AI systems for organizations'),
  ls('تصنع نمواً مستداماً.', 'that create sustainable growth.'),
];
export const HERO_LEAD = lt(
  'نساعد قادة المؤسسات على التحول بالذكاء الاصطناعي الذي يختاره القادة الذين يرسمون ملامح قطاعاتهم، لإعادة بناء طريقة عملهم وتشغيلهم ونموّهم.',
  'We help organization leaders make the AI transformation chosen by the leaders who shape their sectors, to rebuild how they work, operate and grow.',
);
export const AI_TITLE = ls('التحول بالذكاء الاصطناعي والحوكمة', 'AI Transformation & Governance');
export const AI_EN = 'AI Transformation & Governance';
export const AI_SHORT = lt('نبدأ من حيث تقف مؤسستك اليوم، ونأخذها خطوة للأمام عبر ثلاثة محاور.', 'We start where your organization stands today and take it a step forward along three axes.');
export const AI_DESC = lt(
  [
    'نبدأ من حيث تقف مؤسستك اليوم، ونأخذها خطوة للأمام عبر ثلاثة محاور:',
    '• إعادة تصميم العمل: نعيد بناء طريقة إنجاز المهام لتصبح أسرع وأذكى، بحيث يكون الذكاء الاصطناعي جزءاً أساسياً منها.',
    '• نموذج التشغيل: نعيد تنظيم طريقة إدارة المؤسسة وتشغيلها، لنوسّع ما ينجح ونثبّته.',
    '• بناء ونشر الأنظمة: نبني أنظمة ذكاء اصطناعي جاهزة للعمل الفعلي، تتكامل مع أنظمتك الحالية وتحقق نتائج قابلة للقياس من اليوم الأول.',
  ].join('\n'),
  [
    'We start where your organization stands today and take it a step forward along three axes:',
    '• Work redesign: we rebuild how tasks get done so they are faster and smarter, with AI as a core part of them.',
    '• Operating model: we reorganize how the organization is run and operated, to scale what works and lock it in.',
    '• Building and deploying systems: we build production-ready AI systems that integrate with your current systems and deliver measurable results from day one.',
  ].join('\n'),
);
export const INNOV_LINE = { ar: 'قم ببناء قدرة داخلية على الابتكار الموجه نحو النتائج.', en: 'Build an in-house capability for results-driven innovation.' };

const clone = (v) => JSON.parse(JSON.stringify(v));
// key order ignored (Postgres jsonb stores keys in its own order)
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const arOf = (v) => (v && typeof v === 'object' ? String(v.ar ?? '') : typeof v === 'string' ? v : '');

/** The pure change: { content, changes } — idempotent (a second run reports no changes). */
export function patch(content) {
  const c = clone(content ?? {});
  const changes = [];
  const set = (obj, key, val, where) => {
    if (same(obj[key], val)) return;
    changes.push({ where, field: key, from: obj[key], to: val });
    obj[key] = clone(val);
  };
  for (const s of c.sections ?? []) {
    const d = s?.data;
    if (!d || typeof d !== 'object') continue;
    const where = `${s.page || 'home'}/${s.type} ${s.id}`;
    if (s.type === 'heroSection' && (s.page || 'home') === 'home') {
      // the new headline only replaces the old «لا نبيع … نبني …» one (an admin edit after this is kept)
      const t = (Array.isArray(d.title) ? d.title : []).map(arOf).join(' ');
      if (!t || /نبيع|نبني أنظمة أرباح/.test(t)) {
        const keys = Array.isArray(d.title) ? d.title.map((x) => x?._key) : [];
        set(d, 'title', HERO_TITLE.map((x, i) => ({ _key: keys[i] || `knov14t${i}`, ...x })), where);
        set(d, 'strike', ls('', ''), where);
      }
      if (!/التحول بالذكاء الاصطناعي الذي يختاره القادة/.test(arOf(d.lead))) set(d, 'lead', HERO_LEAD, where);
    }
    if (s.type === 'offeringsSection' && Array.isArray(d.items)) {
      d.items.forEach((it, i) => {
        if (!it || typeof it !== 'object') return;
        const name = arOf(it.title);
        const w = `${where} · items.${i}`;
        if (/التحول بالذكاء/.test(name)) {
          set(it, 'title', AI_TITLE, w);
          set(it, 'en', AI_EN, w);
          set(it, 'short', AI_SHORT, w);
          if (!/إعادة تصميم العمل/.test(arOf(it.desc))) set(it, 'desc', AI_DESC, w);
        } else if (/الابتكار وتطوير/.test(name)) {
          const g = it.gets && typeof it.gets === 'object' ? it.gets : { _type: 'localeText', ar: '', en: '' };
          if (!String(g.ar ?? '').includes(INNOV_LINE.ar)) {
            const add = (a, b) => (a && String(a).trim() ? String(a).replace(/\s+$/, '') + '\n' + b : b);
            set(it, 'gets', { ...g, _type: 'localeText', ar: add(g.ar, INNOV_LINE.ar), en: add(g.en, INNOV_LINE.en) }, w);
          }
        }
      });
    }
  }
  return { content: c, changes };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const soft = process.argv.includes('--soft');
  const url = process.env.DATABASE_URL;
  if (!url) { console.log('content-nov14: no DATABASE_URL — skipped'); return; }
  const { default: pg } = await import('pg');
  const { pgSsl } = await import('./db-ssl.mjs');
  const client = new pg.Client({ connectionString: url, ssl: pgSsl(url) });
  try {
    await client.connect();
    await client.query('BEGIN');
    const s = await client.query('SELECT data FROM site_v2_settings WHERE id = 1');
    const rows = await client.query('SELECT id, page, type, hidden, data FROM site_v2_sections ORDER BY position');
    const before = { settings: s.rows[0]?.data ?? {}, sections: rows.rows.map((r) => ({ id: r.id, type: r.type, hidden: r.hidden, data: r.data, page: r.page })) };
    if (!before.sections.length) { await client.query('ROLLBACK'); console.log('content-nov14: no content in site_v2_sections — skipped'); return; }
    const { content, changes } = patch(before);
    const draft = await client.query('SELECT data FROM site_v2_drafts WHERE id = 1');
    const dp = draft.rows[0] ? patch(draft.rows[0].data) : null;
    console.log(`content-nov14: ${changes.length} change(s) to the published content` + (dp ? `, ${dp.changes.length} to the unpublished draft` : ', no draft'));
    for (const ch of changes) console.log(`- ${ch.where} · ${ch.field}\n    was: ${JSON.stringify(ch.from)}\n    now: ${JSON.stringify(ch.to)}`);
    if (!apply || (!changes.length && !(dp && dp.changes.length))) {
      await client.query('ROLLBACK');
      console.log(apply ? 'content-nov14: already applied — nothing to do' : 'content-nov14: dry run — nothing written (add --apply)');
      return;
    }
    if (changes.length) {
      await client.query('INSERT INTO site_v2_versions (user_email, action, detail, snapshot) VALUES ($1, $2, $3, $4)',
        ['content-script', 'content', `محتوى الموقع (14 نوفمبر): ${changes.length} تعديل`, JSON.stringify(before)]);
      const old = new Map(before.sections.map((x) => [x.id, x]));
      for (const x of content.sections) {
        if (!same(old.get(x.id)?.data, x.data)) await client.query('UPDATE site_v2_sections SET data = $2, updated_at = now() WHERE id = $1', [x.id, JSON.stringify(x.data)]);
      }
    }
    if (dp && dp.changes.length) await client.query('UPDATE site_v2_drafts SET data = $1 WHERE id = 1', [JSON.stringify(dp.content)]);
    await client.query('COMMIT');
    console.log('content-nov14: applied (the previous content is in «السجل»)');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('content-nov14: NOT APPLIED:', e.message);
    if (!soft) process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
