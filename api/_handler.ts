// Gemini REST API handler — no SDK import, plain fetch only.
// This avoids ERR_MODULE_NOT_FOUND issues with "type":"module" bundling on Vercel.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

export type AiTopic = { id: string; name: string; description?: string | null };
export type AiTaskInput =
  | { task: 'categorize'; payload: { content: string; title?: string; topics: AiTopic[] } }
  | { task: 'improve';    payload: { title: string; content: string; topicName?: string | null } }
  | { task: 'analyze';   payload: { title: string; content: string; topicName?: string | null } };

export type AiResult =
  | { task: 'categorize'; topicId: string | null; topicName: string | null; type: 'tip' | 'question' | 'experience'; reasoning: string }
  | { task: 'improve';    questions: string[]; rewrite: string }
  | { task: 'analyze';    summary: string; themes: string[]; entities: string[]; piiTypes: string[]; hasPii: boolean; priority: 'low' | 'medium' | 'high'; priorityScore: number; sentiment: 'positief' | 'neutraal' | 'negatief'; keywords: string[]; completenessScore: number; reasoning: string };

const SYSTEMS: Record<string, string> = {
  categorize: `Je bent een redactionele assistent die binnenkomende publieks-tips classificeert voor een Nederlands journalistiek platform. Antwoord ALTIJD als geldig JSON. Geen markdown. Geen toelichting buiten het JSON.`,
  improve:    `Je bent een journalist die met een tipgever in gesprek gaat. Stel doorvragen die helpen om de tip bruikbaar te maken (wie, waar, wanneer, bron, bewijs). Antwoord ALTIJD als geldig JSON.`,
  analyze:    `Je bent een redactie-assistent. Vat tips bondig samen, signaleer thema's, detecteer PII, geef prioriteit. Antwoord ALTIJD als geldig JSON.`,
};

function buildPrompt(input: AiTaskInput): string {
  if (input.task === 'categorize') {
    const topicLines = input.payload.topics
      .map((t, i) => `  ${i + 1}. id=${t.id} · ${t.name}${t.description ? ' — ' + t.description : ''}`)
      .join('\n');
    return `Kies het best passende onderwerp voor onderstaande tip. Geef ook het type (tip / question / experience).

ONDERWERPEN:
${topicLines || '  (geen onderwerpen beschikbaar)'}

TIP:
Titel: ${input.payload.title ?? '(geen titel)'}
Inhoud:
"""
${input.payload.content}
"""

Geef ALLEEN JSON:
{"topicId":"<id of null>","topicName":"<naam of null>","type":"tip","reasoning":"<1 zin>"}`;
  }

  if (input.task === 'improve') {
    return `Stel 2 korte, concrete doorvraag-vragen die de redactie helpen om deze tip bruikbaar te maken. Geef ook één herschrijving die duidelijker is maar de betekenis behoudt.

Onderwerp: ${input.payload.topicName ?? '(onbekend)'}
Titel: ${input.payload.title}
Inhoud:
"""
${input.payload.content}
"""

Geef ALLEEN JSON:
{"questions":["vraag 1","vraag 2"],"rewrite":"<verbeterde versie, max 4 zinnen>"}`;
  }

  // analyze
  return `Analyseer onderstaande tip voor de redactie.

Onderwerp: ${input.payload.topicName ?? '(onbekend)'}
Titel: ${input.payload.title}
Inhoud:
"""
${input.payload.content}
"""

Geef ALLEEN JSON:
{"summary":"<max 3 zinnen>","themes":[],"entities":[],"keywords":[],"piiTypes":[],"hasPii":false,"priority":"low","priorityScore":3,"sentiment":"neutraal","completenessScore":5,"reasoning":"<1-2 zinnen>"}`;
}

function stripFences(s: string) {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : s).trim();
}

export async function runGroq(input: AiTaskInput): Promise<AiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY ontbreekt in omgevingsvariabelen.');

  const body = {
    system_instruction: { parts: [{ text: SYSTEMS[input.task] }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1200,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(GEMINI_URL(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    if (res.status === 401 || res.status === 403) throw new Error(`Gemini API key ongeldig (${res.status}): ${err}`);
    if (res.status === 429) throw new Error('Gemini rate limit bereikt. Wacht even en probeer opnieuw.');
    throw new Error(`Gemini fout ${res.status}: ${err}`);
  }

  const json = await res.json() as any;
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Lege respons van Gemini.');

  let parsed: any;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error('Gemini gaf geen geldige JSON: ' + text.slice(0, 200));
  }

  return { task: input.task, ...parsed } as AiResult;
}
