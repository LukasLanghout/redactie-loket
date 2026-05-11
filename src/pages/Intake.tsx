import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUp, Check, Lock, Paperclip, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ai } from '../lib/ai';
import type { Topic } from '../lib/types';

type Step =
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
  | 'optimizing'
  | 'done';

interface BotMsg { id: string; from: 'bot'; text: string }
interface UserMsg { id: string; from: 'user'; text: string }
interface FileMsg { id: string; from: 'user'; kind: 'file'; name: string; size: number }
type Msg = BotMsg | UserMsg | FileMsg;

const TOPIC_PROMPT = "Welkom bij Redactieloket. Ik help je in een paar minuten je verhaal te delen met onze redactie. Waar gaat het over? Kies een onderwerp of typ je eigen omschrijving.";
const STORY_PROMPT = "Vertel het in je eigen woorden. Wat is er gebeurd? Hoe meer concrete details (wat, wie, wanneer, waar), hoe beter we het kunnen onderzoeken.";
const WHEN_PROMPT = "Wanneer en waar speelde dit zich af? (Datum, plaats — zo precies als je kunt.)";
const WHO_PROMPT = "Zijn er personen, organisaties of instanties bij betrokken die je hier wilt noemen?";
const NAME_PROMPT = "Hoe heet je? (Mag ook anoniem — typ dan 'anoniem'.)";
const EMAIL_PROMPT = "Wat is je e-mailadres? Daar reageert de redactie eventueel op. (Mag ook leeg blijven.)";
const PHONE_PROMPT = "Mogen we je bellen? Telefoonnummer is optioneel.";
const FILES_PROMPT = "Heb je documenten, foto's of opnames als bewijs? Sleep ze hier of klik op 📎. Klaar zonder bijlage? Typ 'klaar'.";

