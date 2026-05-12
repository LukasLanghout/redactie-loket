import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, Sparkles, Send, Tag, X,
  Mail, Phone, FileText, MessageSquare, Plus, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/ai';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  created_at: string;
  anonymous: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  labels: string[];
  topics?: { name: string; icon: string | null } | null;
}

interface Reply {
  id: string;
  submission_id: string;
  content: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const THEMES = [
  "Alle thema's", 'Gezondheid en zorg', 'Werk en geld', 'Recht en onrecht',
  'Wonen en leefomgeving', 'Onderwijs en jeugd', 'Klimaat en duurzaamheid', 'Misinformatie en privacy',
];

const TYPE_FILTERS = ['Alle', 'Tips', 'Ervaringen', 'Vragen', 'Feedback', 'Opmerkingen'];
const TYPE_MAP: Record<string, string> = {
  Tips: 'tip', Ervaringen: 'ervaring', Vragen: 'vraag',
  Feedback: 'feedback', Opmerkingen: 'opmerking',
};

const STATUS_FILTERS = ['Alle', 'Nieuw', 'In behandeling', 'Afgerond', 'Gearchiveerd'];
const STATUS_MAP: Record<string, string> = {
  Nieuw: 'pending', 'In behandeling': 'reviewed',
  Afgerond: 'published', Gearchiveerd: 'archived',
};

const STATUSES = [
  { key: 'pending',   label: 'Nieuw' },
  { key: 'reviewed',  label: 'In behandeling' },
  { key: 'published', label: 'Afgerond' },
  { key: 'archived',  label: 'Gearchiveerd' },
];

const TYPE_NL: Record<string, string> = {
  tip: 'Tip', ervaring: 'Ervaring', feedback: 'Feedback',
  vraag: 'Vraag', opmerking: 'Opmerking', question: 'Vraag', experience: 'Ervaring',
};

const DOT_COLOR: Record<string, string> = {
  pending: 'bg-red-500', reviewed: 'bg-amber-400',
  published: 'bg-green-500', archived: 'bg-slate-400', rejected: 'bg-slate-400',
};

function timeAgo(iso: string) {
  const d   = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  if (days < 7)  return `${days}d geleden`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Shared filter bar components ──────────────────────────────────────────────

function PillBar({ options, active, onChange }: {
  options: string[]; active: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition whitespace-nowrap ${
            active === o
              ? 'bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function TabBar({ options, active, counts, onChange }: {
  options: string[]; active: string;
  counts?: Record<string, number>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`shrink-0 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            active === o
              ? 'bg-pointer text-pointer-foreground'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {o}
          {counts && counts[o] !== undefined && counts[o] > 0 && (
            <span className="ml-1 opacity-60">{counts[o]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  sub, onUpdate, onBack,
}: {
  sub: Submission;
  onUpdate: (patch: Partial<Submission>) => void;
  onBack?: () => void;        // mobile back button
}) {
  const qc = useQueryClient();
  const [summary, setSummary]       = useState<any>(null);
  const [loadingAi, setLoadingAi]   = useState(false);
  const [replyText, setReplyText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [showLabel, setShowLabel]   = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  const { data: replies = [], refetch: refetchReplies } = useQuery<Reply[]>({
    queryKey: ['replies', sub.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('redactie_replies').select('*')
        .eq('submission_id', sub.id).order('created_at');
      return data ?? [];
    },
  });

  useEffect(() => {
    setSummary(null);
    setLoadingAi(true);
    ai.analyze({ title: sub.title, content: sub.content, topicName: sub.topics?.name })
      .then(r => setSummary(r))
      .catch(() => setSummary(null))
      .finally(() => setLoadingAi(false));
  }, [sub.id]);

  async function setStatus(status: string) {
    const { error } = await supabase.from('submissions').update({ status }).eq('id', sub.id);
    if (error) { toast.error('Status bijwerken mislukt'); return; }
    onUpdate({ status });
    qc.invalidateQueries({ queryKey: ['redactie-submissions'] });
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    const { error } = await supabase.from('redactie_replies')
      .insert({ submission_id: sub.id, content: replyText.trim() });
    if (error) { toast.error('Reactie versturen mislukt'); setSending(false); return; }
    setReplyText('');
    setSending(false);
    refetchReplies();
    toast.success('Reactie opgeslagen');
  }

  async function addLabel(label: string) {
    const trimmed = label.trim();
    if (!trimmed || (sub.labels ?? []).includes(trimmed)) return;
    const newLabels = [...(sub.labels ?? []), trimmed];
    const { error } = await supabase.from('submissions').update({ labels: newLabels }).eq('id', sub.id);
    if (error) { toast.error('Label toevoegen mislukt'); return; }
    onUpdate({ labels: newLabels });
    qc.invalidateQueries({ queryKey: ['redactie-submissions'] });
    setLabelInput(''); setShowLabel(false);
  }

  async function removeLabel(label: string) {
    const newLabels = (sub.labels ?? []).filter(l => l !== label);
    const { error } = await supabase.from('submissions').update({ labels: newLabels }).eq('id', sub.id);
    if (error) { toast.error('Label verwijderen mislukt'); return; }
    onUpdate({ labels: newLabels });
    qc.invalidateQueries({ queryKey: ['redactie-submissions'] });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900">

      {/* Mobile back button + title */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-pointer mb-3 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Terug naar lijst
          </button>
        )}

        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-serif text-lg md:text-xl font-bold leading-tight flex-1">{sub.title}</h2>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <span className="text-xs border border-pointer text-pointer px-2 py-0.5">
              {TYPE_NL[sub.type] ?? sub.type}
            </span>
            {summary && (
              <span className={`text-xs border px-2 py-0.5 ${
                summary.sentiment === 'positief' ? 'border-green-400 text-green-600'
                : summary.sentiment === 'negatief' ? 'border-red-400 text-red-600'
                : 'border-slate-300 text-slate-500'
              }`}>
                {summary.sentiment}
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400">{fullDate(sub.created_at)}</div>

        {summary && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-400">Prioriteit</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-2 w-5 rounded-sm ${
                  i <= summary.priorityScore ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'
                }`} />
              ))}
            </div>
            <span className="text-xs text-slate-400">{summary.priorityScore}/5</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 md:px-6 py-4 space-y-6">

