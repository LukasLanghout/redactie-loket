import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { SubmissionCard } from '../components/SubmissionCard';
import type { Topic, Submission } from '../lib/types';

export default function Home() {
  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recent = [] } = useQuery<Submission[]>({
    queryKey: ['home-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data as Submission[]) ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ['home-counts'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('submissions').select('*', { count: 'exact', head: true });
      const { count: published } = await supabase
        .from('submissions').select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'published']);
      return { total: total ?? 0, published: published ?? 0 };
    },
  });

  const topicById = new Map(topics.map((t) => [t.id, t]));

  return (
    <div className="space-y-12">
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="badge bg-accent-500 text-slate-900 mb-3">Community-platform</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Deel je tip, vraag of ervaring met de redactie.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
            Heb jij informatie waar journalisten iets mee kunnen? Stuur ons je verhaal. We lezen alles
            wat binnenkomt en reageren waar we kunnen.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/submit" className="btn-accent">Deel jouw tip</Link>
            <Link to="/feed" className="btn-ghost border border-slate-300 dark:border-slate-700">
              Bekijk verhalen
            </Link>
          </div>
          {counts && (
            <div className="mt-8 flex gap-8 text-sm">
              <div>
                <div className="text-2xl font-bold text-brand-600">{counts.total}</div>
                <div className="text-slate-500">tips ontvangen</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-600">{counts.published}</div>
                <div className="text-slate-500">verhalen gedeeld</div>
              </div>
            </div>
          )}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Onze onderzoeken</h2>
          <div className="grid grid-cols-2 gap-3">
            {topics.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-lg p-3 border border-slate-200 dark:border-slate-700"
                   style={{ background: (t.color ?? '#00bcd4') + '14' }}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <div className="font-medium text-sm">{t.name}</div>
              </div>
            ))}
            {topics.length === 0 && (
              <div className="col-span-2 text-sm text-slate-500">
                Nog geen onderwerpen. Een admin kan ze toevoegen in <code>database/seed.sql</code>.
              </div>
            )}
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Recente verhalen</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {recent.map((s) => (
              <SubmissionCard key={s.id} s={s} topic={s.topic_id ? topicById.get(s.topic_id) : null} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