export default function Intake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTopic = searchParams.get('topic');
  const preselectedArticle = searchParams.get('article');

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*').order('name')).data ?? [],
  });

  const [step, setStep] = useState<Step>('topic');
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'm0', from: 'bot', text: TOPIC_PROMPT },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Collected answers
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  // Auto-select topic from URL param (e.g. ?topic=Gezondheidszorg&article=lange+wachttijden)
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

  async function pickTopic(t: Topic) {
    setTopicId(t.id);
    setTopicName(t.name);
    addUser(`${t.icon ?? ''} ${t.name}`.trim());
    await addBot(STORY_PROMPT);
    setStep('story');
  }

  async function fetchFollowups(currentStory: string) {
    try {
      const r = await ai.improve({
        title: currentStory.slice(0, 60),
        content: currentStory,
        topicName,
      });
      // Use up to 2 questions to keep it conversational
      const qs = (r.questions ?? []).slice(0, 2);
      setPendingFollowups(qs);
      return qs;
    } catch {
      return [] as string[];
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (step === 'topic') {
      addUser(text);
      // No topic match yet — accept as freeform; topicId stays null
      setTopicName(text);
      await addBot(STORY_PROMPT);
      setStep('story');
      return;
    }
    if (step === 'story') {
      addUser(text);
      setStory(text);
      // Ask Groq for follow-up questions
      setTyping(true);
      const qs = await fetchFollowups(text);
      setTyping(false);
      if (qs.length > 0) {
        await addBot(qs[0]);
        setStep('followup1');
      } else {
        await addBot(WHEN_PROMPT);
        setStep('when');
      }
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
      setPhone(text);
      await addBot(FILES_PROMPT);
      setStep('files');
      return;
    }
    if (step === 'files') {
      addUser(text);
      if (['klaar', 'nee', 'geen', 'skip'].includes(text.toLowerCase())) {
        // Go to optimizing step to improve content via Groq
        await addBot('Je verhaal wordt aangevuld en verbeterd...');
        setStep('optimizing');
        setTyping(true);
        await optimizeContent();
        setTyping(false);
      }
    }
  }

  async function optimizeContent() {
    try {
      // Assemble full content exactly as finalize does
      const followupBlock = followups
        .map((f) => `• ${f.q}\n  → ${f.a}`)
        .join('\n');
      const fullContent = [
        story,
        followups.length > 0 ? `\n\n**AI doorvragen:**\n${followupBlock}` : '',
        whenWhere ? `\n\n**Wanneer/waar:** ${whenWhere}` : '',
        whoWhat ? `\n\n**Wie/wat:** ${whoWhat}` : '',
      ].join('');

      // Improve full content via Groq
      const improved = await ai.improve({
        title: story.slice(0, 60),
        content: fullContent,
        topicName,
      });

      // Update story with improved rewrite - this becomes the new full content
      if (improved.rewrite) {
        setStory(improved.rewrite);
        // Clear followups so they don't get added again in finalize
        setFollowups([]);
      }

      // Finalize submission with improved content
      await finalize();
    } catch (e) {
      toast.error('Verbeteren mislukt, versturen originele versie');
      await finalize();
    }
  }

  function onFilePick(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list);
    arr.forEach((f) => { setFiles((prev) => [...prev, f]); addFile(f); });
  }

  async function finalize() {
    if (!user) {
      toast.error('Je moet ingelogd zijn om te versturen. We bewaren je antwoorden niet.');
      navigate('/login', { state: { from: '/intake' } });
      return;
    }
    setSubmitting(true);
    try {
      // Upload files (best-effort, skip on bucket missing)
      const uploaded: string[] = [];
      for (const f of files) {
        const path = `${user.id}/${Date.now()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from('attachments').upload(path, f);
        if (!upErr) {
          const { data } = supabase.storage.from('attachments').getPublicUrl(path);
          uploaded.push(data.publicUrl);
        }
      }

      const followupBlock = followups
        .map((f) => `• ${f.q}\n  → ${f.a}`)
        .join('\n');
      const fullContent = [
        story,
        followups.length > 0 ? `\n\n**AI doorvragen:**\n${followupBlock}` : '',
        whenWhere ? `\n\n**Wanneer/waar:** ${whenWhere}` : '',
        whoWhat ? `\n\n**Wie/wat:** ${whoWhat}` : '',
      ].join('');

      const title = story.split(/[.!?\n]/)[0].slice(0, 80) || (topicName ?? 'Tip via intake-assistent');

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        topic_id: topicId,
        type: 'tip',
        title,
        content: fullContent,
        contact_name: name || null,
        contact_email: email || null,
        contact_phone: phone || null,
        anonymous: !name && !email && !phone,
        file_url: uploaded[0] ?? null,
        status: 'pending',
      });
      if (error) throw error;
      setStep('done');
      await addBot('Bedankt voor je tip. We hebben alles ontvangen en de redactie kijkt er zo snel mogelijk naar. Je kunt de status volgen op je profielpagina.');
      toast.success('Tip verstuurd');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Summary sidebar progress
  const filled = {
    Onderwerp: !!topicName,
    Verhaal: !!story,
    Doorvragen: followups.length > 0,
    'Wanneer/waar': !!whenWhere,
    'Wie/wat': !!whoWhat,
    Naam: !!name || step !== 'topic' && step !== 'story' && step !== 'followup1' && step !== 'followup2' && step !== 'when' && step !== 'who' && step !== 'name',
    Email: !!email || step === 'phone' || step === 'files' || step === 'done',
    Telefoon: !!phone || step === 'files' || step === 'done',
    Bestanden: files.length > 0,
  };

  const filteredTopics = topicQuery
    ? topics.filter((t) => t.name.toLowerCase().includes(topicQuery.toLowerCase()))
    : topics;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-[1fr_320px] gap-6 px-4 py-6">
        {/* Chat */}
        <div className="flex flex-col h-[calc(100vh-7rem)] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-slate-400 hover:text-pointer" aria-label="Terug">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="font-serif text-base font-semibold leading-tight">Intake-assistent</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Vertrouwelijk · Bronbescherming
                </div>
              </div>
            </div>
            <Link to="/submit" className="text-xs text-slate-500 hover:text-pointer">
              Liever het klassieke formulier? →
            </Link>
          </div>

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
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-stone-100 dark:bg-slate-800 px-4 py-2 text-sm flex gap-1">
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Topic picker shown only in step 'topic' */}
          {step === 'topic' && topics.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3 bg-stone-50 dark:bg-slate-950">
              <input
                className="w-full bg-transparent text-sm focus:outline-none mb-2 border-b border-slate-200 dark:border-slate-800 pb-1"
                placeholder="Zoek een onderzoek…"
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

          {/* Input */}
          {step !== 'done' && (
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
                  onClick={finalize}
                  disabled={submitting}
                  className="bg-pointer text-pointer-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Versturen…' : 'Klaar — verstuur'}
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

          {step === 'done' && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4 bg-stone-50 dark:bg-slate-950 flex gap-3">
              <Link to="/profile" className="bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90">
                Bekijk mijn tip
              </Link>
              <Link to="/" className="text-sm text-slate-500 hover:text-pointer self-center">
                Terug naar home
              </Link>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <aside className="hidden lg:block">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sticky top-24">
            <div className="font-serif text-lg font-semibold mb-1">Jouw tip</div>
            <p className="text-xs text-slate-500 mb-4">We bewaren niets totdat je op verstuur klikt.</p>
            <ul className="space-y-2 text-sm">
              {Object.entries(filled).map(([k, ok]) => (
                <li key={k} className="flex items-center gap-2">
                  {ok ? (
                    <Check className="h-4 w-4 text-pointer" />
                  ) : (
                    <span className="h-4 w-4 inline-block border border-slate-300 dark:border-slate-700" />
                  )}
                  <span className={ok ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>{k}</span>
                </li>
              ))}
            </ul>
            {!user && (
              <div className="mt-4 p-3 border border-amber-300 bg-amber-50 dark:bg-slate-800 text-xs">
                <Lock className="h-3 w-3 inline mr-1" />
                Je moet inloggen om te versturen. <Link to="/login" state={{ from: '/intake' }} className="text-pointer font-semibold">Inloggen →</Link>
              </div>
            )}
            {files.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Bijlagen</div>
                <ul className="space-y-1 text-xs">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3 text-pointer" />
                      <span className="truncate">{f.name}</span>
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
