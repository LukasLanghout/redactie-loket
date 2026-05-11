// VPRO-style redactie dashboard ported to React Router + Supabase.
// Two-pane layout: filterable list (left) + detail panel (right).

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/ai';
import type {
  Submission,
  Topic,
  SubmissionType,
  RedactieStatus,
  Sentiment,
} from '../lib/types';

const TENANT = { naam: 'Redactieloket', kleur: '#E63946' };

const typeLabels: Record<SubmissionType, string> = {
  tip: 'Tip',
  question: 'Vraag',
  experience: 'Ervaring',
};

const typeBadge: Record<SubmissionType, string> = {
  tip: 'bg-green-50 text-green-700',
  question: 'bg-blue-50 text-blue-700',
  experience: 'bg-purple-50 text-purple-700',
};

const sentimentBadge: Record<Sentiment, string> = {
  positief: 'bg-green-50 text-green-700',
  neutraal: 'bg-gray-50 text-gray-600',
  negatief: 'bg-red-50 text-red-700',
};

const statusBadge: Record<RedactieStatus, string> = {
  nieuw: 'bg-blue-50 text-blue-700',
  in_behandeling: 'bg-amber-50 text-amber-700',
  afgehandeld: 'bg-green-50 text-green-700',
  gearchiveerd: 'bg-gray-50 text-gray-500',
};

const prioriteitDot = (p: number) =>
  p >= 4 ? 'bg-red-500' : p >= 3 ? 'bg-amber-400' : 'bg-gray-300';

// Helpers to read the editorial fields with safe defaults.
function getPrioriteit(s: Submission): number {
  return s.prioriteit ?? 3;
}
function getRedactieStatus(s: Submission): RedactieStatus {
  return (s.redactie_status as RedactieStatus | null) ?? 'nieuw';
}
function getSentiment(s: Submission): Sentiment {
  return (s.sentiment as Sentiment | null) ?? 'neutraal';
}
function getSamenvatting(s: Submission): string {
  return s.samenvatting ?? s.content.slice(0, 200);
}
function getLabels(s: Submission): string[] {
  return s.labels ?? [];
}
function getTrefwoorden(s: Submission): string[] {
  return s.trefwoorden ?? [];
}

