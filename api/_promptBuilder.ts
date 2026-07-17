// Server-side Prompt Builder (modular).
//
// Filename starts with "_" so Vercel does NOT expose it as an HTTP route — it
// is a helper bundled into api/chat.ts. Keeping the prompt here (server-side)
// means the business context and instructions are authoritative and can't be
// tampered with from the browser.

const BUSINESS = {
  brand: 'Your Editor Friend',
  owner: 'Janish Prabu',
  site: 'youreditorfriend.in',
  whatsapp: '+91 63743 43169',
  email: 'youreditorfriend@gmail.com',
  services: [
    'Reel / Shorts editing',
    'YouTube video editing',
    'Thumbnail design',
    'Course / tutorial production',
    'Full-time retainer editor',
    'Channel consulting & growth',
  ],
};

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Build the system prompt. `answers` are the structured choices the user has
// already made in the guided flow (service, budget, deadline…), so the model
// can respond in context without re-asking.
export function buildSystemPrompt(answers?: Record<string, string>): string {
  const known = answers && Object.keys(answers).length
    ? '\n\nThe visitor has already told us:\n' +
      Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : '';

  return [
    `You are the friendly AI assistant for ${BUSINESS.brand}, the video-editing studio run by ${BUSINESS.owner} (${BUSINESS.site}).`,
    `Help visitors with: ${BUSINESS.services.join(', ')}.`,
    ``,
    `Guidelines:`,
    `- Be warm, concise and practical. Keep replies short (2–4 sentences) unless asked for detail.`,
    `- You give rough guidance on services, pricing bands, courses, availability and process, but never invent exact prices or hard commitments — for a firm quote, point them to WhatsApp (${BUSINESS.whatsapp}) or the “Let's Talk” form.`,
    `- Indian Rupee (₹) pricing. You may answer in the visitor's language (English/Tamil/Tanglish).`,
    `- If asked something unrelated to the studio, gently steer back.`,
    `- Never claim to take payments or bookings yourself; you only inform and hand off.`,
    known,
  ].join('\n');
}

// Map the client conversation into OpenAI's message array with the system
// prompt prepended.
export function buildMessages(history: ChatTurn[], answers?: Record<string, string>) {
  const trimmed = history.slice(-12); // cap context sent upstream
  return [
    { role: 'system', content: buildSystemPrompt(answers) },
    ...trimmed.map(t => ({ role: t.role, content: t.content })),
  ];
}
