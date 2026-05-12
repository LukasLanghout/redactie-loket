// Gemini REST API handler — plain fetch, no SDK imports.
// System prompts are fetched live from the Supabase ai_config table so they
// can be edited in the Supabase dashboard without touching code.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

export type AiTopic = { id: string; name: string; description?: string | null };

export type AiTaskInput =
  | { task: 'intake';    payload: { conversation: string; topicName?: string | null } }
  | { task: 'categorize'; payload: { content: string; title?: string; topics: AiTopic[] } }
  | { task: 'improve';    payload: { title: string; content: string; topicName?: string | null } }
  | { task: 'analyze';    payload: { title: string; content: string; topicName?: string | null } };

export type IntakeStatus = 'INCOMPLETE' | 'JUNK' | 'VALIDATED';

export type AiResult =
  | { task: 'intake';    status: IntakeStatus; message: string; rewrite: string }
  | { task: 'categorize'; topicId: string | null; topicName: string | null; type: string; reasoning: string }
  | { task: 'improve';    questions: string[]; rewrite: string }
  | { task: 'analyze';    summary: string; themes: string[]; entities: string[]; piiTypes: string[];
      hasPii: boolean; priority: string; priorityScore: number; sentiment: string;
      keywords: string[]; completenessScore: number; reasoning: string };

// ── Fetch editable system prompt from Supabase ────────────────────────────────

const DEFAULT_INTAKE_PROMPT = `Je bent een journalistieke intake-assistent. Beoordeel de tip en geef STATUS: INCOMPLETE, JUNK of VALIDATED.
Antwoord ALTIJD als geldig JSON: {"status":"INCOMPLETE","message":"<reactie>","rewrite":""}`;

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

// ── Static system prompts for other tasks ─────────────────────────────────────

const SYSTEMS: Record<string, string> = {
  categorize: `Je bent een redactionele assistent die tips classificeert voor een Nederlands journalistiek platform. Antwoord ALTIJD als geldig JSON.`,
  improve:    `Je bent een journalist die doorvraagt om tips bruikbaarder te maken. Antwoord ALTIJD als geldig JSON.`,
  analyze:    `Je bent een redactie-assistent. Analyseer de tip bondig. Antwoord ALTIJD als geldig JSON.`,
};

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildPrompt(input: AiTaskInput): string {
  if (input.task === 'intake') {
    return `Beoordeel onderstaand gesprek en bepaal of de tip journalistiek bruikbaar is.

Onderwerp: ${input.payload.topicName ?? '(onbekend)'}

Gesprekstranscript:
"""
${input.payload.conversation}
"""

Geef ALLEEN JSON:
{"status":"INCOMPLETE","message":"<jouw reactie aan de tipgever>","rewrite":""}

Regels:
- status is exact "INCOMPLETE", "JUNK" of "VALIDATED"
- message is wat de chatbot aan de gebruiker toont (Nederlands, redactionele toon)
- rewrite is alleen ingevuld bij VALIDATED (journalistieke herschrijving, max 5 zinnen), anders ""`;
  }

  if (input.task === 'categorize') {
    const topicLines = input.payload.topics
      .map((t, i) => `  ${i + 1}. id=${t.id} · ${t.name}${t.description ? ' — ' + t.description : ''}`)
      .join('\n');
    return `Kies het best passende onderwerp. Geef ook het type (tip / question / experience).

ONDERWERPEN:
${topicLines || '  (geen onderwerpen)'}

TIP: ${input.payload.title ?? ''}\n${input.payload.content}

Geef ALLEEN JSON: {"topicId":"<id of null>","topicName":"<naam of null>","type":"tip","reasoning":"<1 zin>"}`;
  }

  if (input.task === 'improve') {
    return `Stel 2 korte doorvraag-vragen en geef een herschrijving.

Onderwerp: ${input.payload.topicName ?? '(onbekend)'}
Titel: ${input.payload.title}
Inhoud: ${input.payload.content}

Geef ALLEEN JSON: {"questions":["vraag 1","vraag 2"],"rewrite":"<verbeterde versie, max 4 zinnen>"}`;
  }

  // analyze
  return `Analyseer deze tip voor de redactie.

Onderwerp: ${input.payload.topicName ?? '(onbekend)'}
Titel: ${input.payload.title}
Inhoud: ${input.payload.content}

Geef ALLEEN JSON: {"summary":"<max 3 zinnen>","themes":[],"entities":[],"keywords":[],"piiTypes":[],"hasPii":false,"priority":"low","priorityScore":3,"sentiment":"neutraal","completenessScore":5,"reasoning":"<1-2 zinnen>"}`;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

function stripFences(s: string) {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : s).trim();
}

export async function runGroq(input: AiTaskInput): Promise<AiResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY ontbreekt in omgevingsvariabelen.');

  // Fetch system prompt (intake uses DB, others use static)
  const system = input.task === 'intake'
    ? await fetchIntakePrompt()
    : SYSTEMS[input.task];

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1200, responseMimeType: 'application/json' },
  };

  const res = await fetch(GEMINI_URL(geminiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    if (res.status === 401 || res.status === 403) throw new Error(`Gemini API key ongeldig: ${err}`);
    if (res.status === 429) throw new Error('Gemini rate limit bereikt.');
    throw new Error(`Gemini fout ${res.status}: ${err}`);
  }

  const json = await res.json() as any;
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Lege respons van Gemini.');

  let parsed: any;
  try { parsed = JSON.parse(stripFences(text)); }
  catch { throw new Error('Gemini gaf geen geldige JSON: ' + text.slice(0, 200)); }

  return { task: input.task, ...parsed } as AiResult;
}
