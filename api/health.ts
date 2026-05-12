import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(200).json({ gemini: false, reason: 'GEMINI_API_KEY niet ingesteld' });
    return;
  }

  // Minimal ping to Gemini — tiny prompt, no output needed
  try {
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping. Antwoord alleen: ok' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    );
    res.status(200).json({ gemini: r.ok, status: r.status });
  } catch (e: any) {
    res.status(200).json({ gemini: false, reason: e?.message });
  }
}
