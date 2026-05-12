// Client helper for /api/groq.
// Server-side prompts and Groq SDK live in api/_handler.ts.

export type AiTopic = { id: string; name: string; description?: string | null };

export type CategorizeResult = {
  task: 'categorize';
  topicId: string | null;
  topicName: string | null;
  type: 'tip' | 'question' | 'experience';
  reasoning: string;
};

export type ImproveResult = {
  task: 'improve';
  questions: string[];
  rewrite: string;
};

export type AnalyzeResult = {
  task: 'analyze';
  summary: string;
  themes: string[];
  entities: string[];
  keywords: string[];
  piiTypes: string[];
  hasPii: boolean;
  priority: 'low' | 'medium' | 'high';
  priorityScore: number;        // 1-5
  sentiment: 'positief' | 'neutraal' | 'negatief';
  completenessScore: number;     // 0-10
  reasoning: string;
};

async function call<T>(body: unknown): Promise<T> {
  const r = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as any).error ?? `AI-aanroep mislukt (${r.status})`);
  }
  return (await r.json()) as T;
}

export const ai = {
  categorize: (payload: { content: string; title?: string; topics: AiTopic[] }) =>
    call<CategorizeResult>({ task: 'categorize', payload }),
  improve: (payload: { title: string; content: string; topicName?: string | null }) =>
    call<ImproveResult>({ task: 'improve', payload }),
  analyze: (payload: { title: string; content: string; topicName?: string | null }) =>
    call<AnalyzeResult>({ task: 'analyze', payload }),
};
