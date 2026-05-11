import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { SubmissionCard } from '../components/SubmissionCard';
import type { Submission, Topic, SubmissionType } from '../lib/types';

export default function Feed() {
  const [topicId, setTopicId] = useState('');
  const [type, setType] = useState<'' | SubmissionType>('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await supabase.from('topics').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: subs = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['feed', topicId, type, sort],
    queryFn: async () => {
      let q = supabase
        .from('submissions')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('created_at', { ascending: sort === 'oldest' });
      if (topicId) q = q.eq('topic_id', topicId);
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Submission[]) ?? [];
    },
  });

  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const filtered = q
    ? subs.filter(
        (s) => s.title.toLowerCase().includes(q.toLowerCase()) || s.content.toLowerCase().includes(q.toLowerCase()),
      )
    : subs;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Community-feed</h1>
        <p className="text-slate-500">Verhalen die door de redactie zijn goedgekeurd.</p>
      </header>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Zoeken</label>
          <input className="input" placeholder="Zoek in titel of inhoud…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label">Onderwerp</label>
          <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">Alle</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as '' | SubmissionType)}>
            <option value="">Alle</option>
            <option value="tip">Tip</option>
            <option value="question">Vraag</option>
            <option value="experience">Ervaring</option>
          </select>
        </div>
        <div>
          <label className="label">Sorteer</label>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}>
            <option value="newest">Nieuwste eerst</option>
            <option value="oldest">Oudste eerst</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Laden…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nog geen verhalen.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SubmissionCard key={s.id} s={s} topic={s.topic_id ? topicById.get(s.topic_id) : null} />
          ))}
        </div>
      )}
    </div>
  );
}
