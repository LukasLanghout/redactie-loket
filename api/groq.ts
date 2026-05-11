import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runGroq, type AiTaskInput } from './_handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as AiTaskInput;
    if (!body?.task) {
      res.status(400).json({ error: 'Missing "task" field' });
      return;
    }
    const result = await runGroq(body);
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
}
