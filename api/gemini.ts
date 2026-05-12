// Single-file Gemini handler — no cross-file imports to avoid ERR_MODULE_NOT_FOUND
// with "type":"module" in package.json on Vercel Node.js runtime.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

// ── Fetch editable system prompt from Supabase ────────────────────────────────

const DEFAULT_INTAKE_PROMPT = `Je bent een journalistieke intake-assistent. Beoordeel de tip en geef STATUS: INCOMPLETE, JUNK of VALIDATED. Antwoord ALTIJD als geldig JSON: {"status":"INCOMPLETE","message":"<reactie>","rewrite":""}`;

async function fetchIntakePrompt(): Promise<string> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_INTAKE_PROMPT;
  try {
    const res = await fetch(
      `${url}/rest/v1/ai_config?key=eq.system_prompt_intake&select=value&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return DEFAULT_INTAKE_PROMPT;
    const data = await res.json() as { value: string }[];
    return data[0]?.value ?? DEFAULT_INTAKE_PROMPT;
  } catch {
    return DEFAULT_INTAKE_PROMPT;
  }
}

// ── System prompts ────────────────────────────────────────────────────────────

const STATIC_SYSTEMS: Record<string, string> = {
  improve:  'Je bent een journalist die doorvraagt om tips bruikbaarder te maken. Antwoord ALTIJD als geldig JSON.',
  analyze:  'Je bent een redactie-assistent. Analyseer de tip bondig. Antwoord ALTIJD als geldig JSON.',
  categorize: 'Je bent een redactionele assistent die tips classificeert. Antwoord ALTIJD als geldig JSON.',
};

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPrompt(body: any): string {
  const { task, payload } = body;

  if (task === 'intake') {
    return `Beoordeel onderstaand gesprek en bepaal of de tip journalistiek bruikbaar is.

Onderwerp: ${payload.topicName ?? '(onbekend)'}

Gesprekstranscript:
"""
${payload.conversation}
"""

Geef ALLEEN JSON:
{"status":"INCOMPLETE","message":"<jouw reactie aan de tipgever>","rewrite":""}

Regels:
- status is exact "INCOMPLETE", "JUNK" of "VALIDATED"
- message is wat de chatbot toont (Nederlands, redactionele toon, geen AI-clichés)
- rewrite alleen ingevuld bij VALIDATED (journalistieke herschrijving max 5 zinnen), anders ""`;
  }

  if (task === 'improve') {
    return `Stel 2 korte doorvraag-vragen en geef een herschrijving.
Onderwerp: ${payload.topicName ?? '(onbekend)'}
Titel: ${payload.title}
Inhoud: ${payload.content}
Geef ALLEEN JSON: {"questions":["vraag 1","vraag 2"],"rewrite":"<verbeterde versie, max 4 zinnen>"}`;
  }

  if (task === 'analyze') {
    return `Analyseer deze tip voor de redactie.
Onderwerp: ${payload.topicName ?? '(onbekend)'}
Titel: ${payload.title}
Inhoud: ${payload.content}
Geef ALLEEN JSON: {"summary":"<max 3 zinnen>","themes":[],"entities":[],"keywords":[],"piiTypes":[],"hasPii":false,"priority":"low","priorityScore":3,"sentiment":"neutraal","completenessScore":5,"reasoning":"<1-2 zinnen>"}`;
  }

  if (task === 'categorize') {
    const topicLines = (payload.topics ?? [])
      .map((t: any, i: number) => `  ${i + 1}. id=${t.id} · ${t.name}`)
      .join('\n');
    return `Kies het best passende onderwerp.
ONDERWERPEN:\n${topicLines || '(geen)'}
TIP: ${payload.title ?? ''}\n${payload.content}
Geef ALLEEN JSON: {"topicId":"<id of null>","topicName":"<naam of null>","type":"tip","reasoning":"<1 zin>"}`;
  }

  throw new Error(`Onbekende task: ${task}`);
}

// ── Strip markdown fences ────────────────────────────────────────────────────

function stripFences(s: string) {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : s).trim();
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY ontbreekt in omgevingsvariabelen.' });
    return;
  }

  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Ongeldige JSON body.' });
    return;
  }

  if (!body?.task) {
    res.status(400).json({ error: 'Missing "task" field.' });
    return;
  }

  try {
    // Get system prompt
    const system = body.task === 'intake'
      ? await fetchIntakePrompt()
      : STATIC_SYSTEMS[body.task] ?? 'Antwoord als geldig JSON.';

    const prompt = buildPrompt(body);

    const geminiBody = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      },
    };

    const geminiRes = await fetch(GEMINI_URL(geminiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text().catch(() => geminiRes.statusText);
      if (geminiRes.status === 401 || geminiRes.status === 403)
        throw new Error(`Gemini API key ongeldig (${geminiRes.status})`);
      if (geminiRes.status === 429)
        throw new Error('Gemini rate limit bereikt — wacht even en probeer opnieuw.');
      throw new Error(`Gemini fout ${geminiRes.status}: ${err}`);
    }

    const geminiJson = await geminiRes.json() as any;
    const text: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('Lege respons van Gemini.');

    let parsed: any;
    try { parsed = JSON.parse(stripFences(text)); }
    catch { throw new Error('Gemini gaf geen geldige JSON: ' + text.slice(0, 200)); }

    res.status(200).json({ task: body.task, ...parsed });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
}
