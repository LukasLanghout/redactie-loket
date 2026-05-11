import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SubmissionCard } from '../components/SubmissionCard';
import type { Submission, Topic } from '../lib/types';

export default function Profile() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(profile?.name ?? '');

  const { data: subs = [] } = useQuery<Submission[]>({
    queryKey: ['my-subs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions').select('*').eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data as Submission[]) ?? [];
    },
  });

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*')).data ?? [],
  });
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Niet ingelogd');
      const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => { await refresh(); toast.success('Profiel opgeslagen'); },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-subs', user?.id] });
      toast.success('Verwijderd');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Profiel</h1>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">E-mail</label>
            <input className="input" value={user?.email ?? ''} disabled />
          </div>
          <div>
            <label className="label">Naam</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-500">Rol: <strong>{profile?.role ?? 'public'}</strong></div>
        <button className="btn-primary mt-4" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Opslaan…' : 'Opslaan'}
        </button>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Mijn bijdragen</h2>
        {subs.length === 0 ? (
          <div className="card p-6 text-slate-500">Nog geen bijdragen.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {subs.map((s) => (
              <div key={s.id} className="space-y-2">
                <SubmissionCard s={s} topic={s.topic_id ? topicById.get(s.topic_id) : null} />
                {s.status === 'pending' && (
                  <button
                    onClick={() => { if (confirm('Verwijder deze bijdrage?')) del.mutate(s.id); }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Verwijderen
                  </button>
                )}
                {s.moderation_notes && (
                  <div className="text-xs text-slate-500">
                    Notitie van redactie: {s.moderation_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
