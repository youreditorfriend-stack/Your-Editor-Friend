// POST /api/chat — AI assistant backend.
//
// This file is the AI Router + provider layer. The rest of the app only ever
// POSTs to this endpoint (via src/lib/aiService.ts) and receives a plain UTF-8
// text stream — it never knows or chooses which provider answered.
//
//   AIRouter        — inspects the request and picks a provider per task.
//   GeminiProvider  — Google Gemini (DEFAULT for text + image/vision tasks).
//   OpenAIProvider  — used only for video / complex creative reasoning tasks.
//   KnowledgeService— pulls live business data from Firebase (never invented).
//
// Providers and their routing are chosen from environment variables, so a new
// provider (e.g. Claude) can be added without touching the rest of the project.
// Everything is inlined in ONE file on purpose: Vercel serverless functions
// can't resolve extensionless sibling imports at runtime (see youtube-stats.ts).
//
// API keys live ONLY here in the serverless runtime — never in the browser.

// ─── Config (env-driven, never hardcoded) ──────────────────────────────────
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0681082317';

// Which provider handles which task. Overridable per-task via env; defaults
// keep Gemini as the default brain and OpenAI for heavy multimodal reasoning.
const ROUTES: Record<TaskKind, string> = {
  text: (process.env.AI_PROVIDER_TEXT || 'gemini').toLowerCase(),
  vision: (process.env.AI_PROVIDER_VISION || 'gemini').toLowerCase(),
  video: (process.env.AI_PROVIDER_VIDEO || 'openai').toLowerCase(),
};

type TaskKind = 'text' | 'vision' | 'video';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
interface InlineImage {
  mimeType: string;
  data: string; // base64 (no data: prefix)
}
interface ChatRequest {
  messages: ChatTurn[];
  answers?: Record<string, string>;
  images?: InlineImage[];
  videoUrl?: string;
}

interface Provider {
  isConfigured(): boolean;
  stream(args: {
    system: string;
    messages: ChatTurn[];
    images?: InlineImage[];
    onToken: (t: string) => void;
  }): Promise<void>;
}

// ─── KnowledgeService — live business data from Firebase ────────────────────
// store/data is publicly readable (firestore.rules), so we can fetch it over
// the Firestore REST API without any credentials, and cache it briefly.
let knowledgeCache: { text: string; ts: number } | null = null;
const KNOWLEDGE_TTL = 5 * 60 * 1000;

function unwrap(v: any): any {
  if (v == null) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(unwrap);
  if (v.mapValue !== undefined) {
    const o: any = {};
    const f = v.mapValue.fields || {};
    for (const k in f) o[k] = unwrap(f[k]);
    return o;
  }
  return null;
}

function priceLabel(p: any): string {
  const n = Number(p?.price ?? 0);
  return p?.free || n === 0 ? 'Free' : `₹${n}`;
}

async function getKnowledge(): Promise<string> {
  if (knowledgeCache && Date.now() - knowledgeCache.ts < KNOWLEDGE_TTL) {
    return knowledgeCache.text;
  }
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/store/data`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Firestore ${r.status}`);
    const json = await r.json();
    const d: any = {};
    const f = json.fields || {};
    for (const k in f) d[k] = unwrap(f[k]);

    const products: any[] = Array.isArray(d.products) ? d.products : [];
    const courses: any[] = Array.isArray(d.courses) ? d.courses : [];
    const pages: any[] = Array.isArray(d.pages) ? d.pages : [];

    const sections: string[] = [];

    const liveProducts = products.filter((p) => p?.enabled !== false);
    if (liveProducts.length) {
      sections.push(
        'PRODUCTS / SERVICES:\n' +
          liveProducts
            .map((p) => `- ${p.name}: ${priceLabel(p)}${p.tagline ? ` — ${p.tagline}` : ''}`)
            .join('\n')
      );
    }

    const liveCourses = courses.filter((c) => c?.enabled !== false);
    if (liveCourses.length) {
      sections.push(
        'COURSES:\n' +
          liveCourses
            .map((c) => `- ${c.title}: ${priceLabel(c)}${c.tagline ? ` — ${c.tagline}` : ''}`)
            .join('\n')
      );
    }

    // FAQs collected from products/courses detail content
    const faqs: string[] = [];
    [...liveProducts, ...liveCourses].forEach((it) => {
      (Array.isArray(it.faq) ? it.faq : []).forEach((q: any) => {
        if (q?.q && q?.a) faqs.push(`- Q: ${q.q}\n  A: ${q.a}`);
      });
    });
    if (faqs.length) sections.push('FAQs:\n' + faqs.slice(0, 12).join('\n'));

    if (pages.length) {
      const enabled = pages.filter((p) => p?.enabled !== false).map((p) => p.id).filter(Boolean);
      if (enabled.length) sections.push(`AVAILABLE SECTIONS: ${enabled.join(', ')}`);
    }

    const text = sections.length
      ? sections.join('\n\n')
      : '(No catalogue data found — do not invent services or prices.)';
    knowledgeCache = { text, ts: Date.now() };
    return text;
  } catch (e) {
    console.error('KnowledgeService failed:', e);
    return '(Business catalogue is temporarily unavailable — do not invent services or prices; guide the visitor to WhatsApp for exact details.)';
  }
}

