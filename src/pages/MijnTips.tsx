import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock, LogOut, Sparkles, FileText, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/ai';
import { useAuth } from '../hooks/useAuth';

interface Submission {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  created_at: string;
  topics?: { name: string; icon: string | null } | null;
}

interface AiSummary {
  summary: string;
  priority: string;
  priorityScore: number;
  completenessScore: number;
  themes: string[];
  sentiment: string;
}

const TYPE_NL: Record<string, string> = {
  tip: 'Tip', ervaring: 'Ervaring', feedback: 'Feedback',
  vraag: 'Vraag', opmerking: 'Opmerking', question: 'Vraag', experience: 'Ervaring',
};

const STATUS_NL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'In behandeling', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' },
  reviewed:  { label: 'Bekeken',        color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' },
  published: { label: 'Gepubliceerd',   color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' },
  rejected:  { label: 'Niet gebruikt',  color: 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Gisteren';
  if (days < 7)  return `${days} dagen geleden`;
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function TipCard({ tip }: { tip: Submission }) {
  const [open, setOpen]           = useState(false);
  const [summary, setSummary]     = useState<AiSummary | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  async function loadSummary() {
    if (summary || loadingAi) return;
    setLoadingAi(true);
    try {
      const r = await ai.analyze({ title: tip.title, content: tip.content, topicName: tip.topics?.name });
      setSummary(r as unknown as AiSummary);
    } catch {
      toast.error('Samenvatting kon niet worden geladen');
    } finally {
      setLoadingAi(false);
    }
  }

  function toggle() {
    setOpen(o => !o);
    if (!open) loadSummary();
  }

  const status = STATUS_NL[tip.status] ?? STATUS_NL['pending'];

  return (
    <motion.div
      layout
      className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={toggle}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-medium text-pointer uppercase tracking-widest">
              {TYPE_NL[tip.type] ?? tip.type}
            </span>
            {tip.topics && (
              <span className="text-xs text-slate-400">
                {tip.topics.icon} {tip.topics.name}
              </span>
            )}
            <span className={`text-[11px] border px-2 py-0.5 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="font-serif text-base leading-snug line-clamp-2">{tip.title}</div>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
            <Clock className="h-3 w-3" /> {timeAgo(tip.created_at)}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-1" />}
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-5">

              {/* AI Summary */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pointer mb-3">
                  <Sparkles className="h-3.5 w-3.5" /> AI-samenvatting
                </div>
                {loadingAi ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-4/5" />
                  </div>
                ) : summary ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {summary.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {summary.themes?.map(t => (
                        <span key={t} className="text-[11px] border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-slate-500">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-center">
                      <div className="border border-slate-100 dark:border-slate-800 p-2">
                        <div className="font-semibold text-pointer">{summary.priorityScore}/5</div>
                        <div className="text-slate-400">Prioriteit</div>
                      </div>
                      <div className="border border-slate-100 dark:border-slate-800 p-2">
                        <div className="font-semibold text-pointer">{summary.completenessScore}/10</div>
                        <div className="text-slate-400">Volledigheid</div>
                      </div>
                      <div className="border border-slate-100 dark:border-slate-800 p-2">
                        <div className="font-semibold text-pointer capitalize">{summary.sentiment}</div>
                        <div className="text-slate-400">Toon</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Samenvatting kon niet worden geladen.</p>
                )}
              </div>

              {/* Original text */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  <FileText className="h-3.5 w-3.5" /> Originele tekst
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {tip.content}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MijnTips() {
  const { user, loading: authLoading } = useAuth();

  const { data: tips = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['my-tips', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, title, content, type, status, created_at, topics(name, icon)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Submission[];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success('Uitgelogd');
  }

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-pointer mb-2">Persoonlijk overzicht</div>
            <h1 className="font-serif text-4xl font-bold">Mijn tips</h1>
            <p className="mt-2 text-sm text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-pointer mt-1 shrink-0"
          >
            <LogOut className="h-4 w-4" /> Uitloggen
          </button>
        </div>

        {/* CTA */}
        <Link
          to="/intake"
          className="group flex items-center justify-between border border-pointer/30 bg-pointer/5 px-5 py-4 mb-8 hover:bg-pointer/10 transition"
        >
          <span className="text-sm font-medium">Nieuwe tip insturen</span>
          <ArrowRight className="h-4 w-4 text-pointer transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Tips */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mb-3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && tips.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <FileText className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Nog geen tips</p>
            <p className="text-sm mb-6">Als je ingelogd bent terwijl je tipt, verschijnen ze hier.</p>
            <Link to="/intake" className="inline-flex items-center gap-2 bg-pointer text-pointer-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90">
              Start een tip <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {!isLoading && tips.length > 0 && (
          <div className="space-y-3">
            {tips.map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        )}
      </div>
    </div>
  );
}
