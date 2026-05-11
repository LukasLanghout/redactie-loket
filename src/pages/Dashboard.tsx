import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ai, type AnalyzeResult } from '../lib/ai';
import type { Submission, SubmissionStatus, SubmissionType, Topic } from '../lib/types';

const FLAG_WORDS = ['spam', 'klootzak', 'kanker', 'idioot'];

function autoFlag(s: Submission) {
  const text = (s.title + ' ' + s.content).toLowerCase();
  return FLAG_WORDS.some((w) => text.includes(w));
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SubmissionStatus | ''>('pending');
  const [type, setType] = useState<SubmissionType | ''>('');
  const [topicId, setTopicId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, AnalyzeResult>>({});

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*').order('name')).data ?? [],
  });
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const { data: subs = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['admin-subs', status, type, topicId],
    queryFn: async () => {
      let q = supabase.from('submissions').select('*').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      if (type) q = q.eq('type', type);
      if (topicId) q = q.eq('topic_id', topicId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Submission[]) ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const total = (await supabase.from('submissions').select('*', { count: 'exact', head: true })).count ?? 0;
      const pending = (await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status','pending')).count ?? 0;
      const approved = (await supabase.from('submissions').select('*', { count: 'exact', head: true }).in('status', ['approved','published'])).count ?? 0;
      const rejected = (await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status','rejected')).count ?? 0;
      return { total, pending, approved, rejected, rate: total ? Math.round((approved / total) * 100) : 0 };
    },
  });

  const update = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<Submission> }) => {
      const { error } = await supabase.from('submissions').update(patch).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-subs'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Bijgewerkt');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('submissions').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-subs'] });
      toast.success('Verwijderd');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function analyze(s: Submission) {
    setAiBusy(s.id);
    try {
      const topicName = s.topic_id ? topicById.get(s.topic_id)?.name ?? null : null;
      const r = await ai.analyze({ title: s.title, content: s.content, topicName });
      setAiResults((m) => ({ ...m, [s.id]: r }));
      const note = [
        `🤖 AI-analyse (${new Date().toLocaleString('nl-NL')})`,
        `Samenvatting: ${r.summary}`,
        `Thema's: ${r.themes.join(', ') || '—'}`,
        `Entiteiten: ${r.entities.join(', ') || '—'}`,
        `Prioriteit: ${r.priority}`,
        r.hasPii ? `⚠ PII: ${r.piiTypes.join(', ')}` : 'Geen PII gedetecteerd',
        `Reden: ${r.reasoning}`,
      ].join('\n');
      const existing = s.moderation_notes ?? '';
      const newNotes = existing ? `${existing}\n\n${note}` : note;
      update.mutate({ ids: [s.id], patch: { moderation_notes: newNotes, ai_flagged: r.hasPii || r.priority === 'high' } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const ids = Array.from(selected);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Redactie-dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Totaal', stats.total],
            ['Pending', stats.pending],
            ['Goedgekeurd', stats.approved],
            ['Approval rate', `${stats.rate}%`],
          ].map(([k, v]) => (
            <div key={k as string} className="card p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">{k}</div>
              <div className="text-2xl font-bold">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus | '')}>
            <option value="">Alle</option>
            <option value="pending">Pending</option>
            <option value="approved">Goedgekeurd</option>
            <option value="published">Gepubliceerd</option>
            <option value="rejected">Afgewezen</option>
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as SubmissionType | '')}>
            <option value="">Alle</option>
            <option value="tip">Tip</option>
            <option value="question">Vraag</option>
            <option value="experience">Ervaring</option>
          </select>
        </div>
        <div>
          <label className="label">Onderwerp</label>
          <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">Alle</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {ids.length > 0 && (
        <div className="card p-3 flex items-center gap-2 sticky top-16 z-10">
          <span className="text-sm">{ids.length} geselecteerd</span>
          <button className="btn-primary" onClick={() => update.mutate({ ids, patch: { status: 'approved' } })}>Goedkeuren</button>
          <button className="btn-ghost border border-slate-300 dark:border-slate-700"
                  onClick={() => update.mutate({ ids, patch: { status: 'rejected' } })}>Afwijzen</button>
          <button className="btn-ghost border border-slate-300 dark:border-slate-700"
                  onClick={() => update.mutate({ ids, patch: { status: 'published' } })}>Publiceren</button>
          <button className="btn-ghost text-rose-600"
                  onClick={() => { if (confirm(`Verwijder ${ids.length} items?`)) remove.mutate(ids); }}>Verwijderen</button>
        </div>
      )}

      {isLoading ? (
        <div className="text-slate-500">Laden…</div>
      ) : subs.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Niets gevonden.</div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const t = s.topic_id ? topicById.get(s.topic_id) : null;
            const flagged = s.ai_flagged || autoFlag(s);
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1.5"
                         checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge ${
                        s.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        s.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        s.status === 'published' ? 'bg-brand-100 text-brand-700' :
                        'bg-rose-100 text-rose-800'
                      }`}>{s.status}</span>
                      <span className="badge bg-slate-100 text-slate-700 capitalize">{s.type}</span>
                      {t && (
                        <span className="badge" style={{ backgroundColor: (t.color ?? '#00bcd4') + '22', color: t.color ?? '#00bcd4' }}>
                          {t.icon} {t.name}
                        </span>
                      )}
                      {flagged && <span className="badge bg-rose-100 text-rose-800">⚠ flagged</span>}
                    </div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{s.content}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      {s.anonymous ? 'Anoniem' : (s.contact_name ?? '—')} ·{' '}
                      {new Date(s.created_at).toLocaleString('nl-NL')}
                    </div>
                    {aiResults[s.id] && (
                      <div className="mt-3 card p-3 bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 text-sm space-y-1">
                        <div className="text-xs uppercase tracking-wide font-semibold text-brand-700 dark:text-brand-300">
                          🤖 AI-analyse · prioriteit {aiResults[s.id].priority}
                        </div>
                        <div><strong>Samenvatting:</strong> {aiResults[s.id].summary}</div>
                        {aiResults[s.id].themes.length > 0 && (
                          <div><strong>Thema's:</strong> {aiResults[s.id].themes.join(', ')}</div>
                        )}
                        {aiResults[s.id].entities.length > 0 && (
                          <div><strong>Entiteiten:</strong> {aiResults[s.id].entities.join(', ')}</div>
                        )}
                        {aiResults[s.id].hasPii && (
                          <div className="text-rose-700 dark:text-rose-400">
                            ⚠ <strong>PII gedetecteerd:</strong> {aiResults[s.id].piiTypes.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-brand-600">Moderatie-acties</summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="btn-primary" onClick={() => update.mutate({ ids: [s.id], patch: { status: 'approved' } })}>Goedkeuren</button>
                        <button className="btn-ghost border" onClick={() => update.mutate({ ids: [s.id], patch: { status: 'rejected' } })}>Afwijzen</button>
                        <button className="btn-ghost border" onClick={() => update.mutate({ ids: [s.id], patch: { status: 'published' } })}>Publiceren</button>
                        <button className="btn-ghost border" disabled={aiBusy === s.id} onClick={() => analyze(s)}>
                          {aiBusy === s.id ? '🤖 Analyseert…' : '🤖 AI-analyse'}
                        </button>
                        <a href={`/submissions/${s.id}`} className="btn-ghost border">Bekijk</a>
                      </div>
                      <textarea
                        className="input mt-2"
                        placeholder="Moderatie-notitie (intern)"
                        defaultValue={s.moderation_notes ?? ''}
                        onBlur={(e) => {
                          if (e.target.value !== (s.moderation_notes ?? '')) {
                            update.mutate({ ids: [s.id], patch: { moderation_notes: e.target.value } });
                          }
                        }}
                      />
                    </details>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
