// Client helper for /api/gemini.
// Server-side prompts and Gemini logic live in api/_handler.ts.

export type AiTopic = { id: string; name: string; description?: string | null };

export type IntakeStatus = 'INCOMPLETE' | 'JUNK' | 'VALIDATED';

export type IntakeResult = {
  task: 'intake';
  status: IntakeStatus;
  message: string;   // bot reply to show user
  rewrite: string;   // filled only on VALIDATED
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
  priorityScore: number;
  sentiment: 'positief' | 'neutraal' | 'negatief';
  completenessScore: number;
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
  // New: full intake evaluation with STATUS logic (fetches prompt from DB)
  intake: (payload: { conversation: string; topicName?: string | null }) =>
    call<IntakeResult>({ task: 'intake', payload }),

  // Legacy: generate follow-up questions + rewrite
  improve: (payload: { title: string; content: string; topicName?: string | null }) =>
    call<ImproveResult>({ task: 'improve', payload }),

  analyze: (payload: { title: string; content: string; topicName?: string | null }) =>
    call<AnalyzeResult>({ task: 'analyze', payload }),
};
