// One-off: copies ALL live content out of the old Sanity project into seed/content.json,
// the file the database seed (scripts/db-seed.mjs) loads. No Sanity package needed — plain HTTPS.
//
//   SANITY_PROJECT_ID=ydwdl7ec SANITY_DATASET=production SANITY_READ_TOKEN=sk... node scripts/migrate-from-sanity.mjs
//
// Images/videos: Sanity CDN files are mapped to the same files under public/media/ (downloaded there if missing),
// so the site keeps working after the Sanity project is gone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { SANITY_PROJECT_ID: pid, SANITY_DATASET: ds = 'production', SANITY_READ_TOKEN: token } = process.env;
if (!pid || !token) { console.error('Set SANITY_PROJECT_ID and SANITY_READ_TOKEN'); process.exit(1); }

const res = await fetch(`https://${pid}.api.sanity.io/v2024-01-01/data/export/${ds}`, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) { console.error('Sanity export failed', res.status, await res.text()); process.exit(1); }
const docs = (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((d) => !d._id.startsWith('drafts.'));
const byId = Object.fromEntries(docs.map((d) => [d._id, d]));
const mediaDir = path.join(root, 'public/media');

async function localFor(ref) {
  const a = byId[ref];
  if (!a) throw new Error('missing asset ' + ref);
  const name = (a.originalFilename || a._id).replace(/[^\w.-]+/g, '-');
  const file = path.join(mediaDir, name);
  if (!fs.existsSync(file)) {
    const r = await fetch(a.url);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    console.log('downloaded', name);
  }
  return { url: '/media/' + name, width: a.metadata?.dimensions?.width, height: a.metadata?.dimensions?.height };
}

async function convert(v) {
  if (Array.isArray(v)) return Promise.all(v.map(convert));
  if (!v || typeof v !== 'object') return v;
  if ((v._type === 'image' || v._type === 'file') && (v.asset?._ref || v.localSrc)) {
    const out = { _type: v._type };
    if (v.asset?._ref) Object.assign(out, await localFor(v.asset._ref));
    else out.url = v.localSrc;
    for (const [k, x] of Object.entries(v)) if (!['_type', 'asset', 'localSrc', 'hotspot', 'crop'].includes(k)) out[k] = await convert(x);
    if (v._type === 'file') { delete out.width; delete out.height; }
    return out;
  }
  const out = {};
  for (const [k, x] of Object.entries(v)) if (!['_id', '_rev', '_createdAt', '_updatedAt'].includes(k)) out[k] = await convert(x);
  return out;
}

const settings = await convert(byId.siteSettings);
delete settings._type;
const home = docs.find((d) => d._type === 'page' && d.slug?.current === 'home');
const sections = [];
for (const s of home?.sections ?? []) {
  const data = await convert(s);
  const { _key, _type, hidden, ...rest } = data;
  sections.push({ id: _key, type: _type, hidden: !!hidden, data: rest });
}
const out = { format: 'clearup-content', version: 1, source: `sanity:${pid}/${ds}`, exportedAt: new Date().toISOString(), settings, sections };
fs.writeFileSync(path.join(root, 'seed/content.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`seed/content.json: settings + ${sections.length} sections`);
