// POST /api/chat — AI assistant backend (streaming).
//
// The OpenAI API key lives ONLY here, in the serverless runtime, read from
// process.env.OPENAI_API_KEY. It is never sent to or exposed in the browser;
// the client only ever talks to this endpoint. The response is streamed back
// as plain UTF-8 text chunks (token-by-token) so the UI can render live.
import { buildMessages, ChatTurn } from './_promptBuilder';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'AI is not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const history: ChatTurn[] = Array.isArray(body.messages) ? body.messages : [];
    const answers: Record<string, string> | undefined = body.answers;

    if (!history.length) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: buildMessages(history, answers),
        temperature: 0.6,
        max_tokens: 500,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('OpenAI error:', upstream.status, detail);
      return res.status(502).json({ error: 'AI upstream error' });
    }

    // Stream plain text chunks to the client
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // OpenAI sends Server-Sent Events: lines like `data: {json}` / `data: [DONE]`
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const token = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (token) res.write(token);
        } catch {
          // ignore keep-alive / partial fragments
        }
      }
    }

    res.end();
  } catch (e) {
    console.error('chat handler failed:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Chat failed' });
    else res.end();
  }
}
