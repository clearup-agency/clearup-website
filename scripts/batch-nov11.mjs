#!/usr/bin/env node
/* Nov 11, 2026 — Mohamed's batch of structure edits (voice note 2:46 PM). Data side, idempotent: run it as many
   times as you like, it only changes what is not changed yet. Nothing is deleted: removed sections are HIDDEN
   (admin: «إخفاء هذا القسم»), the «المشكلة ليست في التصميم» part is hidden with its own switch.
   Usage (back up site_v2_sections first!):  DATABASE_URL=postgres://… node scripts/batch-nov11.mjs [--dry]          */
import pg from 'pg';

const DRY = process.argv.includes('--dry');
const TRAINING = [{"_key": "ktrdrv1785", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401705/clearup/site/training_img_1785.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1790", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401707/clearup/site/training_img_1790.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1793", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401708/clearup/site/training_img_1793.jpg", "_type": "image", "width": 1200, "height": 900, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1799", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401709/clearup/site/training_img_1799.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1800", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401709/clearup/site/training_img_1800.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1801", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401710/clearup/site/training_img_1801.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1802", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401711/clearup/site/training_img_1802.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1803", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401712/clearup/site/training_img_1803.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv1932", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401713/clearup/site/training_img_1932.jpg", "_type": "image", "width": 900, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv3186", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401716/clearup/site/training_img_3186.jpg", "_type": "image", "width": 661, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv3187", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401717/clearup/site/training_img_3187.jpg", "_type": "image", "width": 666, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv5220", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401719/clearup/site/training_img_5220.jpg", "_type": "image", "width": 675, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv5221", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401720/clearup/site/training_img_5221.jpg", "_type": "image", "width": 675, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv5222", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401721/clearup/site/training_img_5222.jpg", "_type": "image", "width": 675, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}, {"_key": "ktrdrv5223", "_type": "storyItem", "image": {"url": "https://res.cloudinary.com/smxxrryc/image/upload/v1794401721/clearup/site/training_img_5223.jpg", "_type": "image", "width": 675, "height": 1200, "alt": {"ar": "من التدريب والمحاضرات", "en": "From our trainings and lectures", "_type": "localeString"}}}];
const FAQ_FIT = {"_key": "kfaqfit1", "_type": "faqItem", "q": {"ar": "هل كلير أب تناسب الجميع؟", "en": "Is Clear Up for everyone?", "_type": "localeString"}, "a": {"ar": "لا، كلير أب مش للكل. تناسبك إذا كنت تريد نمواً حقيقياً تقيسه بالأرقام، ومستعداً لأن نختبر صغيراً قبل أن نراهن كبيراً، وتريد أن يتعلم فريقك طريقة العمل ويكمل بعدنا. ولا تناسبك إذا كنت تبحث عن حل سحري ونتائج خلال أيام، أو كان كل ما تريده منشورات وإعجابات لا مبيعات وأثراً يُقاس، أو كان أرخص سعر أهم عندك من العائد الحقيقي.", "en": "No, Clear Up is not for everyone. It fits you if you want real growth you measure in numbers, are ready to test small before betting big, and want your team to learn the way of working and carry on after us. It is not for you if you are looking for a magic fix with results in days, if all you want is posts and likes rather than sales and measurable impact, or if the lowest price matters more to you than the real return.", "_type": "localeText"}};

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const { rows } = await c.query('select id, page, type, position, hidden, data from site_v2_sections');
const log = [];
const changed = new Map(); // id -> { hidden?, position?, data? }
const touch = (r, what) => { const x = changed.get(r.id) ?? {}; Object.assign(x, what); changed.set(r.id, x); };
const find = (page, type, pred = () => true) => rows.filter((r) => r.page === page && r.type === type && pred(r));
const hide = (r, why) => { if (!r.hidden) { r.hidden = true; touch(r, { hidden: true }); log.push('hide ' + r.id + ' (' + why + ')'); } };

// 5) Home «المشكلة ليست في التصميم…» (the turn + quote + before/after under the 3 problems): hidden by a switch
for (const r of find('home', 'problemSection')) if (r.data.turnHidden !== true) { r.data.turnHidden = true; touch(r, { data: r.data }); log.push('turnHidden ' + r.id); }
// 8) Home «نظام واحد، ست مراحل» merges into the five services → hidden
for (const r of find('home', 'systemSection')) hide(r, 'home six stages');
// 14) Home «كلير أب مش للكل» → one FAQ question (below) → hidden
for (const r of find('home', 'fitSection')) hide(r, 'fit → FAQ');
// 18) Services: the six-stage system → the five services in the same scroll → hidden
for (const r of find('services', 'systemSection')) hide(r, 'services six stages');
// 19) Services «التسويق الابتكاري: ماذا يشمل» → hidden
for (const r of find('services', 'servicesSection')) hide(r, 'marketing four groups');

