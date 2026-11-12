# ClearUp — Website Concept · نموذج موقع ClearUp

**Preview:** https://clearup-concept.sites.tab.bot/ar/ (English: https://clearup-concept.sites.tab.bot/en/)

> هذا نموذج تصميم (Concept) حي وقابل للتطوير، وليس الموقع النهائي. كل نص بين [أقواس] وبخلفية مخططة هو مكان فارغ عن قصد ويجب أن يملأه ClearUp بمعلومة حقيقية.
> This is a working design concept, not the final site. Anything in [brackets] with a striped background is an intentional placeholder for a real, approved fact from ClearUp.

**لوحة التحكم:** `/admin` — لوحة عربية بسيطة مبنية داخل نفس الموقع (بدون Sanity أو أي خدمة CMS خارجية). دليل الأدمن بالعربي: `docs/ClearUp_admin_guide_ar.pdf`.

---

## لوحة التحكم — بالعربي باختصار

- **الدخول:** `/admin` بالإيميل وكلمة المرور (حساب الأدمن يُنشأ من متغيرات `ADMIN_EMAIL` و`ADMIN_PASSWORD` بأمر `npm run db:seed` — لا توجد كلمة مرور داخل الكود). بعد 5 محاولات خاطئة يُقفل الدخول 15 دقيقة. تغيير كلمة المرور من صفحة «الحساب».
- **المحرر المرئي (شاشة واحدة):** بعد الدخول، الموقع الحقيقي على **اليسار** وكل التعديلات على **اليمين**. أي تغيير (كتابة، صورة، لون، خط، سحب وإفلات، إخفاء) يظهر بالمعاينة **فوراً** كمسودة. اضغط على أي قسم بالمعاينة ليفتح تعديله، أو على القائمة العلوية / أسفل الصفحة لتفتح إعداداتها. أزرار: عربي/EN، كمبيوتر/موبايل، تراجع/إعادة.
- **الأقسام:** ترتيب بالسحب ⋮⋮، إظهار/إخفاء 👁، نسخ، حذف (مع تأكيد)، وإضافة قسم جديد من الأنواع الموجودة. نصوص كل قسم بتبويب «العربية / English» ورفع صور وفيديو.
- **إعدادات الموقع (تبويب بنفس اللوحة):** الشعار، الألوان، الخط، واتساب والإيميل والسوشال، روابط القائمة، الفوتر، وعنوان/وصف/صورة المشاركة لمحركات البحث.
- **نشر:** المسودة تُحفظ تلقائياً (لو عملت ريفرش ما بيضيع شي)، وزر **«نشر»** واحد يضعها على الموقع خلال ثوانٍ. النقطة الصفراء = تغييرات غير منشورة. «تجاهل كل التغييرات» من قائمة ⋯ يرجع المحرر للموقع المنشور.
- **السجل:** تبويب «السجل» فيه كل نشر سابق؛ تفتح أي نسخة بالمعاينة وتنشرها إذا بدك.
- **النسخ الاحتياطي:** «تنزيل نسخة احتياطية» (ملف JSON فيه كل شيء) و«استعادة من ملف»، وسجل تلقائي لكل تغيير مع زر «رجوع لما قبل هذا».
- **الأمان:** لو قاعدة البيانات غير متاحة وقت البناء، الموقع يبني من نسخة محلية (`seed/content.json`) ولا يتعطل. الزوار لا يلمسون قاعدة البيانات أبداً (الصفحات محفوظة جاهزة وتتحدث عند النشر).

---

## بالعربي

**الفكرة:** «من الفوضى إلى الوضوح» — ترجمة حرفية لاسم Clear Up. الهيرو (النسخة 2): عنوان ضخم «لا نبيع ~~تصاميم~~. نبني أنظمة أرباح.» يطلع كلمة كلمة وتنشطب كلمة «تصاميم»، وتحته خط نمو واحد: يبدأ متعرّجاً وعشوائياً (حوله كلمات الفوضى: «بوستات بلا خطة»، «إعلانات عشوائية»…) ثم يتحول لخط بنفسجي واحد نظيف يصعد لأعلى-يمين وينتهي بسهم ClearUp عند «الوضوح». بعدها النظام التفاعلي، ثم الدليل (أرقام وعملاء حقيقيون)، ثم الحجز.

**الخط:** Thmanyah Sans (خط ثمانية) — نفس خط موقع Takwer Growth. مجاني حتى للاستخدام التجاري ومواقع الويب حسب ترخيص ثمانية، لكن الترخيص يمنع إعادة توزيع ملفات الخط، لذلك **ملفات الخط غير موجودة في الريبو**: حمّل الخط من https://font.thmanyah.com (بإيميلك) وانسخ `thmanyahsans-Regular/Medium/Bold/Black.woff2` من مجلد `woff2` إلى `public/fonts/thmanyah/`. بدونها الموقع يرجع لـ IBM Plex Sans Arabic / خط النظام.

