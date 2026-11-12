/* The chatbot's optional AI mode (free tiers: Google AI Studio «Gemini» or Groq). Off unless the server has
   GEMINI_API_KEY or GROQ_API_KEY. The model sees only the site's own words (knowledge base + page text) and
   is told to answer from them alone; anything else → "HANDOFF" → the widget shows the WhatsApp fallback.
   Pure helpers here (prompt, limiter, provider calls); the route is src/app/api/chat/route.dyn.ts. */

import type { BotLang } from './chatbot';

export type Turn = { role: 'user' | 'bot'; text: string };
export const HANDOFF = 'HANDOFF';

export function systemPrompt(lang: BotLang, context: string): string {
  const L = lang === 'ar' ? 'Arabic (Modern Standard, warm and simple)' : 'English';
  return [
    'You are the website assistant of Clear Up, a business development and innovative marketing company from Gaza. You chat with visitors of its website.',
    'Answer ONLY from the CONTEXT below (the website\'s own content). Do not use outside knowledge.',
    'Never invent prices, numbers, client names, durations, response times, guarantees, discounts or promises that are not written in the CONTEXT.',
    'Text in square brackets in the CONTEXT (like [name]) is a placeholder, not a fact: never repeat it.',
    `If the CONTEXT does not answer the question, or the question is not about ClearUp, its services or working with it, reply with exactly: ${HANDOFF}`,
    `Reply in ${L}, whatever language the question is in. Keep it short: at most 3 sentences, plain text, no markdown, no lists, no links.`,
    'Be friendly and direct. When it helps, suggest booking the free clarity call or messaging the team on WhatsApp.',
    '',
    'CONTEXT:',
    context,
  ].join('\n');
}

/** Per-visitor limits, kept in this server instance's memory (best effort: each instance counts on its own). */
export function makeLimiter(perMinute = 10, perDay = 100, globalPerDay = 1500) {
  const hits = new Map<string, number[]>();
  let day = '', total = 0;
  return (key: string, now = Date.now()): { ok: true } | { ok: false; reason: 'minute' | 'day' | 'global' } => {
    const d = new Date(now).toISOString().slice(0, 10);
    if (d !== day) { day = d; total = 0; hits.clear(); }
    if (total >= globalPerDay) return { ok: false, reason: 'global' };
    const list = (hits.get(key) ?? []).filter((t) => now - t < 86_400_000);
    if (list.length >= perDay) return { ok: false, reason: 'day' };
    if (list.filter((t) => now - t < 60_000).length >= perMinute) return { ok: false, reason: 'minute' };
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
    total++;
    return { ok: true };
  };
}

/** Cleans what the model said: one short plain answer, or null when it handed off / said nothing useful. */
export function cleanAnswer(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const t = s.replace(/\*\*|__|#+\s|`/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!t || t.toUpperCase().includes(HANDOFF) || /\[[^\]]{1,60}\]/.test(t)) return null;
  return t.slice(0, 900);
}

type Call = { system: string; history: Turn[]; q: string; signal: AbortSignal };
export type Provider = { name: 'gemini' | 'groq'; ask: (c: Call) => Promise<{ text?: string; status: number }> };

export function provider(env: Record<string, string | undefined> = process.env): Provider | null {
  if (env.GEMINI_API_KEY) {
    const key = env.GEMINI_API_KEY;
    // flash-lite first: the free tier gives it far more requests a day than flash (each model has its own quota)
    const models = [env.GEMINI_MODEL || 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
    return {
      name: 'gemini',
      ask: async ({ system, history, q, signal }) => {
        let status = 0;
        for (const m of [...new Set(models)]) {
          const r = await fetch(`${env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
            method: 'POST', signal,
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key, ...(env.GEMINI_BASE_URL ? { authorization: `Bearer ${key}` } : {}) },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: q }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
            }),
          });
          status = r.status;
          if (r.status === 404 || r.status === 400 || r.status === 429) continue; // retired, or its free quota is used up → the next model
          if (!r.ok) return { status };
          const d = await r.json();
          return { status, text: (d?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('') };
        }
        return { status };
      },
    };
  }
  if (env.GROQ_API_KEY) {
    const key = env.GROQ_API_KEY;
    const models = [env.GROQ_MODEL || 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    return {
      name: 'groq',
      ask: async ({ system, history, q, signal }) => {
        let status = 0;
        for (const m of [...new Set(models)]) {
          const r = await fetch(`${env.GROQ_BASE_URL || 'https://api.groq.com'}/openai/v1/chat/completions`, {
            method: 'POST', signal,
            headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
            body: JSON.stringify({
              model: m, temperature: 0.2, max_tokens: 400,
              messages: [{ role: 'system', content: system }, ...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })), { role: 'user', content: q }],
            }),
          });
          status = r.status;
          if (r.status === 404 || r.status === 400 || r.status === 429) continue;
          if (!r.ok) return { status };
          const d = await r.json();
          return { status, text: d?.choices?.[0]?.message?.content };
        }
        return { status };
      },
    };
  }
  return null;
}