// ─── Prompt Builder — the assistant's persona + knowledge ───────────────────
function buildSystemPrompt(knowledge: string, answers?: Record<string, string>): string {
  const known =
    answers && Object.keys(answers).length
      ? '\n\nWhat the visitor has already shared:\n' +
        Object.entries(answers)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')
      : '';

  return [
    `You are Janish's personal AI Assistant for "Your Editor Friend" (youreditorfriend.in), a video-editing studio run by Janish Prabu.`,
    `You are NOT a generic chatbot. You act as a business assistant, mentor, consultant and support executive.`,
    ``,
    `How you behave:`,
    `- Understand the visitor's intent first, then guide them naturally — ask a relevant follow-up question when it helps.`,
    `- Give practical, specific advice like a friendly expert would. Keep it conversational, warm and human — never robotic or list-dumping.`,
    `- Continue the conversation naturally; don't reset or over-explain.`,
    `- Recommend a service, course or mentoring ONLY when it genuinely fits the visitor's need — don't pitch upfront.`,
    `- Keep replies concise (2–5 sentences) unless the visitor asks for depth.`,
    ``,
    `Estimates: When a visitor describes or shares a project (image, screenshot, poster, thumbnail, or a YouTube/Drive/website link), you may estimate editing complexity, approximate editing time, an approximate price range, and a suggested workflow — and recommend the right service or mentoring. ALWAYS say estimates are approximate and a firm quote comes from Janish on WhatsApp (+91 63743 43169) or the "Let's Talk" form.`,
    ``,
    `Knowledge rules:`,
    `- Use ONLY the business data below. Never invent services, courses, prices, policies or availability.`,
    `- If something isn't in the data, say you'll confirm with Janish and point to WhatsApp.`,
    `- Prices are in Indian Rupees (₹). You may reply in the visitor's language (English/Tamil/Tanglish).`,
    ``,
    `=== BUSINESS DATA (from Firebase) ===`,
    knowledge,
    `=== END BUSINESS DATA ===`,
    known,
  ].join('\n');
}

// ─── GeminiProvider (default) ───────────────────────────────────────────────
const GeminiProvider: Provider = {
  isConfigured: () => !!process.env.GEMINI_API_KEY,
  async stream({ system, messages, images, onToken }) {
    const key = process.env.GEMINI_API_KEY!;
    const contents = messages.map((m, i) => {
      const parts: any[] = [{ text: m.content }];
      // Attach images to the latest user turn (vision task)
      if (images && images.length && i === messages.length - 1 && m.role === 'user') {
        images.forEach((img) => parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } }));
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      throw new Error(`Gemini ${upstream.status}: ${detail.slice(0, 200)}`);
    }
    await pumpSSE(upstream.body, (payload) => {
      const t = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('');
      if (t) onToken(t);
    });
  },
};

// ─── OpenAIProvider (video / complex reasoning) ─────────────────────────────
const OpenAIProvider: Provider = {
  isConfigured: () => !!process.env.OPENAI_API_KEY,
  async stream({ system, messages, onToken }) {
    const key = process.env.OPENAI_API_KEY!;
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
        temperature: 0.6,
        max_tokens: 800,
        stream: true,
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      throw new Error(`OpenAI ${upstream.status}: ${detail.slice(0, 200)}`);
    }
    await pumpSSE(upstream.body, (payload) => {
      const t = payload?.choices?.[0]?.delta?.content;
      if (t) onToken(t);
    });
  },
};

const PROVIDERS: Record<string, Provider> = {
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  // claude: ClaudeProvider,  ← future: add here + set AI_PROVIDER_* env, nothing else changes
};

// Shared SSE reader: parses `data: {json}` lines and calls onPayload(json).
async function pumpSSE(body: ReadableStream<Uint8Array>, onPayload: (p: any) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        onPayload(JSON.parse(payload));
      } catch {
        /* ignore keep-alive / partial fragments */
      }
    }
  }
}

// ─── AIRouter — picks a provider for the task, with graceful fallback ───────
function detectTask(body: ChatRequest): TaskKind {
  if (body.videoUrl) return 'video';
  if (Array.isArray(body.images) && body.images.length) return 'vision';
  return 'text';
}

function routeProvider(task: TaskKind): { name: string; provider: Provider } | null {
  const preferred = ROUTES[task];
  // Prefer the configured route; otherwise fall back to any configured provider
  // so the assistant keeps working even if a key isn't set yet.
  const order = [preferred, ...Object.keys(PROVIDERS).filter((n) => n !== preferred)];
  for (const name of order) {
    const provider = PROVIDERS[name];
    if (provider && provider.isConfigured()) return { name, provider };
  }
  return null;
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body: ChatRequest =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) return res.status(400).json({ error: 'No messages provided' });

    const task = detectTask(body);
    const routed = routeProvider(task);
    if (!routed) return res.status(503).json({ error: 'AI is not configured' });

    const knowledge = await getKnowledge();
    const system = buildSystemPrompt(knowledge, body.answers);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    try {
      await routed.provider.stream({
        system,
        messages,
        images: body.images,
        onToken: (t) => res.write(t),
      });
    } catch (providerErr) {
      console.error(`Provider "${routed.name}" failed:`, providerErr);
      if (!res.headersSent) return res.status(502).json({ error: 'AI upstream error' });
      // Already streaming — end gracefully.
    }
    res.end();
  } catch (e) {
    console.error('chat handler failed:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Chat failed' });
    else res.end();
  }
}