// Searchable combobox for theme/onderwerp filter
function OnderwerpCombobox({
  waarde,
  opties,
  onChange,
}: {
  waarde: string;
  opties: string[];
  onChange: (v: string) => void;
}) {
  const [tekst, setTekst] = useState(waarde);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTekst(waarde);
  }, [waarde]);

  useEffect(() => {
    function buiten(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', buiten);
    return () => document.removeEventListener('mousedown', buiten);
  }, []);

  const gefilterd = opties.filter((o) =>
    o.toLowerCase().includes(tekst.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
        <input
          value={tekst}
          onChange={(e) => {
            setTekst(e.target.value);
            setOpen(true);
            onChange('');
          }}
          onFocus={() => setOpen(true)}
          placeholder="Zoek op thema..."
          className="flex-1 bg-transparent px-2 py-1.5 text-xs text-gray-700 outline-none"
        />
        {waarde && (
          <button
            onClick={() => {
              setTekst('');
              onChange('');
            }}
            className="px-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      {open && gefilterd.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {gefilterd.map((o) => (
            <button
              key={o}
              onMouseDown={() => {
                onChange(o);
                setTekst(o);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                waarde === o ? 'font-semibold' : 'text-gray-700'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Redactie() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [spam, setSpam] = useState(false);
  const [zoekterm, setZoekterm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');
  const [filterOnderwerp, setFilterOnderwerp] = useState('');
  const [sortBy, setSortBy] = useState<'datum' | 'prioriteit'>('datum');

  // Load topics once
  useEffect(() => {
    supabase
      .from('topics')
      .select('*')
      .order('name')
      .then(({ data }) => setTopics((data as Topic[]) ?? []));
  }, []);

  const topicById = new Map(topics.map((t) => [t.id, t]));
  const topicNames = topics.map((t) => t.name);

  const laad = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (spam) q = q.eq('is_spam', true);
    else q = q.or('is_spam.is.null,is_spam.eq.false');
    if (filterType) q = q.eq('type', filterType);
    if (filterStatus) q = q.eq('redactie_status', filterStatus);
    if (filterSentiment) q = q.eq('sentiment', filterSentiment);
    if (filterOnderwerp) {
      const topic = topics.find((t) => t.name === filterOnderwerp);
      if (topic) q = q.eq('topic_id', topic.id);
    }
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      setSubmissions([]);
    } else {
      setSubmissions((data as Submission[]) ?? []);
    }
    setLoading(false);
  }, [spam, filterType, filterStatus, filterSentiment, filterOnderwerp, topics]);

  useEffect(() => {
    laad();
  }, [laad]);

  function wisFilters() {
    setFilterOnderwerp('');
    setFilterType('');
    setFilterStatus('');
    setFilterSentiment('');
    setZoekterm('');
  }

  async function updateStatus(id: string, status: RedactieStatus) {
    const { error } = await supabase
      .from('submissions')
      .update({ redactie_status: status })
      .eq('id', id);
    if (error) return toast.error(error.message);
    setSubmissions((p) =>
      p.map((s) => (s.id === id ? { ...s, redactie_status: status } : s))
    );
    toast.success(`Status: ${status.replace('_', ' ')}`);
  }

  async function toggleSpam(id: string, current: boolean) {
    const { error } = await supabase
      .from('submissions')
      .update({ is_spam: !current })
      .eq('id', id);
    if (error) return toast.error(error.message);
    setSubmissions((p) => p.filter((s) => s.id !== id));
    setOpenId(null);
    toast.success(current ? 'Uit spam gehaald' : 'Gemarkeerd als spam');
  }

  async function voegLabelToe(id: string, label: string, huidige: string[]) {
    if (!label.trim() || huidige.includes(label)) return;
    const nieuw = [...huidige, label];
    const { error } = await supabase
      .from('submissions')
      .update({ labels: nieuw })
      .eq('id', id);
    if (error) return toast.error(error.message);
    setSubmissions((p) =>
      p.map((s) => (s.id === id ? { ...s, labels: nieuw } : s))
    );
  }

  async function verwijderLabel(id: string, label: string, huidige: string[]) {
    const nieuw = huidige.filter((l) => l !== label);
    const { error } = await supabase
      .from('submissions')
      .update({ labels: nieuw })
      .eq('id', id);
    if (error) return toast.error(error.message);
    setSubmissions((p) =>
      p.map((s) => (s.id === id ? { ...s, labels: nieuw } : s))
    );
  }

  async function analyseer(s: Submission) {
    toast.loading('AI analyseert...', { id: 'ai-' + s.id });
    try {
      const topicName = s.topic_id ? topicById.get(s.topic_id)?.name ?? null : null;
      const r = await ai.analyze({ title: s.title, content: s.content, topicName });
      const patch = {
        samenvatting: r.summary,
        trefwoorden: r.keywords ?? [],
        prioriteit: r.priorityScore ?? 3,
        sentiment: r.sentiment ?? 'neutraal',
        compleetheid_score: r.completenessScore ?? 5,
      };
      const { error } = await supabase
        .from('submissions')
        .update(patch)
        .eq('id', s.id);
      if (error) throw error;
      setSubmissions((p) =>
        p.map((x) => (x.id === s.id ? { ...x, ...patch } : x))
      );
      toast.success('AI-analyse klaar', { id: 'ai-' + s.id });
    } catch (e) {
      toast.error((e as Error).message, { id: 'ai-' + s.id });
    }
  }

  const gefilterd = submissions
    .filter((s) => {
      if (!zoekterm) return true;
      const q = zoekterm.toLowerCase();
      const topicName = s.topic_id ? topicById.get(s.topic_id)?.name ?? '' : '';
      return (
        (s.contact_name ?? '').toLowerCase().includes(q) ||
        getSamenvatting(s).toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        topicName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      sortBy === 'prioriteit'
        ? getPrioriteit(b) - getPrioriteit(a)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const geselecteerd = gefilterd.find((s) => s.id === openId) ?? null;
  const actieveFilters =
    filterOnderwerp || filterType || filterStatus || filterSentiment || zoekterm;

  return (
    <div className="h-[calc(100vh-5rem)] bg-gray-50 flex flex-col overflow-hidden -mx-6 -my-10">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: TENANT.kleur }}
          />
          <span className="font-semibold text-gray-900 text-sm">
            {TENANT.naam} — Redactie
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-xs">Inzending-inbox</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSpam(!spam);
              setOpenId(null);
            }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              spam
                ? 'border-red-300 text-red-600 bg-red-50'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {spam ? '← Inbox' : 'Spam'}
          </button>
          <a
            href="/intake"
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            Formulier ↗
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100 space-y-1.5">
            {/* Search */}
            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
              <svg
                className="w-3.5 h-3.5 text-gray-400 ml-2 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={zoekterm}
                onChange={(e) => setZoekterm(e.target.value)}
                placeholder="Zoek op naam of inhoud..."
                className="flex-1 bg-transparent px-2 py-1.5 text-xs text-gray-700 outline-none"
              />
              {zoekterm && (
                <button
                  onClick={() => setZoekterm('')}
                  className="px-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Theme combobox */}
            <OnderwerpCombobox
              waarde={filterOnderwerp}
              opties={topicNames}
              onChange={(v) => {
                setFilterOnderwerp(v);
                setOpenId(null);
              }}
            />

            {/* Other filters */}
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-50 text-gray-700 text-xs rounded-lg px-2 py-1.5 border border-gray-200 outline-none"
              >
                <option value="">Alle types</option>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-50 text-gray-700 text-xs rounded-lg px-2 py-1.5 border border-gray-200 outline-none"
              >
                <option value="">Alle statussen</option>
                <option value="nieuw">Nieuw</option>
                <option value="in_behandeling">In behandeling</option>
                <option value="afgehandeld">Afgehandeld</option>
                <option value="gearchiveerd">Gearchiveerd</option>
              </select>
              <select
                value={filterSentiment}
                onChange={(e) => setFilterSentiment(e.target.value)}
                className="bg-gray-50 text-gray-700 text-xs rounded-lg px-2 py-1.5 border border-gray-200 outline-none"
              >
                <option value="">Alle sentiment</option>
                <option value="positief">Positief</option>
                <option value="neutraal">Neutraal</option>
                <option value="negatief">Negatief</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'datum' | 'prioriteit')
                }
                className="bg-gray-50 text-gray-700 text-xs rounded-lg px-2 py-1.5 border border-gray-200 outline-none"
              >
                <option value="datum">Nieuwste eerst</option>
                <option value="prioriteit">Prioriteit</option>
              </select>
            </div>

            {actieveFilters && (
              <button
                onClick={wisFilters}
                className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
              >
                Filters wissen
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Laden...
              </div>
            ) : gefilterd.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Geen inzendingen gevonden.
              </div>
            ) : (
              gefilterd.map((s) => {
                const topic = s.topic_id ? topicById.get(s.topic_id) : null;
                return (
                  <button
                    key={s.id}
                    onClick={() => setOpenId(s.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                      openId === s.id ? 'bg-gray-50 border-l-2' : ''
                    }`}
                    style={
                      openId === s.id ? { borderLeftColor: TENANT.kleur } : {}
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${prioriteitDot(
                            getPrioriteit(s)
                          )}`}
                        />
                        <span className="text-xs font-semibold text-gray-800 truncate">
                          {s.anonymous
                            ? 'Anoniem'
                            : s.contact_name ?? 'Onbekend'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {new Date(s.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-gray-400 mb-1">
                      {topic ? `${topic.icon ?? ''} ${topic.name}` : '—'}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {getSamenvatting(s)}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          statusBadge[getRedactieStatus(s)]
                        }`}
                      >
                        {getRedactieStatus(s).replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          typeBadge[s.type]
                        }`}
                      >
                        {typeLabels[s.type]}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
            {gefilterd.length} van {submissions.length} inzending
            {submissions.length !== 1 ? 'en' : ''}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!geselecteerd ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Selecteer een inzending</p>
              </div>
            </div>
          ) : (
            <DetailPanel
              s={geselecteerd}
              topic={
                geselecteerd.topic_id
                  ? topicById.get(geselecteerd.topic_id)
                  : null
              }
              tenantKleur={TENANT.kleur}
              onStatusChange={updateStatus}
              onLabelAdd={voegLabelToe}
              onLabelRemove={verwijderLabel}
              onOnderwerpFilter={(o) => {
                setFilterOnderwerp(o);
                setOpenId(null);
              }}
              onAnalyze={analyseer}
              onToggleSpam={toggleSpam}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  s,
  topic,
  tenantKleur,
  onStatusChange,
  onLabelAdd,
  onLabelRemove,
  onOnderwerpFilter,
  onAnalyze,
  onToggleSpam,
}: {
  s: Submission;
  topic: Topic | null | undefined;
  tenantKleur: string;
  onStatusChange: (id: string, status: RedactieStatus) => void;
  onLabelAdd: (id: string, label: string, huidige: string[]) => void;
  onLabelRemove: (id: string, label: string, huidige: string[]) => void;
  onOnderwerpFilter: (o: string) => void;
  onAnalyze: (s: Submission) => void;
  onToggleSpam: (id: string, current: boolean) => void;
}) {
  const [labelInput, setLabelInput] = useState('');
  const [toonVolledig, setToonVolledig] = useState(false);
  const prio = getPrioriteit(s);
  const sent = getSentiment(s);
  const labels = getLabels(s);
  const trefwoorden = getTrefwoorden(s);
  const status = getRedactieStatus(s);
  const onderwerpNaam = topic?.name ?? 'Geen onderwerp';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <button
              onClick={() => topic && onOnderwerpFilter(topic.name)}
              className="text-lg font-bold text-gray-900 hover:underline underline-offset-2 text-left"
              title="Filter op dit thema"
            >
              {topic ? `${topic.icon ?? ''} ${onderwerpNaam} ↗` : onderwerpNaam}
            </button>
            <p className="text-sm text-gray-600">{s.title}</p>
            <p className="text-xs text-gray-400">
              {new Date(s.created_at).toLocaleString('nl-NL')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <span
              className={`text-xs px-2 py-1 rounded-lg font-medium ${
                typeBadge[s.type]
              }`}
            >
              {typeLabels[s.type]}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-lg font-medium ${sentimentBadge[sent]}`}
            >
              {sent}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Prioriteit</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-1.5 w-6 rounded-full ${
                  n <= prio
                    ? prio >= 4
                      ? 'bg-red-400'
                      : prio >= 3
                      ? 'bg-amber-400'
                      : 'bg-gray-300'
                    : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">{prio}/5</span>
        </div>
      </div>

      {/* Contact */}
      {(s.contact_name || s.contact_email || s.contact_phone) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Contact
          </h3>
          <div className="space-y-2.5">
            {s.contact_name && (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white"
                  style={{ backgroundColor: tenantKleur }}
                >
                  {s.contact_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {s.contact_name}
                </span>
              </div>
            )}
            {s.contact_email && (
              <a
                href={`mailto:${s.contact_email}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-blue-600 group-hover:underline">
                  {s.contact_email}
                </span>
              </a>
            )}
            {s.contact_phone && (
              <a
                href={`tel:${s.contact_phone}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-blue-600 group-hover:underline">
                  {s.contact_phone}
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* AI summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            AI Samenvatting
          </h3>
          <button
            onClick={() => onAnalyze(s)}
            className="text-xs text-blue-600 hover:underline"
          >
            {s.samenvatting ? 'Opnieuw analyseren' : 'AI-analyse uitvoeren'}
          </button>
        </div>
        {s.samenvatting ? (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              {s.samenvatting}
            </p>
            {trefwoorden.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {trefwoorden.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {s.compleetheid_score != null && (
              <p className="text-xs text-gray-400">
                Compleetheid: {s.compleetheid_score}/10
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Nog niet geanalyseerd. Klik op "AI-analyse uitvoeren" om de tip via
            Gemini te laten samenvatten.
          </p>
        )}
      </div>

      {/* Original message */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
        <button
          onClick={() => setToonVolledig(!toonVolledig)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Origineel bericht
          </h3>
          <span className="text-xs text-gray-400">
            {toonVolledig ? 'Verbergen ↑' : 'Tonen ↓'}
          </span>
        </button>
        {toonVolledig && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed pt-1">
            {s.content}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              'nieuw',
              'in_behandeling',
              'afgehandeld',
              'gearchiveerd',
            ] as RedactieStatus[]
          ).map((st) => (
            <button
              key={st}
              onClick={() => onStatusChange(s.id, st)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                status === st
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              style={status === st ? { backgroundColor: tenantKleur } : {}}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Labels
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {labels.length === 0 && (
            <span className="text-xs text-gray-400 italic">Geen labels</span>
          )}
          {labels.map((l) => (
            <span
              key={l}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full inline-flex items-center gap-1"
            >
              {l}
              <button
                onClick={() => onLabelRemove(s.id, l, labels)}
                className="text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onLabelAdd(s.id, labelInput, labels);
                setLabelInput('');
              }
            }}
            placeholder="Label toevoegen..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-gray-400"
          />
          <button
            onClick={() => {
              onLabelAdd(s.id, labelInput, labels);
              setLabelInput('');
            }}
            className="text-xs px-3 py-1.5 text-white rounded-lg font-medium"
            style={{ backgroundColor: tenantKleur }}
          >
            Toevoegen
          </button>
        </div>
      </div>

      {/* Spam toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <button
          onClick={() => onToggleSpam(s.id, !!s.is_spam)}
          className="text-xs text-red-600 hover:underline"
        >
          {s.is_spam
            ? '↩ Uit spam halen'
            : '🚫 Markeer als spam'}
        </button>
      </div>
    </div>
  );
}
