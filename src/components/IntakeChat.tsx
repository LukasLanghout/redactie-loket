import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowUp, Check, Paperclip, ShieldCheck, X,
  Lightbulb, Heart, MessageSquare, HelpCircle, Star, UserCircle, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/ai';
import { useAuth } from '../hooks/useAuth';
import type { Topic } from '../lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Kind = 'tip' | 'ervaring' | 'feedback' | 'vraag' | 'opmerking';

type Step =
  | 'type'
  | 'story'
  | 'ai_followup'
  | 'files'
  | 'consent_ask'
  | 'contact_info'
  | 'done';

interface BotMsg  { id: string; from: 'bot'; text: string }
interface UserMsg { id: string; from: 'user'; text: string }
interface FileMsg { id: string; from: 'user'; kind: 'file'; name: string; size: number }
type Msg = BotMsg | UserMsg | FileMsg;

// ─────────────────────────────────────────────────────────────────────────────
// Copy per kind
// ─────────────────────────────────────────────────────────────────────────────

const DISCLAIMER =
  'Let op: deel nooit gevoelige persoonsgegevens van anderen die niet relevant zijn voor het verhaal.';

const KIND_CONFIG: Record<Kind, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  storyPrompt: (article?: string | null) => string;
  consentQuestion: string;
  yesFlow: string;
  noFlow: string;
  thankYouContact: string;
}> = {
  tip: {
    label: 'Tip',
    icon: Lightbulb,
    desc: 'Ik heb iets gezien of meegemaakt dat onderzocht moet worden',
    storyPrompt: (a) =>
      a ? `Je wilt een tip geven over "${a}". Vertel ons meer — wat heb je gezien of meegemaakt?`
        : 'Je wilt een tip geven. Wat heb je gezien of meegemaakt?',
    consentQuestion: 'Mogen we in de toekomst contact met je opnemen voor diepgaand onderzoek?',
    yesFlow: 'Fijn! Laat je e-mailadres of telefoonnummer achter zodat een redacteur even kort met je kan sparren.',
    noFlow: 'Dat begrijpen we. Bedankt voor het delen — dit helpt ons om de impact van dit onderwerp beter te begrijpen.',
    thankYouContact: 'Bedankt! Een redacteur kijkt zo snel mogelijk naar je tip.',
  },
  ervaring: {
    label: 'Ervaring',
    icon: Heart,
    desc: 'Ik herken dit en wil mijn persoonlijke ervaring delen',
    storyPrompt: (a) =>
      a ? `Je wilt een persoonlijke ervaring delen over "${a}". Vertel ons meer:`
        : 'Je wilt een persoonlijke ervaring delen. Vertel ons meer:',
    consentQuestion: 'Mogen we jouw ervaring (eventueel volledig anoniem) gebruiken voor een vervolgverhaal?',
    yesFlow: 'Wat waardevol, dank je wel! Laat je e-mailadres of telefoonnummer achter zodat we even kunnen sparren.',
    noFlow: 'Dat begrijpen we. Bedankt voor het delen — persoonlijke verhalen geven kleur aan het nieuws.',
    thankYouContact: 'Bedankt! Een redacteur neemt zo snel mogelijk contact op.',
  },
  feedback: {
    label: 'Feedback',
    icon: MessageSquare,
    desc: 'Ik heb feedback of een correctie op de berichtgeving',
    storyPrompt: (a) =>
      a ? `Je hebt feedback op "${a}". Wat wil je ons laten weten?`
        : 'Je hebt feedback op onze berichtgeving. Vertel ons meer:',
    consentQuestion: 'Wil je op de hoogte blijven van onze reactie hierop?',
    yesFlow: 'Prima! Laat je e-mailadres achter, dan laten we je weten als we het artikel aanpassen.',
    noFlow: 'Geen probleem. Je feedback is direct doorgezet naar de eindredactie — bedankt!',
    thankYouContact: 'Bedankt! We laten je weten als we actie ondernemen.',
  },
  vraag: {
    label: 'Vraag',
    icon: HelpCircle,
    desc: 'Ik heb een vraag over dit onderwerp of over de redactie',
    storyPrompt: (a) =>
      a ? `Je hebt een vraag over "${a}". Stel hem hier:`
        : 'Je hebt een vraag over dit onderwerp of over onze redactie. Stel hem hier:',
    consentQuestion: '',
    yesFlow: '',
    noFlow: '',
    thankYouContact: '',
  },
  opmerking: {
    label: 'Opmerking',
    icon: Star,
    desc: 'Ik wil een algemene opmerking of compliment achterlaten',
    storyPrompt: (a) =>
      a ? `Je wilt een opmerking achterlaten over "${a}". Ga je gang:`
        : 'Je wilt een algemene opmerking achterlaten. Ga je gang:',
    consentQuestion: '',
    yesFlow: '',
    noFlow: '',
    thankYouContact: '',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface IntakeChatProps {
  preselectedTopic?: string | null;
  preselectedArticle?: string | null;
  /** Embedded mode: no full-page wrapper, compact header without back button */
  embedded?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function IntakeChat({
  preselectedTopic,
  preselectedArticle,
  embedded = false,
}: IntakeChatProps) {
  const { user } = useAuth();
  const fromArticle = !!preselectedTopic;

  const [showLoginPopup, setShowLoginPopup] = useState(!user);

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*').order('name')).data ?? [],
  });

  const [step, setStep]   = useState<Step>('type');
  const [kind, setKind]   = useState<Kind>('tip');
  const [msgs, setMsgs]   = useState<Msg[]>([
    { id: 'm0', from: 'bot', text: fromArticle
        ? `Je reageert op het artikel: "${preselectedArticle ?? preselectedTopic}". Wat wil je delen?`
        : 'Welkom bij Redactieloket. Wat wil je doen?' },
  ]);
  const [input, setInput]           = useState('');
  const [typing, setTyping]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [topicId, setTopicId]                   = useState<string | null>(null);
  const [story, setStory]                       = useState('');
  const [validatedRewrite, setValidatedRewrite] = useState('');
  const conversationLines                       = useRef<string[]>([]);
  const [files, setFiles]                       = useState<File[]>([]);
  const [contactEmail, setContactEmail]         = useState('');
  const [contactPhone, setContactPhone]         = useState('');
  const [shareConsent, setShareConsent]         = useState(false);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const didAutoType = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  useEffect(() => {
    if (didAutoType.current || !fromArticle || topics.length === 0) return;
    didAutoType.current = true;
    const match = topics.find(t => t.name.toLowerCase() === preselectedTopic!.toLowerCase());
    if (match) setTopicId(match.id);
    setKind('tip');
    (async () => {
      await delay(300);
      addBot(DISCLAIMER);
      await delay(700);
      addBot(KIND_CONFIG['tip'].storyPrompt(preselectedArticle));
      setStep('story');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function uid()  { return Math.random().toString(36).slice(2); }
  function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

  function addBot(text: string) {
    setTyping(true);
    return new Promise<void>(resolve => {
      setTimeout(() => {
        setMsgs(m => [...m, { id: uid(), from: 'bot', text }]);
        setTyping(false);
        resolve();
      }, 550);
    });
  }

  function addUser(text: string) {
    setMsgs(m => [...m, { id: uid(), from: 'user', text }]);
  }

  function addFileMsg(f: File) {
    setMsgs(m => [...m, { id: uid(), from: 'user', kind: 'file', name: f.name, size: f.size }]);
  }

  // ── Kind selection ──────────────────────────────────────────────────────

  async function pickKind(k: Kind) {
    setKind(k);
    const cfg = KIND_CONFIG[k];
    addUser(cfg.label);
    await addBot(DISCLAIMER);
    await addBot(cfg.storyPrompt(preselectedArticle));
    setStep('story');
  }

  // ── Send handler ─────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (step === 'story') {
      addUser(text);
      setStory(text);
      if (kind === 'tip') {
        conversationLines.current = [`Tipgever: ${text}`];
        await runIntakeAI();
      } else if (kind === 'vraag' || kind === 'opmerking') {
        await submitAndClose(text, false);
      } else {
        await addBot(KIND_CONFIG[kind].consentQuestion);
        setStep('consent_ask');
      }
      return;
    }

    if (step === 'ai_followup') {
      addUser(text);
      conversationLines.current.push(`Tipgever: ${text}`);
      await runIntakeAI();
      return;
    }

    if (step === 'files') {
      addUser(text);
      if (['nee', 'geen', 'skip', 'klaar', 'no'].includes(text.toLowerCase())) {
        await addBot(KIND_CONFIG['tip'].consentQuestion);
        setStep('consent_ask');
      }
      return;
    }

    if (step === 'contact_info') {
      addUser(text);
      if (!contactEmail) setContactEmail(text);
      else setContactPhone(text);
      await submitAndClose(story, true);
      return;
    }
  }

  // ── AI intake evaluation loop ─────────────────────────────────────────

  async function runIntakeAI() {
    setTyping(true);
    try {
      const conversation = conversationLines.current.join('\n');
      const r = await ai.intake({ conversation, topicName: preselectedTopic });
      setTyping(false);

      if (r.status === 'JUNK') {
        await addBot(r.message);
        return;
      }

      if (r.status === 'VALIDATED') {
        if (r.rewrite) setValidatedRewrite(r.rewrite);
        await addBot(r.message || 'Bedankt, we hebben genoeg informatie. Nog een laatste vraag:');
        await addBot("Heb je documenten, foto's of opnames als bewijs? Voeg ze toe via 📎, of klik op \"Geen bijlage\".");
        setStep('files');
        return;
      }

      conversationLines.current.push(`Redactie AI: ${r.message}`);
      await addBot(r.message);
      setStep('ai_followup');
    } catch {
      setTyping(false);
      await addBot(
        'De AI-assistent is tijdelijk niet beschikbaar. Probeer het opnieuw, of geef meer details (wat, wie, wanneer, waar).'
      );
    }
  }

  // ── Consent buttons ───────────────────────────────────────────────────

  async function pickConsent(yes: boolean) {
    setShareConsent(yes);
    const cfg = KIND_CONFIG[kind];
    addUser(yes ? 'Ja' : 'Nee');
    if (yes) {
      await addBot(cfg.yesFlow);
      setStep('contact_info');
    } else {
      await addBot(cfg.noFlow);
      await submitAndClose(story, false);
    }
  }

  // ── File upload ───────────────────────────────────────────────────────

  function onFilePick(list: FileList | null) {
    if (!list) return;
    Array.from(list).forEach(f => { setFiles(p => [...p, f]); addFileMsg(f); });
  }

  async function doneWithFiles() {
    await addBot(KIND_CONFIG['tip'].consentQuestion);
    setStep('consent_ask');
  }

  // ── Submit ────────────────────────────────────────────────────────────

  async function submitAndClose(mainStory: string, withContact: boolean) {
    setSubmitting(true);
    try {
      const transcript = conversationLines.current.join('\n');
      const content = [
        validatedRewrite || mainStory,
        transcript ? `\n\n---\n**Gesprekstranscript:**\n${transcript}` : '',
      ].join('');

      const title = mainStory.split(/[.!?\n]/)[0].slice(0, 80)
        || (preselectedTopic ?? 'Bijdrage via Redactieloket');

      const { error } = await supabase.from('submissions').insert({
        user_id: user?.id ?? null,
        topic_id: topicId,
        type: kind,
        title,
        content,
        contact_email: withContact ? contactEmail || null : null,
        contact_phone: withContact ? contactPhone || null : null,
        contact_name: null,
        anonymous: !withContact || (!contactEmail && !contactPhone),
        file_url: null,
        status: 'pending',
        share_consent: shareConsent,
      });
      if (error) throw error;

      setStep('done');
      const doneMsg = withContact
        ? KIND_CONFIG[kind].thankYouContact
        : kind === 'vraag'
          ? 'Bedankt voor je vraag. We kijken er zo snel mogelijk naar.'
          : kind === 'opmerking'
            ? 'Wat fijn om te horen! We delen je opmerking met het team.'
            : KIND_CONFIG[kind].noFlow;
      await addBot(doneMsg);
      toast.success('Verstuurd!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────

  const stepOrder: Step[] = ['type', 'story', 'ai_followup', 'files', 'consent_ask', 'contact_info', 'done'];
  const stepIdx = stepOrder.indexOf(step);
  const progress = Math.round(((stepIdx + 1) / stepOrder.length) * 100);

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  const chatHeight = embedded ? 'h-[560px]' : 'h-[calc(100vh-7rem)]';

  return (
    <>
      {/* Login popup — only in standalone mode */}
      {!embedded && (
        <AnimatePresence>
          {showLoginPopup && !user && (
            <motion.div
              key="login-popup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-7 shadow-2xl"
              >
                <div className="font-serif text-xl font-bold mb-1">Log in voor een persoonlijk overzicht</div>
                <p className="text-sm text-slate-500 mb-6">
                  Inloggen is niet verplicht. Als je ingelogd bent kun je jouw ingezonden tips altijd terugvinden — met AI-samenvatting.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="flex items-center gap-3 w-full border border-slate-900 dark:border-stone-50 px-5 py-3 text-sm font-medium hover:bg-slate-900 hover:text-stone-50 dark:hover:bg-stone-50 dark:hover:text-slate-900 transition"
                  >
                    <UserCircle className="h-5 w-5" />
                    Inloggen of account aanmaken
                  </Link>
                  <button
                    onClick={() => setShowLoginPopup(false)}
                    className="flex items-center gap-3 w-full border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 transition"
                  >
                    <EyeOff className="h-5 w-5" />
                    Blijf anoniem — gewoon tippen
                  </button>
                </div>
                <p className="mt-4 text-xs text-slate-400 text-center">
                  Je tip wordt altijd vertrouwelijk behandeld.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className={`flex flex-col ${chatHeight} border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>

        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center gap-3">
          {!embedded && (
            <Link to="/" className="text-slate-400 hover:text-pointer" aria-label="Terug">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="flex-1">
            <div className="font-serif text-base font-semibold leading-tight">Tip de redactie</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Vertrouwelijk · Bronbescherming
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <div className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div className="h-full bg-pointer" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          <AnimatePresence initial={false}>
            {msgs.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {'kind' in m ? (
                  <div className="max-w-[80%] flex items-center gap-2 px-4 py-2 bg-pointer/10 border border-pointer/30 text-sm">
                    <Paperclip className="h-4 w-4 text-pointer" />
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-slate-500">({Math.round(m.size / 1024)} KB)</span>
                  </div>
                ) : (
                  <div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.from === 'user'
                      ? 'bg-slate-900 text-stone-50 dark:bg-stone-50 dark:text-slate-900'
                      : 'bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}>
                    {m.text}
                  </div>
                )}
              </motion.div>
            ))}
            {typing && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-stone-100 dark:bg-slate-800 px-4 py-2 flex gap-1">
                  {[0, 120, 240].map(d => (
                    <span key={d} className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Type picker */}
        {step === 'type' && !fromArticle && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.entries(KIND_CONFIG) as [Kind, typeof KIND_CONFIG[Kind]][]).map(([k, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={k} onClick={() => pickKind(k)}
                  className="group flex flex-col items-start gap-1 border border-slate-200 dark:border-slate-700 p-3 text-left hover:border-pointer hover:bg-pointer/5 transition">
                  <Icon className="h-4 w-4 text-pointer" />
                  <span className="text-sm font-medium">{cfg.label}</span>
                  <span className="text-[11px] text-slate-500 leading-tight">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Consent buttons */}
        {step === 'consent_ask' && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-4 flex gap-3">
            <button onClick={() => pickConsent(true)}
              className="flex-1 bg-pointer text-pointer-foreground py-3 text-sm font-medium hover:opacity-90 transition">
              Ja
            </button>
            <button onClick={() => pickConsent(false)}
              className="flex-1 border border-slate-300 dark:border-slate-700 py-3 text-sm font-medium hover:border-slate-900 dark:hover:border-stone-50 transition">
              Nee
            </button>
          </div>
        )}

        {/* Files step */}
        {step === 'files' && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-4 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm hover:border-pointer hover:text-pointer transition">
              <Paperclip className="h-4 w-4" /> Bijlage toevoegen
              <input type="file" multiple className="hidden" onChange={e => onFilePick(e.target.files)} />
            </label>
            {files.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-pointer/10 border border-pointer/30 px-2 py-1">
                    {f.name}
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-pointer hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button onClick={doneWithFiles}
              className="ml-auto bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900 px-5 py-2.5 text-sm font-medium hover:opacity-90">
              {files.length > 0 ? `Klaar (${files.length})` : 'Geen bijlage'}
            </button>
          </div>
        )}

        {/* Text input */}
        {['story', 'ai_followup', 'contact_info'].includes(step) && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-end gap-2 bg-white dark:bg-slate-900">
            <textarea
              rows={2}
              placeholder={step === 'contact_info' ? 'E-mailadres of telefoonnummer…' : 'Typ je antwoord…'}
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none px-2 py-2 max-h-40"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
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

        {/* Done footer */}
        {step === 'done' && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4 bg-stone-50 dark:bg-slate-950 flex gap-3 flex-wrap">
            <Link to="/" className="bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90">
              Terug naar home
            </Link>
            <Link to="/intake" className="text-sm text-slate-500 hover:text-pointer self-center">
              Nog iets insturen →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
