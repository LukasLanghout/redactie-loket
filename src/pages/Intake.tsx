import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUp, Check, Paperclip, ShieldCheck, X, MessageSquare, Search, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/ai';
import type { Topic } from '../lib/types';

type SubmissionKind = 'tip' | 'vraag' | 'feedback';

type Step =
  | 'type'      // NEW: what kind of message?
  | 'topic'
  | 'story'
  | 'followup1'
  | 'followup2'
  | 'when'
  | 'who'
  | 'name'
  | 'email'
  | 'phone'
  | 'files'
  | 'privacy'   // NEW: share opt-in
  | 'optimizing'
  | 'done';

interface BotMsg { id: string; from: 'bot'; text: string }
interface UserMsg { id: string; from: 'user'; text: string }
interface FileMsg { id: string; from: 'user'; kind: 'file'; name: string; size: number }
type Msg = BotMsg | UserMsg | FileMsg;

const TYPE_PROMPT = "Welkom bij Redactieloket. Wat wil je doen?";
const TOPIC_PROMPT = "Waar gaat het over? Kies een onderwerp of typ je eigen omschrijving.";
const STORY_PROMPT = "Vertel het in je eigen woorden. Wat is er precies gebeurd? Hoe meer concrete details (wat, wie, wanneer, waar, waarom), hoe beter we het kunnen onderzoeken.";
const STORY_VRAAG_PROMPT = "Stel je vraag. Hoe concreter, hoe sneller we je kunnen helpen.";
const STORY_FEEDBACK_PROMPT = "Deel je feedback. Wat viel je op? Wat kan beter?";
const WHEN_PROMPT = "Wanneer en waar speelde dit zich af? (Datum, plaats — zo precies als je kunt.)";
const WHO_PROMPT = "Zijn er personen, organisaties of instanties bij betrokken die je hier wilt noemen?";
const NAME_PROMPT = "Hoe heet je? (Mag ook anoniem — typ dan 'anoniem'.)";
const EMAIL_PROMPT = "Wat is je e-mailadres? Daar reageert de redactie eventueel op. (Mag ook leeg blijven.)";
const PHONE_PROMPT = "Mogen we je bellen? Telefoonnummer is optioneel. (Typ 'nee' om over te slaan.)";
const FILES_PROMPT = "Heb je documenten, foto's of opnames als bewijs? Klik op 📎 om te uploaden. Geen bijlage? Typ 'klaar'.";
const PRIVACY_PROMPT = "Mogen we jouw bijdrage — volledig geanonimiseerd — delen in onze community-sectie zodat anderen erdoor geïnspireerd kunnen worden?";

// Bullshit filter: returns true if the text is too vague/short to be a real tip
const NOISE_PATTERN = /^(test|hallo|hello|hi|hey|ok|oke|ja|nee|neen|a|b|c|1|2|3|asdf|lol|wtf|hoi|dag|yo)\s*[.!?]*$/i;
function isNoise(text: string): boolean {
  if (text.length < 12) return true;
  if (NOISE_PATTERN.test(text.trim())) return true;
  // Flag if fewer than 4 distinct words
  const words = text.trim().split(/\s+/);
  if (words.length < 4) return true;
  return false;
}

