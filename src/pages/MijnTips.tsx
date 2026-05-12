import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Clock, LogOut, Sparkles, FileText,
  ArrowRight, Trash2, CheckSquare, Square, X,
} from 'lucide-react';
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

// ── TipCard ───────────────────────────────────────────────────────────────────

interface TipCardProps {
  tip: Submission;
  selected: boolean;
  selecting: boolean;       // bulk-select mode active
  onToggleSelect: () => void;
  onDelete: () => void;
}

function TipCard({ tip, selected, selecting, onToggleSelect, onDelete }: TipCardProps) {
  const [open, setOpen]           = useState(false);
  const [summary, setSummary]     = useState<AiSummary | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    if (selecting) { onToggleSelect(); return; }
    setOpen(o => !o);
    if (!open) loadSummary();
  }

  const status = STATUS_NL[tip.status] ?? STATUS_NL['pending'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      className={`border bg-white dark:bg-slate-900 overflow-hidden transition-colors ${
        selected
          ? 'border-pointer ring-1 ring-pointer/30'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-5">

        {/* Checkbox (always visible on hover, always visible in bulk mode) */}
        <button
          onClick={onToggleSelect}
          className={`shrink-0 mt-0.5 text-slate-300 hover:text-pointer transition-colors ${
            selecting || selected ? 'text-pointer' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={selected ? 'Deselecteer' : 'Selecteer'}
        >
          {selected
            ? <CheckSquare className="h-5 w-5" />
            : <Square className="h-5 w-5" />
          }
        </button>

        {/* Main clickable area */}
        <button
          onClick={toggle}
          className="flex-1 min-w-0 text-left"
        >
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
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Delete button */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded"
              aria-label="Verwijder tip"
              title="Verwijder"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 mr-1">Zeker?</span>
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600 transition rounded"
              >
                Ja
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Expand toggle */}
          <button onClick={toggle} className="p-1.5 text-slate-400">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MijnTips() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState(false);

  const selecting = selected.size > 0;

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

  // ── Delete helpers ──────────────────────────────────────────────────────

  async function deleteTip(id: string) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) { toast.error('Verwijderen mislukt'); return; }
    queryClient.setQueryData<Submission[]>(['my-tips', user?.id], old =>
      (old ?? []).filter(t => t.id !== id)
    );
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    toast.success('Tip verwijderd');
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = [...selected];
    const { error } = await supabase.from('submissions').delete().in('id', ids);
    if (error) { toast.error('Verwijderen mislukt'); setDeleting(false); return; }
    queryClient.setQueryData<Submission[]>(['my-tips', user?.id], old =>
      (old ?? []).filter(t => !ids.includes(t.id))
    );
    setSelected(new Set());
    setDeleting(false);
    toast.success(`${ids.length} ${ids.length === 1 ? 'tip' : 'tips'} verwijderd`);
  }

  function toggleSelect(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(tips.map(t => t.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ─────────────────────────────────────────────────────────────────────────

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
          className="group flex items-center justify-between border border-pointer/30 bg-pointer/5 px-5 py-4 mb-6 hover:bg-pointer/10 transition"
        >
          <span className="text-sm font-medium">Nieuwe tip insturen</span>
          <ArrowRight className="h-4 w-4 text-pointer transition-transform group-hover:translate-x-1" />
        </Link>

        {/* ── Bulk toolbar ── */}
        <AnimatePresence>
          {tips.length > 0 && (
            <motion.div
              key="toolbar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              {selecting ? (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {selected.size} van {tips.length} geselecteerd
                  </span>
                  <button
                    onClick={selected.size === tips.length ? clearSelection : selectAll}
                    className="text-xs text-pointer hover:underline"
                  >
                    {selected.size === tips.length ? 'Deselecteer alles' : 'Selecteer alles'}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={clearSelection}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Annuleer
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={deleting}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? 'Verwijderen…' : `Verwijder ${selected.size}`}
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400">{tips.length} {tips.length === 1 ? 'tip' : 'tips'}</span>
                  <div className="flex-1" />
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-pointer transition"
                  >
                    <CheckSquare className="h-3.5 w-3.5" /> Selecteer alles
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
            <AnimatePresence>
              {tips.map(tip => (
                <TipCard
                  key={tip.id}
                  tip={tip}
                  selected={selected.has(tip.id)}
                  selecting={selecting}
                  onToggleSelect={() => toggleSelect(tip.id)}
                  onDelete={() => deleteTip(tip.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