// 16 + 18) Services «ماذا نقدّم» list → the five services in the sticky scroll, placed after «من الفرصة إلى النمو»
const offers = find('services', 'offeringsSection', (r) => !r.data.compact)[0];
const proc = find('services', 'processSection')[0];
if (offers) {
  if (offers.data.scroll !== true) { offers.data.scroll = true; touch(offers, { data: offers.data }); log.push('scroll ' + offers.id); }
  // 6) «التحليل الاستراتيجي» → «بناء أقسام الابتكار» (title only; its description is left for the client to rewrite)
  for (const it of offers.data.items ?? []) {
    if (it && it.id === 'analysis' && it.title?.ar !== 'بناء أقسام الابتكار') {
      it.title = { ...(it.title ?? {}), ar: 'بناء أقسام الابتكار', en: 'Building innovation units', _type: 'localeString' };
      it.en = 'Building Innovation Units';
      touch(offers, { data: offers.data }); log.push('rename analysis → بناء أقسام الابتكار');
    }
  }
  if (proc && offers.position < proc.position) {
    const a = offers.position; offers.position = proc.position; proc.position = a;
    touch(offers, { position: offers.position }); touch(proc, { position: proc.position }); log.push('move ' + offers.id + ' after ' + proc.id);
  }
}
// 7) «بحث وتشخيص مجاني» → «بحث وتشخيص»
for (const r of rows.filter((x) => x.type === 'processSection')) {
  for (const st of r.data.steps ?? []) {
    if (st?.t?.ar === 'بحث وتشخيص مجاني') { st.t.ar = 'بحث وتشخيص'; if (st.t.en && /free/i.test(st.t.en)) st.t.en = st.t.en.replace(/\s*free\s*/i, ' ').trim().replace(/^./, (m) => m.toUpperCase()); touch(r, { data: r.data }); log.push('process step ' + r.id); }
  }
}
// 14) the FAQ «قبل أن تحجز» gets the one question that sums up «كلير أب مش للكل» (second, after «لمن خدماتكم؟»)
for (const r of rows.filter((x) => x.type === 'faqSection' && Array.isArray(x.data.items))) {
  if (!r.data.items.some((it) => it?._key === FAQ_FIT._key)) { r.data.items.splice(Math.min(1, r.data.items.length), 0, FAQ_FIT); touch(r, { data: r.data }); log.push('faq + ' + r.id); }
}
// 9) «شغلنا من جوّا»: the training / lecture photos from Mohamed's Drive folder join the «من التدريب» ring
for (const r of rows.filter((x) => x.type === 'workStoriesSection' && Array.isArray(x.data.groups))) {
  const g = r.data.groups.find((x) => /التدريب/.test(x?.name?.ar ?? '')) ?? r.data.groups[0];
  if (!g) continue;
  g.items = g.items ?? [];
  const have = new Set(g.items.map((it) => it?._key));
  const add = TRAINING.filter((it) => !have.has(it._key));
  if (add.length) { g.items.push(...add); touch(r, { data: r.data }); log.push('work photos +' + add.length + ' ' + r.id); }
}

// 22) «لون القسم» (Mohamed, Nov 11, 3:41 PM): no automatic rhythm — each section keeps its own colour, set here
//     explicitly so the admin shows it (and hiding a section changes nothing else). Only the bands he named:
const TONES_NOV11 = [
  ['home', 'problemSection', { tone: 'light' }],             // «تصرف على الإعلانات ولا ترى أرباحاً» → white
  ['home', 'offeringsSection', { tone: 'light' }, (r) => r.data.compact === true], // «خمس خدمات» (01–05) → white
  ['home', 'toolsSection', { tone: 'light' }],               // «أدوات عالمية» on home → white, white cards
  ['home', 'productsSection', { tone: 'dark' }],             // «منتجات» stays dark as on the preview (was purple)
  ['services', 'auditSection', { tone: 'light' }],           // «أين يتسرّب المال» → white (was purple)
  ['services', 'toolsSection', { tone: 'light', bg: '#F1EAF8' }], // «أدوات عالمية» → very light purple, white cards
];
for (const [page, type, want, pred] of TONES_NOV11) {
  for (const r of find(page, type, pred)) {
    const d = r.data.design && typeof r.data.design === 'object' ? r.data.design : {};
    if (Object.entries(want).every(([k, v]) => d[k] === v)) continue;
    r.data.design = { ...d, ...want }; touch(r, { data: r.data }); log.push('tone ' + r.id + ' ' + JSON.stringify(want));
  }
}

if (!DRY) {
  await c.query('begin');
  for (const [id, x] of changed) {
    const r = rows.find((y) => y.id === id);
    await c.query('update site_v2_sections set hidden = $2, position = $3, data = $4, updated_at = now() where id = $1', [id, r.hidden, r.position, JSON.stringify(r.data)]);
  }
  await c.query('commit');
}
console.log((DRY ? '[dry] ' : '') + (log.length ? log.join('\n') : 'nothing to change (already applied)'));
await c.end();
