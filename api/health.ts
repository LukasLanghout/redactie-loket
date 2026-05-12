import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(200).json({ groq: false, reason: 'GROQ_API_KEY niet ingesteld' });
    return;
  }

  // Minimal ping to Groq — tiny prompt, no real output needed
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Ping. Antwoord alleen: ok' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    res.status(200).json({ groq: r.ok, status: r.status });
  } catch (e: any) {
    res.status(200).json({ groq: false, reason: e?.message });
  }
}
