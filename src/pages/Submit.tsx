import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ai } from '../lib/ai';
import type { Topic, SubmissionType } from '../lib/types';

export default function Submit() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const [topicId, setTopicId] = useState('');
  const [type, setType] = useState<SubmissionType>('tip');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [agree, setAgree] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [captcha, setCaptcha] = useState('');
  const [loading, setLoading] = useState(false);

  // AI state
  const [aiBusy, setAiBusy] = useState<null | 'cat' | 'imp'>(null);
  const [aiCat, setAiCat] = useState<{ topicName: string | null; type: SubmissionType; reasoning: string } | null>(null);
  const [aiImp, setAiImp] = useState<{ questions: string[]; rewrite: string } | null>(null);

  const captchaA = useMemo(() => Math.floor(Math.random() * 8) + 2, []);
  const captchaB = useMemo(() => Math.floor(Math.random() * 8) + 2, []);

  async function suggestCategory() {
    if (!content.trim() || content.length < 30) {
      toast.error('Schrijf eerst minstens een paar zinnen.');
      return;
    }
    setAiBusy('cat');
    try {
      const r = await ai.categorize({
        content,
        title,
        topics: topics.map((t) => ({ id: t.id, name: t.name, description: t.description })),
      });
      setAiCat({ topicName: r.topicName, type: r.type, reasoning: r.reasoning });
      if (r.topicId) setTopicId(r.topicId);
      if (r.type) setType(r.type);
      toast.success('AI heeft een onderwerp voorgesteld.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  }

  async function suggestImprovements() {
    if (!content.trim() || !title.trim()) {
      toast.error('Vul eerst titel en inhoud.');
      return;
    }
    setAiBusy('imp');
    try {
      const topicName = topics.find((t) => t.id === topicId)?.name ?? null;
      const r = await ai.improve({ title, content, topicName });
      setAiImp({ questions: r.questions, rewrite: r.rewrite });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) return toast.error('Akkoord met de voorwaarden is verplicht');
    if (parseInt(captcha, 10) !== captchaA + captchaB) return toast.error('Captcha klopt niet');
    if (!user) return toast.error('Niet ingelogd');

    setLoading(true);
    try {
      let fileUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('attachments').upload(path, file);
        if (upErr) {
          if (upErr.message?.toLowerCase().includes('bucket')) {
            toast('Bucket "attachments" bestaat niet — bestand wordt overgeslagen.', { icon: 'ℹ️' });
          } else throw upErr;
        } else {
          const { data } = supabase.storage.from('attachments').getPublicUrl(path);
          fileUrl = data.publicUrl;
        }
      }
      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        topic_id: topicId || null,
        type,
        title,
        content,
        contact_name: anonymous ? null : (name || null),
        contact_email: anonymous ? null : (email || null),
        contact_phone: anonymous ? null : (phone || null),
        anonymous,
        file_url: fileUrl,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Bedankt! Je tip is verstuurd.');
      navigate('/profile');
    } catch (err) {
      toast.error((err as Error).message || 'Versturen mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <aside className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Deel jouw verhaal</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Iedereen kan tips, vragen en ervaringen insturen. We lezen alles wat binnenkomt. Goedgekeurde
          bijdragen verschijnen in de community-feed en we reageren waar mogelijk.
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>✅ Anoniem insturen kan</li>
          <li>✅ Documenten als bewijs uploaden</li>
          <li>✅ Reactie van de redactie via je profiel</li>
          <li>🤖 AI helpt je je tip beter te maken</li>
        </ul>
        <div className="card p-4 bg-brand-50 dark:bg-slate-800 border-brand-200">
          <div className="text-xs uppercase tracking-wide font-semibold text-brand-700 dark:text-brand-300 mb-1">
            AI-assistent
          </div>
          <p className="text-sm">
            De assistent kan een onderwerp voorstellen en doorvragen die je tip helpen verbeteren.
            Niets wordt automatisch verstuurd — jij blijft de baas.
          </p>
        </div>
      </aside>

      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <div className="flex items-end justify-between gap-2">
            <label className="label">Onderwerp</label>
            <button
              type="button"
              onClick={suggestCategory}
              disabled={aiBusy !== null || topics.length === 0}
              className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50"
            >
              {aiBusy === 'cat' ? '🤖 Denkt na…' : '🤖 Stel onderwerp voor'}
            </button>
          </div>
          <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">— Kies een onderwerp —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
            ))}
          </select>
          {aiCat && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="font-semibold">AI-suggestie:</span> {aiCat.topicName ?? 'geen match'} ({aiCat.type}) — {aiCat.reasoning}
            </div>
          )}
        </div>

        <div>
          <label className="label">Type</label>
          <div className="flex gap-2">
            {(['tip', 'question', 'experience'] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`btn px-3 py-1 text-sm border ${
                  type === t ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {t === 'tip' ? 'Tip' : t === 'question' ? 'Vraag' : 'Ervaring'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Titel</label>
          <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <div className="flex items-end justify-between gap-2">
            <label className="label">Welke tip, vraag of ervaring wil je delen?</label>
            <button
              type="button"
              onClick={suggestImprovements}
              disabled={aiBusy !== null}
              className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50"
            >
              {aiBusy === 'imp' ? '🤖 Denkt na…' : '🤖 Help me deze beter maken'}
            </button>
          </div>
          <textarea required rows={6} className="input" value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        {aiImp && (
          <div className="card p-4 bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 mb-2">
                🤖 Doorvragen om je tip beter te maken
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {aiImp.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-300">
                Voorzichtige herschrijving (klik om te zien)
              </summary>
              <div className="mt-2 text-sm whitespace-pre-wrap">{aiImp.rewrite}</div>
              <button
                type="button"
                onClick={() => { setContent(aiImp.rewrite); toast.success('Inhoud vervangen'); }}
                className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
              >
                Gebruik deze herschrijving →
              </button>
            </details>
          </div>
        )}

        <details className="card p-3 bg-slate-50 dark:bg-slate-900">
          <summary className="cursor-pointer font-medium">Contactgegevens (optioneel)</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">Naam</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={anonymous} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={anonymous} />
            </div>
            <div>
              <label className="label">Telefoon</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={anonymous} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              Stuur anoniem in
            </label>
          </div>
        </details>

        <div>
          <label className="label">Bewijsmateriaal (optioneel)</label>
          <input type="file" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <div className="rounded-lg border border-slate-300 dark:border-slate-700 p-3">
          <label className="label">Captcha: hoeveel is {captchaA} + {captchaB}?</label>
          <input className="input" required value={captcha} onChange={(e) => setCaptcha(e.target.value)} />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
          <span>Ik ga akkoord met de voorwaarden en geef toestemming voor verwerking van mijn bijdrage.</span>
        </label>

        <button disabled={loading} className="btn-accent w-full">
          {loading ? 'Bezig…' : 'Tip versturen'}
        </button>
      </form>
    </div>
  );
}
