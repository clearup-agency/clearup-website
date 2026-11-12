/* The «احجز مكالمة» / contact form: what a visitor sends goes straight to the admin's inbox as an email
   (Resend's HTTP API, free tier). No database, no inbox in the admin. Pure code here (validation, the email,
   the Resend call, the whole request flow), so it is tested without Next.js; the route is
   src/app/api/contact/route.dyn.ts and the form is src/components/Final.tsx.

   Receiving address: «إيميل استقبال الرسائل» in site settings (published), else env CONTACT_TO.
   Sender: env CONTACT_FROM (an address on a domain verified in Resend), else Resend's test sender
   onboarding@resend.dev — which only delivers to the email the Resend account was created with. */

export type ContactLang = 'ar' | 'en';
export type ContactInput = { name: string; phone: string; email: string; company: string; message: string };
export type FieldError = 'required' | 'short' | 'long' | 'email' | 'phone';
export type Checked = { ok: true; value: ContactInput } | { ok: false; errors: Partial<Record<keyof ContactInput, FieldError>> };

export const LIMITS = { name: 100, phone: 30, email: 200, company: 120, message: 2000 } as const;
export const DEFAULT_FROM = 'ClearUp Website <onboarding@resend.dev>';
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max + 1);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
export const isEmail = (s: string) => EMAIL.test(s) && s.length <= LIMITS.email;
export const phoneDigits = (s: string) => s.replace(/[^\d]/g, '');

/** The same checks run in the browser (instant messages) and on the server (the only ones that count). */
export function validateContact(raw: unknown): Checked {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const v: ContactInput = {
    name: oneLine(clean(b.name, LIMITS.name)),
    phone: oneLine(clean(b.phone, LIMITS.phone)),
    email: oneLine(clean(b.email, LIMITS.email)).toLowerCase(),
    company: oneLine(clean(b.company, LIMITS.company)),
    message: clean(b.message, LIMITS.message).replace(/\r\n?/g, '\n').replace(/\n{4,}/g, '\n\n\n'),
  };
  const e: Partial<Record<keyof ContactInput, FieldError>> = {};
  if (!v.name) e.name = 'required'; else if (v.name.length < 2) e.name = 'short'; else if (v.name.length > LIMITS.name) e.name = 'long';
  const digits = phoneDigits(v.phone);
  if (!v.phone) e.phone = 'required'; else if (digits.length < 7 || digits.length > 15 || !/^[+\d\s\-().]+$/.test(v.phone)) e.phone = 'phone';
  // the email is optional (WhatsApp / phone is enough for most visitors); a typed one must be valid
  if (v.email && !isEmail(v.email)) e.email = 'email';
  if (v.company.length > LIMITS.company) e.company = 'long';
  if (v.message.length > LIMITS.message) e.message = 'long';
  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, value: v };
}

/** Words the form shows that are not editable content (validation), per language. */
export const FORM_TEXT = {
  ar: {
    required: 'هذا الحقل مطلوب', short: 'قصير جداً', long: 'طويل جداً', email: 'اكتب إيميلاً صحيحاً، مثل name@company.com',
    phone: 'اكتب رقماً صحيحاً (أرقام فقط، مع رمز الدولة إن أمكن)', optional: 'اختياري',
  },
  en: {
    required: 'This field is required', short: 'Too short', long: 'Too long', email: 'Enter a valid email, like name@company.com',
    phone: 'Enter a valid number (digits, ideally with the country code)', optional: 'optional',
  },
} as const;

/** Editable texts of the form that older saved content doesn't have yet: the site shows these until the admin
 *  fills the field (and the admin panel says so). */
export const FORM_DEFAULTS = {
  ar: {
    email: 'الإيميل', message: 'رسالتك', sending: 'جاري الإرسال…',
    success: 'وصل طلبك، رح نتواصل معك قريباً',
    error: 'تعذّر إرسال رسالتك الآن. راسلنا مباشرة على واتساب وسنرد عليك.',
    errorWhatsapp: 'أرسلها على واتساب',
  },
  en: {
    email: 'Email', message: 'Your message', sending: 'Sending…',
    success: 'Got it — we’ll be in touch soon.',
    error: 'We couldn’t send your message right now. Message us on WhatsApp instead and we’ll reply.',
    errorWhatsapp: 'Send it on WhatsApp',
  },
} as const;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A WhatsApp link for the visitor's number when it is written internationally (+970…, 00970…). */
export function visitorWhatsApp(phone: string): string | null {
  const p = phone.trim();
  if (!/^(\+|00)/.test(p)) return null;
  const d = phoneDigits(p).replace(/^00/, '');
  return d.length >= 8 && d.length <= 15 ? 'https://wa.me/' + d : null;
}

export type Mail = { subject: string; html: string; text: string };