export default function Intake() {
  const [searchParams] = useSearchParams();
  const preselectedTopic = searchParams.get('topic');
  const preselectedArticle = searchParams.get('article');
  // If coming from an article link, skip the 'type' step
  const fromArticle = !!preselectedTopic;

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*').order('name')).data ?? [],
  });

  const [step, setStep] = useState<Step>(fromArticle ? 'topic' : 'type');
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    if (fromArticle) return [{ id: 'm0', from: 'bot', text: TOPIC_PROMPT }];
    return [{ id: 'm0', from: 'bot', text: TYPE_PROMPT }];
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Collected answers
  const [submissionKind, setSubmissionKind] = useState<SubmissionKind>('tip');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [followups, setFollowups] = useState<{ q: string; a: string }[]>([]);
  const [pendingFollowups, setPendingFollowups] = useState<string[]>([]);
  const [whenWhere, setWhenWhere] = useState('');
  const [whoWhat, setWhoWhat] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [topicQuery, setTopicQuery] = useState('');
  const [shareConsent, setShareConsent] = useState<boolean | null>(null);
  // Track how many noise warnings shown for current story step
  const noiseWarningCount = useRef(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  // Auto-select topic from URL param (e.g. ?topic=Gezondheidszorg&article=...)
  const didPreselect = useRef(false);
  useEffect(() => {
    if (didPreselect.current) return;
    if (!preselectedTopic || topics.length === 0 || step !== 'topic') return;
    const match = topics.find(
      (t) => t.name.toLowerCase() === preselectedTopic.toLowerCase()
    );
    if (!match) return;
    didPreselect.current = true;
    setTopicId(match.id);
    setTopicName(match.name);
    const intro = preselectedArticle
      ? `Je tip gaat over het artikel: "${preselectedArticle}" (onderwerp: ${match.icon ?? ''} ${match.name}).`
      : `Onderwerp: ${match.icon ?? ''} ${match.name}`;
    setMsgs((m) => [
      ...m,
      { id: uid(), from: 'user', text: intro },
      { id: 'preselect-prompt', from: 'bot', text: STORY_PROMPT },
    ]);
    setStep('story');
  }, [preselectedTopic, preselectedArticle, topics, step]);

  function uid() { return Math.random().toString(36).slice(2); }

  function addBot(text: string) {
    setTyping(true);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setMsgs((m) => [...m, { id: uid(), from: 'bot', text }]);
        setTyping(false);
        resolve();
      }, 500);
    });
  }

  function addUser(text: string) {
    setMsgs((m) => [...m, { id: uid(), from: 'user', text }]);
  }

  function addFile(f: File) {
    setMsgs((m) => [...m, { id: uid(), from: 'user', kind: 'file', name: f.name, size: f.size }]);
  }

  // ── Type selection (step 'type') ──────────────────────────────────────────
  async function pickType(kind: SubmissionKind) {
    setSubmissionKind(kind);
    const label =
      kind === 'tip' ? '📌 Tip voor onderzoek' :
      kind === 'vraag' ? '❓ Vraag aan de redactie' :
      '💬 Feedback op het platform';
    addUser(label);
    await addBot(TOPIC_PROMPT);
    setStep('topic');
  }

  // ── Topic selection ───────────────────────────────────────────────────────
  async function pickTopic(t: Topic) {
    setTopicId(t.id);
    setTopicName(t.name);
    addUser(`${t.icon ?? ''} ${t.name}`.trim());
    const prompt =
      submissionKind === 'vraag' ? STORY_VRAAG_PROMPT :
      submissionKind === 'feedback' ? STORY_FEEDBACK_PROMPT :
      STORY_PROMPT;
    await addBot(prompt);
    setStep('story');
  }

  // ── Follow-up questions from AI ───────────────────────────────────────────
  async function fetchFollowups(currentStory: string) {
    try {
      const r = await ai.improve({
        title: currentStory.slice(0, 60),
        content: currentStory,
        topicName,
      });
      const qs = (r.questions ?? []).slice(0, 2);
      setPendingFollowups(qs);
      return qs;
    } catch {
      return [] as string[];
    }
  }

  // ── Main send handler ─────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (step === 'topic') {
      addUser(text);
      setTopicName(text);
      const prompt =
        submissionKind === 'vraag' ? STORY_VRAAG_PROMPT :
        submissionKind === 'feedback' ? STORY_FEEDBACK_PROMPT :
        STORY_PROMPT;
      await addBot(prompt);
      setStep('story');
      return;
    }

    if (step === 'story') {
      // ── Bullshit filter ──
      if (isNoise(text)) {
        noiseWarningCount.current += 1;
        // After 2 warnings, let them through (don't block forever)
        if (noiseWarningCount.current <= 2) {
          addUser(text);
          await addBot(
            'Dit lijkt geen concrete tip te bevatten. Kun je meer details geven — wat is er precies gebeurd, wanneer, en wie is erbij betrokken? Hoe meer context, hoe beter we je kunnen helpen.'
          );
          return;
        }
      }
      noiseWarningCount.current = 0;
      addUser(text);
      setStory(text);

      // Only ask AI follow-ups for tips (not vraag/feedback — they're simpler)
      if (submissionKind === 'tip') {
        setTyping(true);
        const qs = await fetchFollowups(text);
        setTyping(false);
        if (qs.length > 0) {
          await addBot(qs[0]);
          setStep('followup1');
          return;
        }
      }
      await addBot(WHEN_PROMPT);
      setStep('when');
      return;
    }

    if (step === 'followup1') {
      addUser(text);
      const q = pendingFollowups[0] ?? '';
      setFollowups((f) => [...f, { q, a: text }]);
      if (pendingFollowups.length > 1) {
        await addBot(pendingFollowups[1]);
        setStep('followup2');
      } else {
        await addBot(WHEN_PROMPT);
        setStep('when');
      }
      return;
    }

    if (step === 'followup2') {
      addUser(text);
      const q = pendingFollowups[1] ?? '';
      setFollowups((f) => [...f, { q, a: text }]);
      await addBot(WHEN_PROMPT);
      setStep('when');
      return;
    }

    if (step === 'when') {
      addUser(text);
      setWhenWhere(text);
      await addBot(WHO_PROMPT);
      setStep('who');
      return;
    }

    if (step === 'who') {
      addUser(text);
      setWhoWhat(text);
      await addBot(NAME_PROMPT);
      setStep('name');
      return;
    }

    if (step === 'name') {
      addUser(text);
      setName(text.toLowerCase() === 'anoniem' ? '' : text);
      await addBot(EMAIL_PROMPT);
      setStep('email');
      return;
    }

    if (step === 'email') {
      addUser(text);
      setEmail(text);
      await addBot(PHONE_PROMPT);
      setStep('phone');
      return;
    }

    if (step === 'phone') {
      addUser(text);
      const val = text.toLowerCase();
      setPhone(['nee', 'no', 'skip', '-'].includes(val) ? '' : text);
      await addBot(FILES_PROMPT);
      setStep('files');
      return;
    }

    if (step === 'files') {
      addUser(text);
      if (['klaar', 'nee', 'geen', 'skip'].includes(text.toLowerCase())) {
        await addBot(PRIVACY_PROMPT);
        setStep('privacy');
      }
      return;
    }
  }

  // ── Privacy opt-in ────────────────────────────────────────────────────────
  async function pickPrivacy(allow: boolean) {
    setShareConsent(allow);
    addUser(allow ? '✅ Mag gedeeld worden (geanonimiseerd)' : '🔒 Alleen voor de redactie');
    await addBot('Je verhaal wordt verwerkt en verbeterd…');
    setStep('optimizing');
    setTyping(true);
    await optimizeContent(allow);
    setTyping(false);
  }

  // ── AI-optimize then finalize ─────────────────────────────────────────────
  async function optimizeContent(consent = shareConsent ?? false) {
    try {
      const followupBlock = followups.map((f) => `• ${f.q}\n  → ${f.a}`).join('\n');
      const fullContent = [
        story,
        followups.length > 0 ? `\n\n**AI doorvragen:**\n${followupBlock}` : '',
        whenWhere ? `\n\n**Wanneer/waar:** ${whenWhere}` : '',
        whoWhat ? `\n\n**Wie/wat:** ${whoWhat}` : '',
      ].join('');

      const improved = await ai.improve({
        title: story.slice(0, 60),
        content: fullContent,
        topicName,
      });
      if (improved.rewrite) {
        setStory(improved.rewrite);
        setFollowups([]);
      }
      await finalize(consent);
    } catch {
      toast.error('Verbeteren mislukt, versturen originele versie');
      await finalize(consent);
    }
  }

  function onFilePick(list: FileList | null) {
    if (!list) return;
    Array.from(list).forEach((f) => { setFiles((prev) => [...prev, f]); addFile(f); });
  }

  async function finalize(consent = shareConsent ?? false) {
    setSubmitting(true);
    try {
      const followupBlock = followups.map((f) => `• ${f.q}\n  → ${f.a}`).join('\n');
      const fullContent = [
        story,
        followups.length > 0 ? `\n\n**AI doorvragen:**\n${followupBlock}` : '',
        whenWhere ? `\n\n**Wanneer/waar:** ${whenWhere}` : '',
        whoWhat ? `\n\n**Wie/wat:** ${whoWhat}` : '',
      ].join('');

      const title = story.split(/[.!?\n]/)[0].slice(0, 80) || (topicName ?? 'Tip via Redactieloket');

      const { error } = await supabase.from('submissions').insert({
        user_id: null,
        topic_id: topicId,
        type: submissionKind,
        title,
        content: fullContent,
        contact_name: name || null,
        contact_email: email || null,
        contact_phone: phone || null,
        anonymous: !name && !email && !phone,
        file_url: null,
        status: 'pending',
        share_consent: consent,
      });
      if (error) throw error;
      setStep('done');
      await addBot('Bedankt voor je bijdrage. De redactie heeft alles ontvangen en kijkt er zo snel mogelijk naar.');
      toast.success('Verstuurd!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Sidebar progress ──────────────────────────────────────────────────────
  const filled = {
    Type: step !== 'type',
    Onderwerp: !!topicName,
    Verhaal: !!story,
    ...(submissionKind === 'tip' && followups.length > 0 ? { Doorvragen: true } : {}),
    'Wanneer/waar': !!whenWhere,
    'Wie/wat': !!whoWhat,
    Naam: !!name || !['topic','story','followup1','followup2','when','who','name'].includes(step),
    Email: !!email || ['phone','files','privacy','optimizing','done'].includes(step),
    Bestanden: files.length > 0,
  };

  const filteredTopics = topicQuery
    ? topics.filter((t) => t.name.toLowerCase().includes(topicQuery.toLowerCase()))
    : topics;

  const stepsTotal = 9;
  const stepsDone = Object.values(filled).filter(Boolean).length;
  const progress = Math.round((stepsDone / stepsTotal) * 100);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-[1fr_300px] gap-6 px-4 py-6">

        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        <div className="flex flex-col h-[calc(100vh-7rem)] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-pointer" aria-label="Terug">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1">
              <div className="font-serif text-base font-semibold leading-tight">Tip de redactie</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Vertrouwelijk · Bronbescherming
              </div>
            </div>
            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <div className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-pointer"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span>{progress}%</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-3">
            <AnimatePresence initial={false}>
              {msgs.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {'kind' in m ? (
                    <div className="max-w-[80%] flex items-center gap-2 px-4 py-2 bg-pointer/10 border border-pointer/30 text-sm">
                      <Paperclip className="h-4 w-4 text-pointer" />
                      <span className="font-medium">{m.name}</span>
                      <span className="text-slate-500 text-xs">({Math.round(m.size / 1024)} KB)</span>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.from === 'user'
                          ? 'bg-slate-900 text-stone-50 dark:bg-stone-50 dark:text-slate-900'
                          : 'bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {m.text}
                    </div>
                  )}
                </motion.div>
              ))}
              {typing && (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-stone-100 dark:bg-slate-800 px-4 py-2 text-sm flex gap-1">
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Type picker (step 'type') ── */}
          {step === 'type' && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4 bg-stone-50 dark:bg-slate-950 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { kind: 'tip' as const, label: 'Tip voor onderzoek', icon: Search, desc: 'Ik heb een misstand gesignaleerd' },
                { kind: 'vraag' as const, label: 'Vraag aan de redactie', icon: MessageSquare, desc: 'Ik wil iets weten of navragen' },
                { kind: 'feedback' as const, label: 'Feedback op het platform', icon: Star, desc: 'Ik heb een opmerking of suggestie' },
              ]).map(({ kind, label, icon: Icon, desc }) => (
                <button
                  key={kind}
                  onClick={() => pickType(kind)}
                  className="group flex flex-col items-start gap-1 border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-pointer hover:bg-pointer/5 transition"
                >
                  <Icon className="h-5 w-5 text-pointer mb-1" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-slate-500">{desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Topic picker (step 'topic') ── */}
          {step === 'topic' && topics.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3 bg-stone-50 dark:bg-slate-950">
              <input
                className="w-full bg-transparent text-sm focus:outline-none mb-2 border-b border-slate-200 dark:border-slate-800 pb-1"
                placeholder="Zoek een onderwerp…"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filteredTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTopic(t)}
                    className="text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-pointer hover:text-pointer-foreground hover:border-pointer transition"
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Privacy opt-in (step 'privacy') ── */}
          {step === 'privacy' && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4 bg-stone-50 dark:bg-slate-950 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => pickPrivacy(false)}
                className="flex-1 border border-slate-300 dark:border-slate-700 px-4 py-3 text-sm hover:border-slate-900 dark:hover:border-stone-50 transition text-left"
              >
                <span className="font-medium block">🔒 Alleen voor de redactie</span>
                <span className="text-xs text-slate-500">Strikt vertrouwelijk</span>
              </button>
              <button
                onClick={() => pickPrivacy(true)}
                className="flex-1 border border-pointer bg-pointer/5 px-4 py-3 text-sm hover:bg-pointer/10 transition text-left"
              >
                <span className="font-medium block text-pointer">✅ Mag gedeeld worden</span>
                <span className="text-xs text-slate-500">Geanonimiseerd, ter inspiratie</span>
              </button>
            </div>
          )}

          {/* ── Text input (most steps) ── */}
          {!['type', 'topic', 'privacy', 'optimizing', 'done'].includes(step) && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-end gap-2 bg-white dark:bg-slate-900">
              {step === 'files' && (
                <label className="cursor-pointer p-2 text-slate-500 hover:text-pointer" title="Bestand toevoegen">
                  <Paperclip className="h-5 w-5" />
                  <input type="file" multiple className="hidden" onChange={(e) => onFilePick(e.target.files)} />
                </label>
              )}
              <textarea
                rows={1}
                placeholder={step === 'topic' ? 'Of typ je eigen onderwerp…' : 'Typ je antwoord…'}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none px-2 py-2 max-h-32"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              {step === 'files' && files.length > 0 && (
                <button
                  onClick={() => pickPrivacy(shareConsent ?? false)}
                  disabled={submitting}
                  className="bg-pointer text-pointer-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Versturen…' : 'Klaar — verder'}
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={!input.trim() || submitting}
                className="bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900 p-2 hover:opacity-90 disabled:opacity-40"
                aria-label="Verstuur"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Done footer ── */}
          {step === 'done' && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4 bg-stone-50 dark:bg-slate-950 flex gap-3">
              <Link
                to="/"
                className="bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Terug naar home
              </Link>
              <Link to="/intake" className="text-sm text-slate-500 hover:text-pointer self-center">
                Nog een tip insturen →
              </Link>
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sticky top-24 space-y-5">
            <div>
              <div className="font-serif text-lg font-semibold mb-1">Jouw bijdrage</div>
              <p className="text-xs text-slate-500">We bewaren niets totdat je klaar bent.</p>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Voortgang</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-pointer rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Checklist */}
            <ul className="space-y-2 text-sm">
              {Object.entries(filled).map(([k, ok]) => (
                <li key={k} className="flex items-center gap-2">
                  {ok ? (
                    <Check className="h-4 w-4 text-pointer shrink-0" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 inline-block border border-slate-300 dark:border-slate-700" />
                  )}
                  <span className={ok ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>{k}</span>
                </li>
              ))}
            </ul>

            {/* Privacy notice */}
            <div className="p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
              <ShieldCheck className="h-3 w-3 inline mr-1 text-pointer" />
              Je tipt anoniem. Geen account nodig.
            </div>

            {/* Attached files */}
            {files.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Bijlagen</div>
                <ul className="space-y-1 text-xs">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3 text-pointer shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-pointer"
                        aria-label="Verwijderen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