        {/* AI Summary */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-pointer" /> AI Samenvatting
          </div>
          {loadingAi ? (
            <div className="space-y-2">
              {[1, 0.8, 0.6].map((w, i) => (
                <div key={i} className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{summary.summary}</p>
              {summary.themes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {summary.themes.map((t: string) => (
                    <span key={t} className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Kon samenvatting niet laden.</p>
          )}
        </section>

        {/* Contact */}
        {(sub.contact_email || sub.contact_phone) && (
          <section>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              <Mail className="h-3.5 w-3.5" /> Contact
            </div>
            <div className="space-y-1.5">
              {sub.contact_email && (
                <a href={`mailto:${sub.contact_email}`}
                  className="flex items-center gap-2 text-sm text-pointer hover:underline break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {sub.contact_email}
                </a>
              )}
              {sub.contact_phone && (
                <a href={`tel:${sub.contact_phone}`}
                  className="flex items-center gap-2 text-sm text-pointer hover:underline">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {sub.contact_phone}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Conversation */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            <MessageSquare className="h-3.5 w-3.5" /> Gesprek
          </div>

          {replies.length > 0 && (
            <div className="space-y-2 mb-3">
              {replies.map(r => (
                <div key={r.id} className="bg-pointer/5 border border-pointer/20 px-3 py-2.5 text-sm">
                  <div className="text-xs text-slate-400 mb-1">Redactie · {timeAgo(r.created_at)}</div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="border border-slate-100 dark:border-slate-800 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed rounded-sm">
            {sub.content}
          </div>

          {(sub.contact_email || sub.contact_phone) && (
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-1.5">
                Reactie gaat naar {sub.contact_email ?? sub.contact_phone}
              </div>
              <div className="border border-slate-200 dark:border-slate-700 focus-within:border-pointer transition">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Schrijf een reactie naar de kijker…"
                  className="w-full bg-transparent text-sm px-3 py-2.5 resize-none focus:outline-none"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(); }}
                />
                <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400 hidden sm:block">Ctrl+Enter om te versturen</span>
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className="flex items-center gap-1.5 bg-pointer text-pointer-foreground text-xs px-3 py-1.5 font-medium hover:opacity-90 disabled:opacity-40 transition ml-auto"
                  >
                    <Send className="h-3 w-3" /> {sending ? 'Versturen…' : 'Stuur →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Status */}
        <section>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            <FileText className="h-3.5 w-3.5" /> Status
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={`px-3 py-1.5 text-xs font-medium border transition ${
                  sub.status === s.key
                    ? 'bg-pointer text-pointer-foreground border-pointer'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-pointer hover:text-pointer'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Labels */}
        <section className="pb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            <Tag className="h-3.5 w-3.5" /> Labels
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {(sub.labels ?? []).map(l => (
              <span key={l} className="flex items-center gap-1 text-xs border border-slate-300 dark:border-slate-600 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                {l}
                <button onClick={() => removeLabel(l)} className="hover:text-red-500 transition ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {showLabel ? (
              <input
                ref={labelRef}
                autoFocus
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addLabel(labelInput);
                  if (e.key === 'Escape') { setShowLabel(false); setLabelInput(''); }
                }}
                onBlur={() => { if (labelInput.trim()) addLabel(labelInput); else setShowLabel(false); }}
                placeholder="Nieuw label…"
                className="text-xs border border-pointer px-2 py-0.5 focus:outline-none w-28 bg-transparent"
              />
            ) : (
              <button
                onClick={() => setShowLabel(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-pointer border border-dashed border-slate-300 dark:border-slate-600 px-2 py-0.5 transition"
              >
                <Plus className="h-3 w-3" /> Label toevoegen
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Redactie() {
  const qc = useQueryClient();

  const [theme, setTheme]               = useState("Alle thema's");
  const [typeFilter, setTypeFilter]     = useState('Alle');
  const [statusFilter, setStatusFilter] = useState('Alle');
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('Nieuwste');
  const [selected, setSelected]         = useState<Submission | null>(null);
  const [showSort, setShowSort]         = useState(false);

  // On mobile: when a submission is selected we show the detail view full-screen
  const showDetail = !!selected;

  const { data: subs = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['redactie-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, title, content, type, status, created_at, anonymous, contact_email, contact_phone, labels, topics(name, icon)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Submission[];
    },
    refetchInterval: 30_000,
  });

  const filtered = subs.filter(s => {
    if (typeFilter !== 'Alle' && s.type !== TYPE_MAP[typeFilter]) return false;
    if (statusFilter !== 'Alle' && s.status !== STATUS_MAP[statusFilter]) return false;
    if (theme !== "Alle thema's") {
      const keyword = theme.toLowerCase().split(' ')[0];
      if (!s.topics?.name.toLowerCase().includes(keyword)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sort === 'Nieuwste'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const counts: Record<string, number> = {
    Alle: subs.length,
    Tips: subs.filter(s => s.type === 'tip').length,
    Ervaringen: subs.filter(s => s.type === 'ervaring').length,
    Vragen: subs.filter(s => s.type === 'vraag').length,
    Feedback: subs.filter(s => s.type === 'feedback').length,
    Opmerkingen: subs.filter(s => s.type === 'opmerking').length,
  };

  function patchSelected(patch: Partial<Submission>) {
    if (!selected) return;
    const updated = { ...selected, ...patch };
    setSelected(updated);
    qc.setQueryData<Submission[]>(['redactie-submissions'], old =>
      (old ?? []).map(s => s.id === updated.id ? { ...s, ...patch } : s)
    );
  }

  // ── Shared filter header (used by both mobile + desktop) ────────────────

  const FilterHeader = (
    <>
      {/* Theme pills */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
        <PillBar options={THEMES} active={theme} onChange={setTheme} />
      </div>

      {/* Type tabs */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5">
        <TabBar options={TYPE_FILTERS} active={typeFilter} counts={counts} onChange={setTypeFilter} />
      </div>

      {/* Status tabs */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5">
        <TabBar options={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Search + sort */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex gap-2 items-center">
        <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op naam of inhoud…"
            className="flex-1 text-xs bg-transparent focus:outline-none placeholder:text-slate-400 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-pointer shrink-0">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSort(s => !s)}
            className="flex items-center gap-1 text-xs border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-500 hover:border-pointer hover:text-pointer transition"
          >
            {sort} <ChevronDown className="h-3 w-3" />
          </button>
          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-10 w-28"
              >
                {['Nieuwste', 'Oudste'].map(o => (
                  <button
                    key={o}
                    onClick={() => { setSort(o); setShowSort(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition ${
                      sort === o ? 'text-pointer font-medium' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );

  // ── Submission list ─────────────────────────────────────────────────────

  const SubmissionList = (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
      {isLoading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mb-2" />
          <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4 mb-1.5" />
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
        </div>
      ))}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">Geen inzendingen gevonden</div>
      )}

      {!isLoading && sorted.map(s => (
        <button
          key={s.id}
          onClick={() => setSelected(s)}
          className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
            selected?.id === s.id ? 'bg-pointer/5 border-l-2 border-pointer' : ''
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${DOT_COLOR[s.status] ?? 'bg-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs text-slate-500 truncate">
                  {s.anonymous ? 'Anoniem' : (s.contact_email ?? 'Anoniem')}
                </span>
                <span className="text-xs text-slate-400 shrink-0">{timeAgo(s.created_at)}</span>
              </div>
              {s.topics && (
                <div className="text-[11px] text-pointer mb-0.5 truncate">
                  {s.topics.name}{s.topics.icon ? ` ${s.topics.icon}` : ''}
                </div>
              )}
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug">
                {s.content.slice(0, 120)}…
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-slate-500">
                  {TYPE_NL[s.type] ?? s.type}
                </span>
                {(s.labels ?? []).slice(0, 2).map(l => (
                  <span key={l} className="text-[10px] border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-slate-400">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>
      ))}

      {!isLoading && sorted.length > 0 && (
        <div className="px-4 py-3 text-xs text-slate-400 text-center">
          {sorted.length} van {subs.length} inzendingen
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render — mobile: single pane, desktop: split
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-stone-50 dark:bg-slate-950" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── MOBILE layout ──────────────────────────────────────────────────
           Show either the list OR the detail, never both side by side.
           The detail slides in from the right.                           */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        <AnimatePresence initial={false}>
          {!showDetail ? (
            /* List view */
            <motion.div
              key="list"
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {FilterHeader}
              {SubmissionList}
            </motion.div>
          ) : (
            /* Detail view */
            <motion.div
              key="detail"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <DetailPanel
                sub={selected!}
                onUpdate={patchSelected}
                onBack={() => setSelected(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DESKTOP layout ─────────────────────────────────────────────────
           Fixed left column (filters + list) + flexible right (detail).  */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* Left column */}
        <div className="w-[380px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
          {FilterHeader}
          {SubmissionList}
        </div>

        {/* Right column */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                <DetailPanel sub={selected} onUpdate={patchSelected} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Selecteer een inzending om te bekijken</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
