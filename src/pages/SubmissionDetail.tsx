import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth, isStaff } from '../hooks/useAuth';
import type { Submission, Reply, Topic } from '../lib/types';

export default function SubmissionDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      if (!id) return null;
      const { data: s, error } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const { data: r } = await supabase
        .from('replies').select('*').eq('submission_id', id).order('created_at', { ascending: true });
      let topic: Topic | null = null;
      if (s?.topic_id) {
        const { data: t } = await supabase.from('topics').select('*').eq('id', s.topic_id).maybeSingle();
        topic = (t as Topic) ?? null;
      }
      return { s: s as Submission | null, replies: (r ?? []) as Reply[], topic };
    },
  });

  const addReply = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Niet ingelogd');
      const { error } = await supabase.from('replies').insert({
        submission_id: id, user_id: user.id, content: reply,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply('');
      toast.success('Reactie geplaatst');
      qc.invalidateQueries({ queryKey: ['submission', id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="text-slate-500">Laden…</div>;
  if (!data?.s) return <div className="card p-6">Niet gevonden of nog niet goedgekeurd.</div>;

  const { s, replies, topic } = data;

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm mb-2">
          {topic && (
            <span className="badge" style={{ backgroundColor: (topic.color ?? '#00bcd4') + '22', color: topic.color ?? '#00bcd4' }}>
              {topic.icon} {topic.name}
            </span>
          )}
          <span className="text-slate-500 capitalize">{s.type}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{new Date(s.created_at).toLocaleDateString('nl-NL')}</span>
        </div>
        <h1 className="text-3xl font-bold">{s.title}</h1>
      </header>

      <div className="card p-6 whitespace-pre-wrap">{s.content}</div>

      {s.file_url && (
        <a href={s.file_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-sm">
          📎 Bewijsmateriaal bekijken
        </a>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Reacties van de redactie</h2>
        {replies.length === 0 ? (
          <div className="text-slate-500 text-sm">Nog geen reactie.</div>
        ) : (
          <div className="space-y-3">
            {replies.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="text-xs text-slate-500 mb-1">
                  Redactie · {new Date(r.created_at).toLocaleString('nl-NL')}
                </div>
                <div className="whitespace-pre-wrap">{r.content}</div>
              </div>
            ))}
          </div>
        )}

        {isStaff(profile) && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (reply.trim()) addReply.mutate(); }}
            className="mt-4 space-y-2"
          >
            <textarea
              className="input"
              rows={3}
              placeholder="Reageer namens de redactie…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <button disabled={addReply.isPending || !reply.trim()} className="btn-primary">
              {addReply.isPending ? 'Bezig…' : 'Reactie plaatsen'}
            </button>
          </form>
        )}
      </section>
    </article>
  );
}