**ترتيب الصفحة الرئيسية** (حسب تقرير المنافسين):
1. Hero: عنوان ضخم بحركة ناعمة + لوجو ClearUp بطبقات ثلاثية الأبعاد (السهم ينطلق لفوق) + «احجز مكالمة وضوح» + واتساب + فيديو عميل صغير + أرقام موقعهم (مُعلَّمة).
2. شريط العملاء (مساحات، ثوب وطرحة، إعمار كلين، النون، أفروديتا، Twety).
3. المشكلة: «تصرف على الإعلانات ولا ترى أرباحاً؟».
4. **The Clear Up System™** تفاعلي: 6 مراحل على درج يصعد لأعلى-يمين، كل مرحلة تضيء مع السكرول (أو بالضغط) وتعرض ما تستلمه والدليل.
5. النتائج كلوحات بيانات: النون (×8 خلال 60 يوماً، من إنستغرامهم)، متجر إنستغرام ($360K من موقعهم — يحتاج تأكيداً)، مساحات (فارغة).
6. الخدمات: 4 مجموعات، كل واحدة بجانبها دليلها.
7. تدقيق الوضوح: 5 أسئلة → أكبر تسريب في شركتك.
8. أول 90 يوماً (جدول مقترح).
9. المؤسس عبد المنعم + الفريق (الأسماء من موقعهم).
10. آراء العملاء كستوريز عمودية (فيديوهاتهم الحقيقية من إنستغرام).
11. أسئلة شائعة.
12. «جاهز تغيّر طريقة شغلك؟» نعم/ليس بعد → نموذج 3 حقول + واتساب.
13. Footer: غزة، الإيميل، واتساب، السوشال.

**التشغيل:**
```bash
npm install
npm run dev          # http://localhost:3000/ar/
npm run build        # static export في out/ (output: 'export')
npm run build:preview  # نسخة المعاينة: الفيديوهات تفتح على إنستغرام
```

**ما يجب أن يوفره ClearUp قبل الإطلاق:**
- 3 قصص نجاح بأرقام قبل/بعد + الفترة + إذن نشر.
- اقتباسات حقيقية من فيديوهات العملاء، والفيديوهات بجودتها الأصلية.
- تأكيد أو حذف أرقام موقعهم الحالي: `$4.7M+`، `100+ brand`، `28 countries`، و`$360K` (موقعهم يكتب $360K في العنوان و$380K تحته، وبدون اسم العميل).
- ملفات الشعار SVG، صور احترافية لعبد المنعم والفريق (صورة المؤسس الحالية لقطة من فيديو)، شعارات العملاء المسموح بها.
- نطاق الأسعار، أقل مدة تعاقد، الأسواق التي يعملون فيها، ووعد «نرد خلال 24 ساعة».
- رابط الحجز (Cal.com / Calendly) ورقم الواتساب المعتمد (الموجود من موقعهم: 972597101439، وبايو إنستغرام فيه 905824005288 — يجب اختيار واحد).
- جملة حقيقية من عبد المنعم لقسم المؤسس.

## Admin panel + database (developer note)

