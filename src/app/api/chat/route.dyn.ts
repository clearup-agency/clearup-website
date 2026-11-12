import { NextResponse } from 'next/server';
import { buildView, fetchRaw } from '@/lib/cms';
import { kbText } from '@/lib/chatbot';
import { candidates } from '@/admin/inspect';
import { cleanAnswer, makeLimiter, provider, systemPrompt, type Turn } from '@/lib/chat-ai';

/* POST /api/chat — the chatbot's optional AI mode (see src/lib/chat-ai.ts). Only for questions the knowledge
   base couldn't answer; the content comes from the same cache as the pages (no database query per message).
   Every failure answers { ok: false } and the widget falls back to WhatsApp / the knowledge base. */

export const dynamic = 'force-dynamic';
const limit = makeLimiter(10, 100, 1500);
const no = (reason: string, status = 200) => NextResponse.json({ ok: false, reason }, { status, headers: { 'cache-control': 'no-store' } });

function sameSite(req: Request) {
  const o = req.headers.get('origin');
  if (!o) return true;
  try { return new URL(o).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host')); } catch { return false; }
}

export async function POST(req: Request) {
  if (!sameSite(req)) return no('forbidden', 403);
  const ai = provider();
  if (!ai) return no('off');
  const b = await req.json().catch(() => null);
  const q = typeof b?.q === 'string' ? b.q.trim().slice(0, 300) : '';
  const lang = b?.lang === 'en' ? 'en' : 'ar';
  if (!q) return no('empty', 400);
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  const lim = limit(ip);
  if (!lim.ok) return no('rate_' + lim.reason, 429);

  const raw = await fetchRaw();
  const view = buildView(raw, lang);
  if (!view.chatbot.enabled || !view.chatbot.ai) return no('off');
  // the site's own words: the knowledge base, contact details, then every visible text of the page
  const site = view.settings;
  const texts = new Set<string>();
  for (const sec of ((raw.page?.sections ?? []) as Record<string, unknown>[]).filter((s) => !s?.hidden)) {
    for (const c of candidates(sec, lang)) if (c.text && !/\[[^\]]*\]/.test(c.text)) texts.add(c.text); // a line with a [placeholder] is not a confirmed fact
  }
  const context = [
    'KNOWLEDGE BASE:', kbText(view.chatbot), '',
    'CONTACT:', `Email: ${site.email ?? ''}`, `WhatsApp: ${view.chatbot.whatsapp ? 'yes (button in the chat)' : 'no'}`, `Location: ${site.city ?? ''}`, '',
    'WEBSITE TEXT:', [...texts].join('\n'),
  ].join('\n').slice(0, 14000);

  const history: Turn[] = (Array.isArray(b?.history) ? b.history : []).slice(-6)
    .filter((h: Turn) => (h?.role === 'user' || h?.role === 'bot') && typeof h.text === 'string')
    .map((h: Turn) => ({ role: h.role, text: h.text.slice(0, 600) }));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await ai.ask({ system: systemPrompt(lang, context), history, q, signal: ctl.signal });
    if (r.status === 429) return no('quota');
    const text = cleanAnswer(r.text);
    if (!text) return no(r.text ? 'handoff' : 'error');
    return NextResponse.json({ ok: true, answer: text, handoff: /واتساب|whatsapp/i.test(text) }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return no('error');
  } finally {
    clearTimeout(timer);
  }
}
