// Shared Groq handler used by both the Vercel serverless function (api/groq.ts)
// and the Vite dev-server middleware (vite.config.ts).
//
// All prompts are in Dutch — the platform is Dutch-facing.

import Groq from 'groq-sdk';
import { config as loadEnv } from 'dotenv';

loadEnv();

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

export type AiTopic = { id: string; name: string; description?: string | null };
export type AiTaskInput =
  | { task: 'categorize'; payload: { content: string; title?: string; topics: AiTopic[] } }
  | { task: 'improve'; payload: { title: string; content: string; topicName?: string | null } }
  | { task: 'analyze'; payload: { title: string; content: string; topicName?: string | null } };

export type AiResult =
  | {
      task: 'categorize';
      topicId: string | null;
      topicName: string | null;
      type: 'tip' | 'question' | 'experience';
      reasoning: string;
    }
  | {
      task: 'improve';
      questions: string[];
      rewrite: string;
    }
  | {
      task: 'analyze';
      summary: string;
      themes: string[];
      entities: string[];
      piiTypes: string[];
      hasPii: boolean;
      priority: 'low' | 'medium' | 'high';
      reasoning: string;
    };

function getClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      'GROQ_API_KEY ontbreekt. Zet hem in .env (lokaal) of in de Vercel project env vars (productie).',
    );
  }
  return new Groq({ apiKey: key });
}

const SYSTEMS: Record<string, string> = {
  categorize: `Je bent een redactionele assistent die binnenkomende publieks-tips classificeert voor een Nederlands journalistiek platform. Antwoord ALTIJD als geldig JSON. Geen markdown. Geen toelichting buiten het JSON.`,
  improve: `Je bent een journalist die met een tipgever in gesprek gaat. Doel: betere, concretere, beter te verifiëren informatie krijgen. Wees beleefd, vriendelijk en duidelijk. Stel doorvragen die helpen om de tip bruikbaar te maken (wie, waar, wanneer, bron, bewijs). Vraag NIET naar persoonsgegevens van derden zonder reden. Antwoord ALTIJD als geldig JSON.`,
  analyze: `Je bent een redactie-assistent. Vat tips bondig samen voor de redactie, signaleer thema's, noem concrete entiteiten (personen, organisaties, plaatsen), detecteer persoonlijke informatie (PII) die voorzichtig behandeld moet worden, en geef een prioriteit. Antwoord ALTIJD als geldig JSON.`,
};

function buildUserPrompt(input: AiTaskInput): string {
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

Geef JSON met deze velden EXACT:
{
  "topicId": "<id uit lijst of null als geen match>",
  "topicName": "<naam of null>",
  "type": "tip" | "question" | "experience",
  "reasoning": "<1 zin uitleg in NL>"
}`;
  }

  if (input.task === 'improve') {
    return `De volgende tip is ingestuurd door een lid van het publiek. Stel 3 korte, concrete doorvraag-vragen die de redactie helpen om deze tip bruikbaar te maken. Geef ook één voorzichtige herschrijving van de tip die de oorspronkelijke betekenis behoudt maar duidelijker is.

Onderwerp (indien bekend): ${input.payload.topicName ?? '(onbekend)'}
Titel: ${input.payload.title}
Inhoud:
"""
${input.payload.content}
"""

JSON formaat:
{
  "questions": ["vraag 1", "vraag 2", "vraag 3"],
  "rewrite": "<verbeterde versie van de tip in NL, max 4 zinnen>"
}`;
  }

  // analyze
  return `Analyseer onderstaande tip voor de redactie.

Onderwerp: ${input.payload.topicName ?? '(onbekend)'}
Titel: ${input.payload.title}
Inhoud:
"""
${input.payload.content}
"""

Geef JSON:
{
  "summary": "<bondige samenvatting in NL, max 3 zinnen>",
  "themes": ["<thema 1>", "<thema 2>"],
  "entities": ["<persoon/organisatie/plaats 1>", "..."],
  "piiTypes": ["<bijv. 'BSN', 'adres', 'telefoonnummer', 'naam'>"],
  "hasPii": true | false,
  "priority": "low" | "medium" | "high",
  "reasoning": "<1-2 zinnen waarom deze prioriteit, in NL>"
}`;
}

export async function runGroq(input: AiTaskInput): Promise<AiResult> {
  const groq = getClient();
  const system = SYSTEMS[input.task];
  const user = buildUserPrompt(input);

  const res = await groq.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error('Lege respons van Groq');

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Groq gaf geen geldige JSON terug: ' + content.slice(0, 200));
  }

  return { task: input.task, ...parsed } as AiResult;
}