Replaced Sanity on Nov 1 2026 (Mohamed found Sanity Studio too hard and didn't want a third-party CMS). Everything lives in this one Next.js app.

**Stack** — Postgres (Neon in production, any local Postgres in dev) via **Drizzle ORM** + `pg`; images on **Cloudinary** (or stored in the database when `CLOUDINARY_URL` is unset); admin UI = React client components + Server Actions; `bcryptjs` for passwords; `@dnd-kit` for drag-to-reorder. No other services.

**How content flows**
- Tables (`src/db/schema.ts`, SQL in `drizzle/`): `site_settings` (one row, JSON with one key per field), `sections` (id, type, position, hidden, data JSON with `{ar, en}` texts), `media` (uploads), `admin_user`, `login_attempts` (lockout counters), `versions` (audit log + the whole content *before* every change, last 200 kept), `drafts` (one row: the live editor's unpublished work, autosaved; deleted on publish). After pulling this version run `npm run db:migrate` once (adds `drafts`).
- **Live editor** (`/admin`, `src/admin/ui/LiveEditor.tsx`): the panel keeps the whole content as a draft in React state (undo/redo stacks), autosaves it to `drafts` (`saveDraft`, 0.5 s debounce) and posts it to the preview iframe on every change. The preview is `/preview/<lang>/` (`src/app/preview`, `src/admin/ui/PreviewFrame.tsx`): admin-only, `frame-ancestors 'self'`, noindex; it renders the real site components from the draft with the same pure `buildView()` as the public pages (`src/lib/view.ts`), outlines hovered/selected sections and posts clicks back (same-origin `postMessage` only). «نشر» = `publishDraft`: full `validate.ts` cleaning, one transaction (old content → `versions`, draft deleted), then the usual revalidation.
- Public pages (`src/app/[lang]`) are pre-rendered (ISR). `src/lib/cms.ts` reads the DB through `unstable_cache` tagged `content`; **visitors never hit the database**. Every admin change runs `revalidateTag('content', { expire: 0 })` + `revalidatePath('/', 'layout')`, so the next request regenerates the page — live in seconds, no rebuild.
- No `DATABASE_URL`, or DB down at build time → the bundled `seed/content.json` (same shape), so the site always builds.
- Images uploaded in the admin go straight from the browser to Cloudinary (signed, folder `clearup/`), or — without Cloudinary — into the `media` table and are served from `/media-db/<id>/<name>` with a 1-year immutable cache header (max 4 MB per file). The original site media stays in `public/media/`.

**Admin code map**
```
src/admin/schema.json   the form definition: every section type + site settings, with the Arabic labels
src/admin/content.ts    types/helpers for the schema (labels, empty values, new keys)
src/admin/validate.ts   server-side whitelist/shape check for every save (unknown keys dropped, safe URLs only)
src/admin/auth.ts       login (bcrypt), signed httpOnly cookie, lockout, requireAdmin()
src/admin/actions.ts    Server Actions: saveDraft / discardDraft / publishDraft / loadVersion (live editor), restore, import, password
src/admin/store.ts      transaction + version snapshot + publish (revalidate) wrapper
src/admin/ui/*          the Arabic UI (LiveEditor + Fields, PreviewFrame, BackupPanel, AccountPanel, LoginForm)
src/app/admin/**        routes (login, the editor at /admin, backup, account; old section/settings URLs redirect) — all *.dyn.tsx
src/app/preview/**      the editor's preview iframe (/preview/ar|en/, admin-only)
src/lib/view.ts         pure content → view code shared by the public pages and the preview
src/app/api/admin/*     upload (Cloudinary signature / DB storage) and backup (export/import JSON)
```

**Adding a new section type** (one place for the form, one for the look):
1. Add its definition to `sections` in `src/admin/schema.json` — `name` (e.g. `pricingSection`), Arabic `title`, `groups`, and `fields` (types: `localeString`, `localeText`, `localeBlock`, `string`, `url`, `number`, `boolean`, `color`, `image`, `file`, `object`, `array`; `options.list` for choices). The form, validation and "add section" menu pick it up automatically.
2. Write the component in `src/components/` and add one `case` for it in `src/components/Sections.tsx`.
3. `npm run typecheck && npm test`, then deploy. No database migration is needed (section data is JSON).

**Security** — passwords hashed with bcrypt (cost 12); session = HMAC-SHA256-signed cookie (`httpOnly`, `secure` in production, `SameSite=Lax`, 7 days; changing the password in «الحساب» or resetting it via `db:seed` signs out every other session); 5 wrong passwords per email (20 per IP) in 15 min → locked for 15 min; every admin page, Server Action and API route checks the session on the server; Server Actions are origin-checked by Next.js and the upload/backup POST routes check `Origin`; every save is validated against the schema (unknown fields dropped, `javascript:` links refused, sizes capped); uploads limited to images (PNG/JPG/WebP/SVG/GIF/AVIF) and MP4/WebM, 4 MB in DB mode, SVGs served with a locked-down CSP; `/admin` and `/api/admin` send `X-Frame-Options: DENY`, `no-store`, `noindex`. No secret has a `NEXT_PUBLIC_` name, so none reaches the browser bundle.

**Backups** — «النسخ الاحتياطي»: download one JSON file (settings + sections + DB-stored images as base64) and import it back; the `versions` table keeps the content before each of the last 200 changes with one-click restore (a restore is itself undoable). Neon's free plan also keeps a short point-in-time restore window.

**Env vars** (copy `.env.example` → `.env.local`)
| var | where | value |
|---|---|---|
| `DATABASE_URL` | server (build + runtime) | Neon **pooled** connection string (`…-pooler…/neondb?sslmode=verify-full`); locally `postgres://…@localhost/clearup` |
| `ADMIN_SESSION_SECRET` | server | 64 random hex chars (`openssl rand -hex 32`) — signs the login cookie |
| `CLOUDINARY_URL` | server | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (Cloudinary → Settings → API Keys). Unset = images stored in the DB |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | only when running `npm run db:seed` | creates / resets the admin login (min 10 chars). Not needed on the host |
| `NEXT_PUBLIC_SITE_URL` | build | the public address, e.g. `https://<official-domain>` |
| `SEO_INDEXABLE` | build | `true` only on the official domain |

**Setup**
```bash
npm install
cp .env.example .env.local            # fill DATABASE_URL + ADMIN_SESSION_SECRET (+ CLOUDINARY_URL)
npm run db:migrate                    # creates the tables (safe to re-run)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run db:seed   # content + admin login
npm run dev                           # http://localhost:3000/ar/ and /admin
npm run typecheck && npm run lint && npm test && npm run build
```
`npm run db:seed` only loads `seed/content.json` into an **empty** database (`-- --force-content` replaces existing content, keeping a version). `scripts/migrate-from-sanity.mjs` is the one-off that produced `seed/content.json` from the old Sanity project (all 12 sections + settings; Sanity image/video files mapped to the same files in `public/media/`).

**Neon** — create a project (region near the host, e.g. AWS us-east-1 for Vercel `iad1`), copy the **pooled** connection string into `DATABASE_URL`, run `db:migrate` + `db:seed` once from your machine. The free plan sleeps after 5 min idle: visitors don't notice (pages are cached), the first admin action after a pause takes ~1 s longer.

**Cloudinary** — free plan is enough. Put `CLOUDINARY_URL` on the host; uploads land in the `clearup/` folder.

**Deploy** — any host that runs Next.js 16 with ISR:
- **Vercel**: set the env vars above (Production), deploy from a local tree (the Thmanyah `.woff2` files are not in git): `npx vercel@latest deploy --prod`. Vercel Hobby terms are **non-commercial** → Vercel Pro or Netlify for the business site.
- **Netlify Free** (commercial use allowed): import the repo, add the env vars + the font files (or a build step that copies them), deploy. On-demand `revalidateTag` works on Netlify's Next.js runtime.
- `STANDALONE=1 npm run build` → `.next/standalone` for Docker / any Node host.

**Build modes**
```bash
npm run build && npm start   # server build: SSG + ISR + /admin + API routes (deploy this)
npm run build:static         # static export (all public pages; no admin/ISR/API) — for static-only hosts
bash scripts/preview-site.sh # the light static preview (site/)
```
Server-only routes use the `*.dyn.ts(x)` extension; `STATIC_EXPORT=1` drops them via `pageExtensions` and adds their static-only counterparts `*.static.tsx` (e.g. `work/[slug]`: ISR on the server, only the build-time case studies in the export). The build scripts and `npm test` work on Windows too (no `VAR=x cmd` / `set -a`; tests run with `--experimental-strip-types` so Node 22.6+ is enough). Thmanyah's @font-face is emitted only for the woff2 files present in `public/fonts/thmanyah/`; without them the Arabic font is IBM Plex Sans Arabic.

**Thmanyah** font files are still git-ignored (licence). Without them the font falls back to IBM Plex Sans Arabic.

## الشات بوت · Chatbot

**بالعربي:** زر محادثة عائم على الموقع (يسار بالعربي، يمين بالإنجليزي) يجاوب الزوار بلغة الصفحة من «الأسئلة والأجوبة». مجاني بالكامل: المطابقة تتم في متصفح الزائر (تفهم العامية والأخطاء الإملائية: «قديش السعر»، «كيف بنبلش»، «وين مكانكم»)، وبدون أي طلب لقاعدة البيانات. إذا ما لقى جواباً يعرض زر واتساب وزر الحجز.
كل شيء من المحرر: **إعدادات الموقع ← الشات بوت** (أو اضغط زر الشات في المعاينة): تشغيل/إيقاف، الاسم والصورة، الترحيب، مكان الزر، الأسئلة المقترحة، وكل الأسئلة والأجوبة (عربي | English جنب بعض، اسحب لترتيبها، «صيغ أخرى» لتحسين الفهم)، والرد عند عدم وجود جواب. كل شيء مسودة حتى «نشر».

**الذكاء الاصطناعي (اختياري ومجاني):** للأسئلة غير الموجودة في القائمة. يجاوب من محتوى الموقع فقط، وإذا ما عرف يحوّل على واتساب. يشتغل فقط إذا أضفت مفتاحاً على Vercel:
1. **Gemini (Google):** ادخل https://aistudio.google.com/apikey بحساب جوجل ← Create API key ← انسخه. (بدون بطاقة)
   **أو Groq:** ادخل https://console.groq.com/keys ← Create API Key. (بدون بطاقة)
2. Vercel ← مشروع clearup ← Settings ← Environment Variables ← أضف `GEMINI_API_KEY` (أو `GROQ_API_KEY`) لبيئة Production ← Save.
3. Deployments ← Redeploy. بعدها أي سؤال مش موجود بالقائمة بيروح للذكاء الاصطناعي.
للإيقاف: احذف المفتاح، أو أطفئ «الذكاء الاصطناعي» من إعدادات الشات بوت.

**English (developer note):**
- Knowledge base lives in the site settings (`settings.chatbot`, edited in the admin; defaults in `src/content/chatbot.ts` until the first publish — no migration). Matching: `src/lib/chatbot.ts` (Arabic normaliser, dialect synonyms, light stemming, typo tolerance, IDF-weighted scoring; tests in `test/chatbot.test.mjs`).
- Widget: `src/components/chat/` — the button is tiny; the panel + matcher load on first hover/focus/tap. Fixed position (no layout shift), RTL/LTR, focus trap, Esc, `aria-live` log, full-screen sheet under 560px.
- AI mode: `POST /api/chat` (`src/app/api/chat/route.dyn.ts`, helpers in `src/lib/chat-ai.ts`). Needs `GEMINI_API_KEY` (preferred) or `GROQ_API_KEY`; optional `GEMINI_MODEL` / `GROQ_MODEL` (defaults: `gemini-flash-lite-latest` → `gemini-2.5-flash-lite` → `gemini-flash-latest`; `llama-3.3-70b-versatile` → `llama-3.1-8b-instant`; the next model is tried on 404/400/429). Grounded system prompt (site text + knowledge base, lines with `[placeholders]` left out), answers in the page language, `HANDOFF` → WhatsApp fallback. Limits per visitor IP: 10/min, 100/day, plus 1,500/day per server instance (in memory — best effort on serverless). Same-origin only. The key never reaches the browser; the page only learns "AI on/off".
- Free-tier terms (checked Nov 1 2026): Gemini API free ("unpaid") quota may be used for business apps in available regions (Palestine is listed), but Google may use the inputs/outputs to improve its products (human reviewers), so visitors shouldn't type personal data, and Google requires **paid** services when an app is offered to users in the EEA, Switzerland or the UK. Groq's Services Agreement lets you integrate it into your application for end users; free-tier limits apply.

## نموذج «احجز مكالمة» ← إيميل الأدمن · Contact form → admin email

**بالعربي:** لما الزائر يضغط «نعم، جاهز» ويعبّي النموذج (الاسم، الهاتف/واتساب، الإيميل، الشركة اختياري، الرسالة اختياري)، الرسالة بتوصل **إيميل مباشرة** على «إيميل استقبال الرسائل». موضوع الإيميل: «رسالة جديدة من موقع ClearUp — اسم الزائر»، وزر **Reply** بيرد على الزائر نفسه. ما في صندوق رسائل بالأدمن. لو الإرسال فشل لأي سبب، الزائر بيشوف رسالة لطيفة وزر واتساب فيه رسالته جاهزة، والرسالة كاملة بتنحفظ بسجل السيرفر (Vercel ← Logs) فما بتضيع.
الإرسال عن طريق **Resend** (مجاني: 100 إيميل باليوم و3,000 بالشهر، حسب صفحة أسعارهم في 1 نوفمبر 2026).

**التفعيل (مرة وحدة، 10 دقايق):**
1. **حساب Resend بنفس إيميل الأدمن اللي بده يستقبل الرسائل:** ادخل https://resend.com/signup وسجّل بهالإيميل (بدون بطاقة). مهم: قبل توثيق الدومين، Resend بيبعت بس على إيميل صاحب الحساب.
2. **مفتاح API:** Resend ← API Keys ← Create API Key ← الاسم `clearup-website`، الصلاحية **Sending access** ← Add ← انسخ المفتاح (بيبلش بـ `re_`، بيبين مرة وحدة بس).
3. **على الاستضافة** (Vercel: مشروع clearup ← Settings ← Environment Variables، أو Netlify: Site configuration ← Environment variables) أضف لبيئة Production:
   - `RESEND_API_KEY` = المفتاح
   - `CONTACT_TO` = إيميل الأدمن (احتياطي، لو خانة الأدمن فاضية)
   - (بعد توثيق الدومين فقط) `CONTACT_FROM` = `ClearUp <website@الدومين>`
4. **Redeploy:** Vercel ← Deployments ← آخر نسخة ← ⋯ ← Redeploy (المتغيرات الجديدة ما بتشتغل إلا بنسخة جديدة). Netlify: Deploys ← Trigger deploy.
5. **من الأدمن:** إعدادات الموقع ← التواصل ← «إيميل استقبال الرسائل» ← اكتب الإيميل ← نشر. (أو اضغط على النموذج نفسه بالمعاينة وبيفتحلك الخانة.) جرّب النموذج من الموقع.

**لاحقاً — توثيق الدومين** (عشان الإيميل يطلع باسم الشركة ويقدر يوصل لأي إيميل استقبال):
1. Resend ← Domains ← Add Domain ← اكتب الدومين (يفضل دومين فرعي مثل `mail.الدومين`).
2. Hostinger ← Domains ← الدومين ← DNS / Nameservers ← أضف السجلات اللي بيعرضها Resend **بالظبط** (بدون اسم الدومين بآخر الاسم):
   - `MX`  الاسم `send`  القيمة اللي بيعطيك ياها Resend (مثل `feedback-smtp.us-east-1.amazonses.com`)  الأولوية `10`
   - `TXT`  الاسم `send`  القيمة `v=spf1 include:amazonses.com ~all`
   - `TXT`  الاسم `resend._domainkey`  القيمة الطويلة `p=…` من Resend
   (لو استخدمت دومين فرعي مثل `mail`، الأسماء بتصير `send.mail` و `resend._domainkey.mail`.)
3. Resend ← Verify DNS Records (بياخد من دقايق لكم ساعة).
4. ضيف `CONTACT_FROM` على الاستضافة (مثلاً `ClearUp <website@mail.الدومين>`) ← Redeploy. هيك بتقدر تغيّر «إيميل استقبال الرسائل» لأي إيميل.

**English (developer note):**
- Form: `src/components/Final.tsx` (behind the «نعم، جاهز» gate, so the page's first paint is unchanged). Client + server share `validateContact` (`src/lib/contact.ts`): name, phone (7–15 digits), email required; company and message optional; length caps; control characters stripped.
- `POST /api/contact` (`src/app/api/contact/route.dyn.ts` → `handleContact`): same-origin only, 20 KB body cap; honeypot field `website` and a <1.5 s time-trap get a fake success (logged); then validation; per-IP limits (only valid messages count) 5/hour, 10/day, plus 90/day per server instance (in memory, best effort on serverless; Resend free is 100/day). Recipient = published `settings.contactTo` («إيميل استقبال الرسائل», validated as an email in the admin) else `CONTACT_TO`. Sends with Resend's HTTP API (`POST https://api.resend.com/emails`, `reply_to` = visitor, an idempotency key per visitor+message+minute so a double click sends once, 10 s timeout). `from` = `CONTACT_FROM` else `ClearUp Website <onboarding@resend.dev>` (Resend's test sender: delivers only to the Resend account owner's address).
- No key / no recipient / Resend error → `{ ok:false }` (503/502), the full submission is written to the server log (`[contact] NOT SENT …`), and the visitor gets the error text + a WhatsApp button pre-filled with what they typed.
- Env: `RESEND_API_KEY` (required to send), `CONTACT_TO` (fallback recipient), `CONTACT_FROM` (after domain verification). No database change: `contactTo` lives in `site_settings.data`, the new form texts in the final section's data (code defaults until the admin fills them).
- Tests: `test/contact.test.mjs` (validation, limits, email builder, mocked Resend call, the full flow).

## Going live on the official domain · الإطلاق على الدومين الرسمي

All SEO (sitemap, robots, canonical + hreflang, Open Graph/Twitter cards, JSON-LD, icons) is keyed off two env vars, so the switch is config only — no code change.

**What's already in the site**
- `/sitemap.xml` — `/ar/` + `/en/` (and any page the admin adds), `lastModified` from the last admin save, hreflang `ar` / `en` / `x-default`.
- `/robots.txt` — while `SEO_INDEXABLE` is not `true` (or the URL is a `*.vercel.app` / `*.netlify.app` / `*.pages.dev` / `*.sites.tab.bot` preview, or a Vercel preview build): `Disallow: /` **and** `<meta name="robots" content="noindex, nofollow">` on every page. With `SEO_INDEXABLE=true` on the real domain: allow all, disallow `/admin` + `/api/`, `Sitemap:` line.
- Per-language title/description from «إعدادات الموقع» → «محركات البحث» (fallbacks in `src/lib/seo.ts`), canonical, `<html lang dir>`, `metadataBase` = `NEXT_PUBLIC_SITE_URL`.
- Share cards: `/brand/og-ar.jpg`, `/brand/og-en.jpg` (1200×630, Thmanyah). An image uploaded in the CMS («صورة المشاركة») replaces both.
- JSON-LD on the homepage: `Organization` + `ProfessionalService` (name, logo, url, email, WhatsApp, city, `sameAs` = the socials in the CMS) and `WebSite`. Only data the admin entered — no ratings or invented address.
- `favicon.ico`, `apple-touch-icon.png`, `/manifest.webmanifest` (theme `#5B2096`).
- Code: `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/manifest.ts`.

**Checklist**
1. **Host env vars** (Vercel/Netlify → Project → Environment variables, Production):
   `NEXT_PUBLIC_SITE_URL=https://<domain>` (no trailing slash) and `SEO_INDEXABLE=true`. Redeploy (env vars apply only to new builds).
2. **Add the domain in the host.** Vercel: Project → Settings → Domains → add `<domain>` and `www.<domain>` (redirect www → apex). Netlify: Domain management → Add a domain. Then redirect the old `*.vercel.app` / `*.netlify.app` address to the domain (308) so there's only one copy.
3. **Hostinger DNS** (hPanel → Domains → `<domain>` → DNS / Nameservers → DNS records). Delete the parking `A` record for `@` and any `CNAME` for `www`, then add:
   - Vercel: `A  @  76.76.21.21` and `CNAME  www  cname.vercel-dns.com` (or exactly the values Vercel shows on the Domains page).
   - Netlify: `A  @  75.2.60.5` and `CNAME  www  <site-name>.netlify.app`.
   SSL is issued automatically once DNS resolves (minutes to a few hours).
4. **Admin + database** (host env vars, Production): `DATABASE_URL` (Neon pooled), `ADMIN_SESSION_SECRET`, `CLOUDINARY_URL` (+ `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` for the contact form — see above). Log in at `https://<domain>/admin/` and press «تنزيل نسخة احتياطية» once. (Nothing to configure for CORS or webhooks — the admin is part of the site.)
5. **Check:** `https://<domain>/robots.txt` shows `Allow: /` + the `Sitemap:` line; `https://<domain>/sitemap.xml` lists `https://<domain>/ar/` and `/en/`; view-source of `/ar/` has **no** `noindex` and the canonical is `https://<domain>/ar/`. Share the link in WhatsApp to see the card.
6. **Google Search Console** (search.google.com/search-console): Add property → **Domain** → `<domain>` → copy the `TXT` record → add it in Hostinger DNS (`TXT  @  google-site-verification=…`) → Verify. Then Sitemaps → submit `sitemap.xml`; URL Inspection → `https://<domain>/ar/` and `/en/` → Request indexing.

## English

**Stack:** Next.js 16 (App Router; static export only with `STATIC_EXPORT=1`), React 19, a custom Arabic admin at `/admin` (Postgres/Neon via Drizzle, Cloudinary), TypeScript, plain CSS (one `globals.css` with design tokens and logical properties — RTL/LTR from the same CSS). No three.js, no GSAP / no scroll library: motion is CSS + one shared IntersectionObserver + rAF-throttled scroll readers.

**Font (v2):** **Thmanyah Sans** (ثمانية) — the face Takwer Growth (takwer.com/growth) uses, self-hosted via `@font-face` in `globals.css` (400 / 500 / 700 / 900; 600 maps to Bold). Licence (font.thmanyah.com/licenses): free for personal and commercial use incl. websites and apps; **no redistribution** and the files may only be downloaded from font.thmanyah.com — so the `.woff2` files are git-ignored. Download the family from https://font.thmanyah.com and copy `thmanyahsans-{Regular,Medium,Bold,Black}.woff2` into `public/fonts/thmanyah/`. Headings use the font's swash set `font-feature-settings: 'ss01'` («الحروف المرسلة»), the same feature Takwer turns on, which gives the long-tailed ي/ك/ق look. Body text stays plain. Fallback stack: IBM Plex Sans Arabic → Segoe UI → system-ui. Arabic body line-height 1.75; display weight 900. The site previously used Alexandria (Google Fonts).

**Structure**
```
src/app/[lang]/        layout (html lang/dir per locale) + page (all sections)
src/content/ar.ts|en.ts  all copy (Arabic is the source shape); placeholders in [brackets]
src/components/        one file per section (Hero, System, Results, Audit, Stories, …)
src/components/Hero.tsx + HeroMotion.tsx   the v3 hero (layered CSS-3D logo + CSS timeline, ~1 KB JS)
src/lib/logo.ts        the ClearUp mark traced as SVG paths (700×700 grid) + brand colours
public/media/          founder frame + testimonial posters/videos (from @clearup.agency, public)
docs/                  competitor report, design note, screenshots, walkthrough video
```

**Hero v3 — the layered mark** (Oct 31 2026, on Mohamed's 10:34 PM feedback: keep the Thmanyah headline + word rise + «تصاميم» strike; drop the growth line). Same headline animation as v2. Beside it (above the headline on phones) the real ClearUp mark is built as a physical object from 4 stacked CSS-3D layers: the back slab (#8750A5) and the front slab (#5B2096), each with a darker edge copy for thickness, plus the white up-right arrow as a raised piece, with a soft floor shadow. Straight-on the layers line up into the exact logo; a resting tilt and the pointer separate them.
- Entrance (timed with the strike): back slab slides in and settles at 0.42 s, front slab at 0.66 s, then the arrow launches up-right once at 1.42 s with a small overshoot. Idle: 7 s float (shadow breathes with it) + tilt toward the mouse on desktop; on phones a little tilt with scroll, and device tilt where the browser gives it without a permission prompt.
- CSS 3D transforms + keyframes, inline SVG paths (`BACK_FULL`, `FRONT_FULL`, `ARROW` in `Hero.tsx`); `HeroMotion.tsx` (~1 KB) adds the start class, the rAF-throttled tilt vars and an IntersectionObserver that pauses the float offscreen. No canvas, no WebGL, no library.
- Without JS or with `prefers-reduced-motion` the final frame renders (it is the SSR markup); the mark has a fixed size, so no CLS.
- v2 (the growth line) is in git history at 64895857e379b5a41061735ada8c70c578a68c12; the three.js tile hero at 7068b43c6ff3414545f8f62a780151f1591ed991.

**Hero v2 — “the line”** (replaced by v3) (replaced the three.js tile logo on Mohamed's feedback, Oct 31 2026). Giant Thmanyah Black headline across the page; the words rise in one by one from a mask, then a purple bar strikes through «تصاميم / designs». Under it one SVG growth line: a noisy grey zig-zag (the chaos chips — «بوستات بلا خطة», «إعلانات عشوائية»… — flicker in on it) that turns into a single thick purple diagonal shooting up-right and ending in the ClearUp arrow at «الوضوح / Clarity», pointing at the CTA. Timeline ≈2.8 s, starts after `document.fonts.ready`; while the hero scrolls away the line drifts a few px up-right.
- Pure SVG (`pathLength=1` + `stroke-dashoffset`) + CSS keyframes; `HeroMotion.tsx` only adds a class and a passive rAF scroll var. No canvas, no WebGL, no library.
- Without JS or with `prefers-reduced-motion` the final frame is what renders (it is also the SSR markup) — no hidden content, no CLS.
- Phones: the line sits above the copy; only 2 chaos chips are shown.
- The previous three.js hero lives in git history (commit 7068b43c6ff3414545f8f62a780151f1591ed991).

**Lighthouse (mobile, published preview, Oct 31 2026, after hero v2 + Thmanyah Sans + UI pass):**
- `/ar/`: **Performance 91 / 94** (two runs, after the UI pass) · Accessibility 100 · Best Practices 100 · SEO 100 · LCP 2.9–3.2 s · TBT 70–80 ms · CLS 0.
- `/en/`: **Performance 94** · 100 · 100 · 100 · LCP 2.9 s · TBT 80 ms · CLS 0.
- The motion has no separate switch to measure: it is CSS + ~1 KB of JS. LCP is the headline itself and is counted when the word reveal finishes, after the font loads (the Black + Regular weights are preloaded, ~155 KB). For the old three.js hero it was 99 with the 3D turned off and 78 with it on.

**UI pass v2 (Oct 31 2026, on Mohamed's notes; content and section order unchanged):**
1. Sticky header: logo, 4 links, one primary «احجز مكالمة» button. Every section CTA uses the same system: `.btn` primary (purple), `.btn--ghost` secondary, and `.btn--light`/`.btn--line` only inside the purple booking card.
2. Contrast: light text on dark is now at least 78% white, the hero chaos chips are ink at 62%, and Lighthouse/axe colour-contrast passes (Accessibility 100).
3. Design system: tokens `--sec` (section spacing, more whitespace), `--r-card`/`--r-media` (one leaf radius), `--pad-card`, `--gap-card`, and one `.card` style (white, 1px line, same radius and padding) used for the quiz, the result cases, the testimonials and the dashboard radius. Body text is 17px, H2s are weight 800 and the hero H1 is about 5–8× body.
4. Fewer dark sections: only the Clear Up System and the footer are dark now. Testimonials moved to a light section. The final CTA is an inset purple card on paper, so purple no longer runs straight into the black footer.
5. Testimonials: one large featured story (poster, name, role, quote placeholder, «شاهد الفيديو») plus 3 smaller cards. Each video opens in a `<dialog>` modal (the local mp4 in the full build, the Instagram embed in the light preview).
6. RTL numbers: every figure is an LTR-isolated `.num`, so 8× / 2000+ / 2M+ / $360K read the same in Arabic and English. Inline Arabic multipliers became words («8 أضعاف»).
7. Purple only where it matters: buttons, the hero line, key accents and the System. Section labels, indices, list markers and FAQ icons moved to ink/grey.

**Motion rules:** one direction — everything that "improves" moves up-right (the logo arrow), in both languages. Motion only where it means something (chaos → order, stages lighting up, the curve drawing itself). Never split Arabic text into letters. Everything respects `prefers-reduced-motion`.

**Placeholders policy:** no invented numbers. Figures tagged “من موقعهم*/their site*” come from clearupagency.com and need confirming; “IG” tags come from ClearUp’s Instagram captions; dashed/striped `[…]` are blanks. The dashboard curve is labelled as an illustrative shape, not data. The booking form is a demo and sends nothing.

**Production notes:** add a case-study section type to the admin (client, sector, problem, what we built, before/after, period, video); host videos on Mux/Cloudinary with posters; add GA4 + Meta Pixel events (WhatsApp click, booking start, audit complete); wire the form to Cal.com/Calendly + WhatsApp prefilled text; per-locale OG images.
