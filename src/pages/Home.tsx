import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Eye, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Topic, Submission } from '../lib/types';

export default function Home() {
  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*').order('name')).data ?? [],
  });

  const { data: recent = [] } = useQuery<Submission[]>({
    queryKey: ['home-recent-3'],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('created_at', { ascending: false })
        .limit(3);
      return (data as Submission[]) ?? [];
    },
  });

  const topicById = new Map(topics.map((t) => [t.id, t]));
  const investigations = topics.slice(0, 3);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-12 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-7"
          >
            <div className="mb-5 inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs uppercase tracking-widest text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-pointer" /> Lopend onderzoek
            </div>
            <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Deel jouw<br />
              <span className="italic text-pointer">ervaring.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-400">
              Redactieloket onderzoekt misstanden samen met jou. Jouw verhaal kan het volgende onderzoek
              starten. Praat vertrouwelijk met onze digitale intake-assistent.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/intake"
                className="group inline-flex items-center gap-3 bg-slate-900 dark:bg-white px-6 py-4 text-base font-medium text-stone-50 dark:text-slate-900 transition-transform hover:-translate-y-0.5"
              >
                Start je tip
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Lock className="h-4 w-4" /> Vertrouwelijk · Bronbescherming
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="md:col-span-5"
          >
            <div className="relative h-full min-h-[320px] overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-pointer/80" />
              <div className="relative flex h-full flex-col justify-between p-8 text-stone-50">
                <div className="text-xs uppercase tracking-widest opacity-70">Uitgelicht onderzoek</div>
                <div>
                  <h2 className="font-serif text-3xl leading-tight">
                    "We hebben honderden meldingen nodig om patronen bloot te leggen."
                  </h2>
                  <div className="mt-4 text-sm opacity-80">— Redactie Redactieloket</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lopende onderzoeken */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-serif text-3xl md:text-4xl">Lopende onderzoeken</h2>
            <Link to="/feed" className="text-sm text-slate-500 hover:text-pointer">
              Alle onderzoeken →
            </Link>
          </div>
          {investigations.length === 0 ? (
            <div className="text-slate-500 text-sm">
              Nog geen onderwerpen. Run <code>database/seed.sql</code> in Supabase.
            </div>
          ) : (
            <div className="grid gap-px bg-slate-200 dark:bg-slate-800 md:grid-cols-3">
              {investigations.map((t) => (
                <Link
                  key={t.id}
                  to={`/feed?topic=${t.id}`}
                  className="group bg-stone-50 dark:bg-slate-950 p-7 transition-colors hover:bg-stone-100 dark:hover:bg-slate-900"
                >
                  <div className="text-[10px] uppercase tracking-widest text-pointer">{t.name}</div>
                  <h3 className="mt-3 font-serif text-2xl leading-tight">{t.icon} {t.name}</h3>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t.description ?? 'Lopend onderzoek door de redactie.'}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                    Lees meer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recente verhalen */}
      {recent.length > 0 && (
        <section className="border-b border-slate-200 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-3xl md:text-4xl">Recente verhalen</h2>
              <Link to="/feed" className="text-sm text-slate-500 hover:text-pointer">Alle verhalen →</Link>
            </div>
            <div className="grid gap-px bg-slate-200 dark:bg-slate-800 md:grid-cols-3">
              {recent.map((s) => {
                const t = s.topic_id ? topicById.get(s.topic_id) : null;
                return (
                  <Link
                    key={s.id}
                    to={`/submissions/${s.id}`}
                    className="group bg-stone-50 dark:bg-slate-950 p-7 transition-colors hover:bg-stone-100 dark:hover:bg-slate-900"
                  >
                    {t && <div className="text-[10px] uppercase tracking-widest text-pointer">{t.name}</div>}
                    <h3 className="mt-3 font-serif text-2xl leading-tight">{s.title}</h3>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{s.content}</p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                      Lees verder <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Tip CTA banner */}
      <section className="bg-slate-900 text-stone-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-pointer">Intake-assistent</div>
            <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              Heb je iets meegemaakt dat onderzocht moet worden?
            </h2>
            <p className="mt-5 max-w-lg text-stone-300">
              Onze AI-assistent helpt je in een paar minuten je verhaal te delen — natuurlijk, in gesprek,
              zonder formulieren.
            </p>
            <Link
              to="/intake"
              className="mt-8 inline-flex items-center gap-3 bg-pointer px-6 py-4 font-medium text-pointer-foreground transition-opacity hover:opacity-90"
            >
              Deel jouw ervaring <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="grid gap-4">
            {[
              { icon: ShieldCheck, t: 'Bronbescherming', d: 'Wat je deelt blijft binnen onze redactie.' },
              { icon: Eye, t: 'Onafhankelijk', d: 'Redactieloket is onafhankelijke onderzoeksjournalistiek.' },
              { icon: Lock, t: 'Veilig', d: 'Vertrouwelijke verwerking volgens journalistieke standaarden.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4 border border-stone-50/15 p-5">
                <Icon className="h-6 w-6 shrink-0 text-pointer" />
                <div>
                  <div className="font-medium">{t}</div>
                  <div className="text-sm text-stone-400">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