/** The email the admin receives: Arabic, right-to-left, Reply goes to the visitor. */
export function buildContactEmail(v: ContactInput, meta: { lang: ContactLang; page?: string; when?: Date } = { lang: 'ar' }): Mail {
  const when = meta.when ?? new Date();
  const time = new Intl.DateTimeFormat('ar', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Hebron' }).format(when);
  const subject = `رسالة جديدة من موقع ClearUp — ${oneLine(v.name).slice(0, 80)}`;
  const wa = visitorWhatsApp(v.phone);
  const tel = 'tel:' + v.phone.replace(/[^\d+]/g, '');
  const rows: [string, string][] = [
    ['الاسم', esc(v.name)],
    ['الهاتف / واتساب', `<a href="${esc(tel)}" style="color:#5B2096;direction:ltr;unicode-bidi:embed">${esc(v.phone)}</a>`],
    ['الإيميل', v.email ? `<a href="mailto:${esc(v.email)}" style="color:#5B2096;direction:ltr;unicode-bidi:embed">${esc(v.email)}</a>` : '<span style="color:#8a8496">— (لم يكتب إيميلاً، تواصل عبر الهاتف / واتساب)</span>'],
    ['الشركة', v.company ? esc(v.company) : '<span style="color:#8a8496">—</span>'],
  ];
  const msg = v.message ? esc(v.message).replace(/\n/g, '<br>') : '<span style="color:#8a8496">(بدون رسالة)</span>';
  const btn = (href: string, label: string, solid: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 0 8px 8px;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none;${solid ? 'background:#5B2096;color:#ffffff' : 'background:#ffffff;color:#5B2096;border:1.5px solid #5B2096'}">${label}</a>`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f0f8">
<div dir="rtl" style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#1d1530;text-align:right">
  <div style="background:#5B2096;color:#ffffff;border-radius:24px 0 24px 0;padding:24px 28px">
    <div style="font-size:13px;opacity:.8">موقع ClearUp · نموذج «احجز مكالمة»</div>
    <div style="font-size:22px;font-weight:700;margin-top:6px">رسالة جديدة من ${esc(v.name)}</div>
  </div>
  <div style="background:#ffffff;border-radius:16px;margin-top:12px;padding:8px 28px">
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows.map(([k, val]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eee8f5;color:#6b6280;width:130px;vertical-align:top">${k}</td><td style="padding:12px 0;border-bottom:1px solid #eee8f5;font-weight:600">${val}</td></tr>`).join('\n      ')}
    </table>
    <div style="padding:16px 0 8px;color:#6b6280;font-size:14px">الرسالة</div>
    <div dir="auto" style="padding:0 0 20px;font-size:15px;line-height:1.8;white-space:normal">${msg}</div>
  </div>
  <div style="margin-top:16px">
    ${v.email ? btn('mailto:' + v.email + '?subject=' + encodeURIComponent('رد من ClearUp'), 'رد بالإيميل', true) : ''}${wa ? btn(wa, 'رد على واتساب', !v.email) : btn(tel, 'اتصل', !v.email)}
  </div>
  <p style="font-size:12px;color:#8a8496;line-height:1.7;margin-top:16px">${v.email ? 'اضغط «Reply» بالإيميل ليصل ردك للزائر مباشرة. ' : ''}أُرسلت من صفحة ${meta.lang === 'en' ? 'الإنجليزية' : 'العربية'} للموقع${meta.page ? ` (${esc(meta.page)})` : ''} · ${esc(time)}</p>
</div></body></html>`;
  const text = [
    `رسالة جديدة من موقع ClearUp`,
    ``,
    `الاسم: ${v.name}`,
    `الهاتف / واتساب: ${v.phone}`,
    `الإيميل: ${v.email || '—'}`,
    `الشركة: ${v.company || '—'}`,
    ``,
    `الرسالة:`,
    v.message || '(بدون رسالة)',
    ``,
    `—`,
    `${v.email ? 'اضغط Reply ليصل ردك للزائر مباشرة. ' : 'تواصل مع الزائر عبر الهاتف / واتساب. '}من الصفحة ${meta.lang === 'en' ? 'الإنجليزية' : 'العربية'} · ${time}`,
  ].join('\n');
  return { subject, html, text };
}

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

/** One email through Resend's HTTP API (POST https://api.resend.com/emails). */
export async function sendViaResend(o: { apiKey: string; from: string; to: string; replyTo?: string; mail: Mail; idempotencyKey?: string; fetchImpl?: Fetch; baseUrl?: string; timeoutMs?: number }): Promise<{ ok: true; id?: string } | { ok: false; status: number; error: string }> {
  const f = (o.fetchImpl ?? (fetch as unknown as Fetch));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 10_000);
  try {
    const r = await f(`${o.baseUrl ?? 'https://api.resend.com'}/emails`, {
      method: 'POST', signal: ctl.signal,
      headers: {
        authorization: `Bearer ${o.apiKey}`, 'content-type': 'application/json',
        ...(o.idempotencyKey ? { 'idempotency-key': o.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: o.from, to: [o.to], ...(o.replyTo ? { reply_to: o.replyTo } : {}), subject: o.mail.subject, html: o.mail.html, text: o.mail.text }),
    });
    const body = await r.text().catch(() => '');
    if (!r.ok) return { ok: false, status: r.status, error: body.slice(0, 500) };
    let id: string | undefined;
    try { id = JSON.parse(body)?.id; } catch { /* a 2xx without JSON still went out */ }
    return { ok: true, id };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).name === 'AbortError' ? 'timeout' : String((err as Error).message ?? err).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

/** Per-visitor limits, kept in this server instance's memory (best effort on serverless: each instance counts on its own). */
export function makeLimiter(perHour = 5, perDay = 10, globalPerDay = 90) {
  const hits = new Map<string, number[]>();
  let day = '', total = 0;
  return (key: string, now = Date.now()): { ok: true } | { ok: false; reason: 'hour' | 'day' | 'global' } => {
    const d = new Date(now).toISOString().slice(0, 10);
    if (d !== day) { day = d; total = 0; hits.clear(); }
    if (total >= globalPerDay) return { ok: false, reason: 'global' };
    const list = (hits.get(key) ?? []).filter((t) => now - t < 86_400_000);
    if (list.length >= perDay) return { ok: false, reason: 'day' };
    if (list.filter((t) => now - t < 3_600_000).length >= perHour) return { ok: false, reason: 'hour' };
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
    total++;
    return { ok: true };
  };
}

export type ContactResult =
  | { status: 200; body: { ok: true } }
  | { status: 400; body: { ok: false; reason: 'invalid'; errors: Partial<Record<keyof ContactInput, FieldError>> } }
  | { status: 429; body: { ok: false; reason: 'rate' } }
  | { status: 200 | 502 | 503; body: { ok: false; reason: 'not_configured' | 'send_failed' } };

type Log = (msg: string, data?: Record<string, unknown>) => void;

/** The whole request: honeypot → validation → limits → recipient → email → Resend. Never loses a message
 *  silently: when it can't be emailed, the full submission goes to the server log and the visitor is told
 *  to use WhatsApp. */
export async function handleContact(body: unknown, ctx: {
  ip: string; env: Record<string, string | undefined>; contactTo?: string; limiter: ReturnType<typeof makeLimiter>;
  fetchImpl?: Fetch; now?: number; log?: Log;
}): Promise<ContactResult> {
  const log: Log = ctx.log ?? ((m, d) => console.error('[contact] ' + m, d ? JSON.stringify(d) : ''));
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const lang: ContactLang = b.lang === 'en' ? 'en' : 'ar';
  // bots: a hidden field people never see, or a form sent faster than a person can type → pretend it worked
  const elapsed = Number(b.t);
  if ((typeof b.website === 'string' && b.website.trim()) || (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 1500)) {
    const hp = !!(typeof b.website === 'string' && b.website.trim());
    // a real person who was just very fast is still recoverable from the log
    log('dropped (bot check)', { ip: ctx.ip, honeypot: hp, elapsed, ...(hp ? {} : { name: String(b.name ?? '').slice(0, 100), phone: String(b.phone ?? '').slice(0, 30), email: String(b.email ?? '').slice(0, 200) }) });
    return { status: 200, body: { ok: true } };
  }
  const c = validateContact(b);
  if (!c.ok) return { status: 400, body: { ok: false, reason: 'invalid', errors: c.errors } };
  // only messages that would really be sent count towards the limits
  const lim = ctx.limiter(ctx.ip, ctx.now);
  if (!lim.ok) {
    log('NOT SENT — rate limited (' + lim.reason + '); submission kept here:', { ip: ctx.ip, ...c.value, lang });
    return { status: 429, body: { ok: false, reason: 'rate' } };
  }
  const v = c.value;
  const to = [ctx.contactTo, ctx.env.CONTACT_TO].map((x) => (x ?? '').trim()).find((x) => isEmail(x));
  const key = ctx.env.RESEND_API_KEY?.trim();
  if (!to || !key) {
    log('NOT SENT — email not configured (' + (!key ? 'RESEND_API_KEY missing' : 'no receiving address') + '). Submission kept here:', { ...v, lang });
    return { status: 503, body: { ok: false, reason: 'not_configured' } };
  }
  const mail = buildContactEmail(v, { lang, page: typeof b.page === 'string' ? b.page.slice(0, 120) : undefined, when: new Date(ctx.now ?? Date.now()) });
  const from = ctx.env.CONTACT_FROM?.trim() || DEFAULT_FROM;
  // the same visitor pressing send twice within a minute → Resend sends one email
  const idem = 'cu-' + hash([v.email, v.phone, v.message, Math.floor((ctx.now ?? Date.now()) / 60_000)].join('|'));
  const r = await sendViaResend({ apiKey: key, from, to, replyTo: v.email || undefined, mail, idempotencyKey: idem, fetchImpl: ctx.fetchImpl, baseUrl: ctx.env.RESEND_BASE_URL || undefined });
  if (!r.ok) {
    log('NOT SENT — Resend answered ' + r.status + ': ' + r.error + ' — submission kept here:', { ...v, lang });
    return { status: 502, body: { ok: false, reason: 'send_failed' } };
  }
  return { status: 200, body: { ok: true } };
}

function hash(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 + c, 2246822519); }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}
