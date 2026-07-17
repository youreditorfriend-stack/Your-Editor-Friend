// Client-side AI Service (modular).
//
// The single seam between the chat UI and the backend. The UI never knows the
// provider or holds any key — it only calls streamAssistant(), which talks to
// our own /api/chat endpoint and streams the reply back token-by-token.
//
// Swapping providers later means changing only api/chat.ts; this file and the
// UI stay the same.

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface InlineImage {
  mimeType: string;
  data: string; // base64, no data: prefix
}

export interface StreamOptions {
  history: ChatTurn[];
  answers?: Record<string, string>;
  images?: InlineImage[];   // optional attachments — routed to a vision model
  videoUrl?: string;        // optional video link — routed to the video model
  onToken: (chunk: string) => void;
  signal?: AbortSignal;
}

export class AiUnavailableError extends Error {}

// Streams the assistant reply. Calls onToken for each chunk as it arrives and
// resolves with the full text. Throws AiUnavailableError when the backend has
// no key configured (e.g. local dev), so the UI can show a graceful fallback.
export async function streamAssistant(opts: StreamOptions): Promise<string> {
  const { history, answers, images, videoUrl, onToken, signal } = opts;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history, answers, images, videoUrl }),
    signal,
  });

  if (res.status === 503) {
    throw new AiUnavailableError('AI is not configured yet');
  }
  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      onToken(chunk);
    }
  }

  return full;
}
