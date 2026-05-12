// AI handler — uses Groq (OpenAI-compatible REST API, no SDK needed).
// Set GROQ_API_KEY in Vercel env vars and local .env.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_MODEL   = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

// ── Fetch editable system prompt from Supabase ────────────────────────────────

const DEFAULT_INTAKE_PROMPT = `Je bent een nieuwsgierige, enthousiaste journalist bij een onderzoeksredactie. Je voert een intakegesprek met iemand die een tip of verhaal wil delen.

JOUW TAAK:
Vraag door totdat je een volledig, bruikbaar verhaal hebt. Stel telkens één concrete vervolgvraag. Toon oprechte interesse — elk verhaal kan waardevol zijn.

WANNEER DOORVRAGEN (status: INCOMPLETE):
- Je mist nog essentiële details: wie, wat, wanneer, waar, hoe vaak, hoe groot
- Het verhaal is vaag, te kort, of onduidelijk
- Je wilt weten of er bewijs is, getuigen zijn, of anderen hetzelfde meemaken
- Stel altijd EEN vraag tegelijk, helder en specifiek

WANNEER VALIDEREN (status: VALIDATED):
- Je hebt genoeg concrete informatie voor een redacteur om mee aan de slag te gaan
- Er is een duidelijk wie, wat, wanneer en waarom
- Het verhaal is journalistiek relevant

WANNEER AFWIJZEN (status: JUNK):
- De inhoud is aantoonbaar irrelevant, nep, of beledigend
- Wees hier ZEER terughoudend mee — twijfel je, vraag dan door

TOON:
- Warm, betrokken, menselijk — geen robotachtige zinnen
- Toon dat je het verhaal belangrijk vindt
- Geen AI-clichés zoals "Zeker!", "Absoluut!", "Geweldig!"
- Kort en to the point — max 2-3 zinnen per reactie

FORMAAT: Antwoord ALTIJD als geldig JSON:
{"status":"INCOMPLETE","message":"<jouw vraag of reactie>","rewrite":""}
Bij VALIDATED vul je rewrite in met een journalistieke herschrijving van max 5 zinnen, anders is rewrite "".`;

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

// ── Static system prompts ─────────────────────────────────────────────────────

const STATIC_SYSTEMS: Record<string, string> = {
  improve:    'Je bent een journalist die doorvraagt om tips bruikbaarder te maken. Antwoord ALTIJD als geldig JSON.',
  analyze:    'Je bent een redactie-assistent. Analyseer de tip bondig. Antwoord ALTIJD als geldig JSON.',
  categorize: 'Je bent een redactionele assistent die tips classificeert. Antwoord ALTIJD als geldig JSON.',
  title:      'Je bent een redacteur die een korte journalistieke koptitel bedenkt. Antwoord ALTIJD als geldig JSON.',
};

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPrompt(body: any): string {
  const { task, payload } = body;

  if (task === 'intake') {
    return `Onderwerp van de tip: ${payload.topicName ?? '(onbekend)'}

Dit is het gesprek tot nu toe:
"""
${payload.conversation}
"""

Lees het gesprek zorgvuldig. Wat ontbreekt er nog om dit journalistiek bruikbaar te maken?
Stel één gerichte vervolgvraag, of valideer als je genoeg weet.

Geef ALLEEN JSON:
{"status":"INCOMPLETE","message":"<jouw reactie of vraag>","rewrite":""}

- status: exact "INCOMPLETE", "JUNK" of "VALIDATED"
- message: wat je nu zegt in de chat (max 2-3 zinnen, Nederlands, menselijke toon)
- rewrite: alleen bij VALIDATED — journalistieke herschrijving van max 5 zinnen, anders ""`;
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

  if (task === 'title') {
    return `Bedenk een korte, krachtige journalistieke titel (max 8 woorden, Nederlands) voor deze tip.
Onderwerp: ${payload.topicName ?? '(onbekend)'}
Inhoud: ${payload.content}
Geef ALLEEN JSON: {"title":"<jouw titel>"}`;
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

// ── Groq call ─────────────────────────────────────────────────────────────────

async function callGroq(system: string, userPrompt: string): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY ontbreekt in omgevingsvariabelen.');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    if (res.status === 401) throw new Error(`Groq API key ongeldig (401): ${err}`);
    if (res.status === 429) throw new Error('Groq rate limit bereikt — wacht even en probeer opnieuw.');
    throw new Error(`Groq fout ${res.status}: ${err}`);
  }

  const json = await res.json() as any;
  const text: string = json?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Lege respons van Groq.');

  try { return JSON.parse(stripFences(text)); }
  catch { throw new Error('Groq gaf geen geldige JSON: ' + text.slice(0, 200)); }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' }); return;
  }

  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Ongeldige JSON body.' }); return;
  }

  if (!body?.task) {
    res.status(400).json({ error: 'Missing "task" field.' }); return;
  }

  try {
    const system = body.task === 'intake'
      ? await fetchIntakePrompt()
      : STATIC_SYSTEMS[body.task] ?? 'Antwoord als geldig JSON.';

    const parsed = await callGroq(system, buildPrompt(body));
    res.status(200).json({ task: body.task, ...parsed });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
}
