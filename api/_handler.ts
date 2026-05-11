// Shared Gemini handler used by both the Vercel serverless function (api/groq.ts)
// and the Vite dev-server middleware (vite.config.ts).
//
// All prompts are in Dutch — the platform is Dutch-facing.
// Note: this file is still imported via /api/groq for backwards compatibility,
// but internally uses Google Gemini.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config as loadEnv } from 'dotenv';

loadEnv();

// Gemini models: gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-1.5-pro
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

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
      priorityScore: number;          // 1-5
      sentiment: 'positief' | 'neutraal' | 'negatief';
      keywords: string[];
      completenessScore: number;       // 0-10
      reasoning: string;
    };

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY ontbreekt. Zet hem in .env (lokaal) of in de Vercel project env vars (productie). Maak een key aan op https://aistudio.google.com/apikey',
    );
  }
  return new GoogleGenerativeAI(key);
}

const SYSTEMS: Record<string, string> = {
  categorize: `Je bent een redactionele assistent die binnenkomende publieks-tips classificeert voor een Nederlands journalistiek platform. Antwoord ALTIJD als geldig JSON. Geen markdown. Geen toelichting buiten het JSON.`,
  improve: `Je bent een journalist die met een tipgever in gesprek gaat. Doel: betere, concretere, beter te verifiëren informatie krijgen. Wees beleefd, vriendelijk en duidelijk. Stel doorvragen die helpen om de tip bruikbaar te maken (wie, waar, wanneer, bron, bewijs). Vraag NIET naar persoonsgegevens van derden zonder reden. Antwoord ALTIJD als geldig JSON.`,
  analyze: `Je bent een redactie-assistent. Vat tips bondig samen voor de redactie, signaleer thema's en sentiment, noem concrete entiteiten (personen, organisaties, plaatsen), detecteer persoonlijke informatie (PII), en geef prioriteit + compleetheid. Antwoord ALTIJD als geldig JSON.`,
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

Geef ALLEEN JSON met deze velden EXACT:
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

Geef ALLEEN JSON in dit formaat:
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

Geef ALLEEN JSON in dit exacte formaat:
{
  "summary": "<bondige samenvatting in NL, max 3 zinnen>",
  "themes": ["<thema 1>", "<thema 2>"],
  "entities": ["<persoon/organisatie/plaats 1>", "..."],
  "keywords": ["<sleutelwoord 1>", "<sleutelwoord 2>", "<sleutelwoord 3>"],
  "piiTypes": ["<bijv. 'BSN', 'adres', 'telefoonnummer', 'naam'>"],
  "hasPii": true,
  "priority": "low",
  "priorityScore": 3,
  "sentiment": "neutraal",
  "completenessScore": 6,
  "reasoning": "<1-2 zinnen in NL>"
}

Regels:
- "priority" is "low" | "medium" | "high"
- "priorityScore" is een geheel getal 1-5 (1=laag, 5=urgent)
- "sentiment" is "positief" | "neutraal" | "negatief"
- "completenessScore" is een geheel getal 0-10 (hoe volledig de tip is)
- "hasPii" is true of false
- Arrays mogen leeg zijn maar moeten aanwezig zijn`;
}

function stripFences(s: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers if present
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : s).trim();
}

export async function runGroq(input: AiTaskInput): Promise<AiResult> {
  // Kept the name `runGroq` for backwards compatibility — actually runs Gemini now.
  const client = getClient();
  const system = SYSTEMS[input.task];
  const user = buildUserPrompt(input);

  let text: string;
  try {
    const model = client.getGenerativeModel({
      model: MODEL,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(user);
    text = result.response.text();
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status;
    const msg = e?.message ?? String(e);
    if (status === 401 || status === 403 || /API key/i.test(msg)) {
      throw new Error(`Gemini weigert de API key. Controleer GEMINI_API_KEY in .env / Vercel env vars. (${msg})`);
    }
    if (status === 404 || /model.*not.*found/i.test(msg)) {
      throw new Error(`Gemini model "${MODEL}" niet gevonden. Probeer GEMINI_MODEL=gemini-2.0-flash.`);
    }
    if (status === 429 || /quota|rate/i.test(msg)) {
      throw new Error('Gemini rate limit / quota bereikt. Wacht en probeer opnieuw.');
    }
    throw new Error(`Gemini fout${status ? ` (${status})` : ''}: ${msg}`);
  }

  if (!text) throw new Error('Lege respons van Gemini');

  let parsed: any;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error('Gemini gaf geen geldige JSON terug: ' + text.slice(0, 200));
  }

  return { task: input.task, ...parsed } as AiResult;
}
