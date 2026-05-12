import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Eye, Lock, MessageSquare, Pencil, Wifi, WifiOff, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';

type AiStatus = 'checking' | 'online' | 'offline';

// Featured articles — each linked to a topic in the database.
// Tipping on an article pre-fills the topic in the intake form via URL params.
const FEATURED_ARTICLES = [
  {
    slug: 'wachttijden-ggz',
    title: 'Maanden wachten op de GGZ: jongeren in de knel',
    excerpt:
      'Wachtlijsten in de jeugd-GGZ lopen op tot meer dan een jaar. Hulpverleners luiden de noodklok en ouders vertellen wat er in die tijd op het spel staat.',
    topic: 'Gezondheidszorg',
    tag: 'Onderzoek',
    accent: '#00bcd4',
    emoji: '🏥',
  },
  {
    slug: 'huisjesmelkers-randstad',
    title: 'Schimmige huisbazen: hoe huurders worden uitgeknepen',
    excerpt:
      'In de Randstad rekenen verhuurders honderden euro\'s te veel huur. We zoeken huurders die ervaringen willen delen — anoniem mag.',
    topic: 'Wonen',
    tag: 'Lopend onderzoek',
    accent: '#26a69a',
    emoji: '🏠',
  },
  {
    slug: 'lerarentekort-basisschool',
    title: 'Lerarentekort: noodgrepen op basisscholen onthuld',
    excerpt:
      'Directeuren grijpen naar bedenkelijke noodoplossingen om hun roosters rond te krijgen. Wat zie jij gebeuren op de school van je kinderen?',
    topic: 'Onderwijs',
    tag: 'Reportage',
    accent: '#7c4dff',
    emoji: '🎓',
  },
] as const;

export default function Home() {
  const [aiStatus, setAiStatus] = useState<AiStatus>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setAiStatus(d.gemini ? 'online' : 'offline'))
      .catch(() => setAiStatus('offline'));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Link
          to="/intake"
          className="group flex items-center gap-2 bg-pointer text-pointer-foreground shadow-lg px-5 py-3.5 font-medium text-sm hover:opacity-90 transition-all hover:shadow-xl hover:-translate-y-0.5"
          aria-label="Tip de redactie"
        >
          <Pencil className="h-4 w-4" />
          <span>Tip de redactie</span>
        </Link>
      </motion.div>
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

      {/* Featured artikelen met directe tip-CTA */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-widest text-pointer mb-2">
              Uitgelichte artikelen
            </div>
            <h2 className="font-serif text-3xl md:text-4xl">Waar werkt de redactie aan?</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Herken je iets in deze verhalen? Stuur direct een tip — het onderwerp is dan al ingevuld.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURED_ARTICLES.map((a) => (
              <motion.article
                key={a.slug}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5 }}
                className="flex flex-col border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950"
              >
                <div
                  className="flex h-40 items-center justify-center text-6xl"
                  style={{ backgroundColor: a.accent + '22' }}
                >
                  <span aria-hidden>{a.emoji}</span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div
                    className="mb-3 inline-flex w-fit items-center gap-2 border px-2 py-0.5 text-[10px] uppercase tracking-widest"
                    style={{ borderColor: a.accent, color: a.accent }}
                  >
                    {a.tag} · {a.topic}
                  </div>
                  <h3 className="font-serif text-xl leading-tight mb-2">{a.title}</h3>
                  <p className="flex-1 text-sm text-slate-600 dark:text-slate-400 mb-5">
                    {a.excerpt}
                  </p>
                  <Link
                    to={`/intake?topic=${encodeURIComponent(a.topic)}&article=${encodeURIComponent(
                      a.title
                    )}`}
                    className="group inline-flex items-center justify-between gap-2 bg-pointer px-4 py-3 text-sm font-medium text-pointer-foreground transition-opacity hover:opacity-90"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Stuur tip over dit artikel
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

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
      {/* AI Status bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
          {aiStatus === 'checking' && (
            <><Loader className="h-3.5 w-3.5 animate-spin" /> AI-assistent verbinden…</>
          )}
          {aiStatus === 'online' && (
            <><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <Wifi className="h-3.5 w-3.5 text-green-500" />
            <span>AI-assistent <strong className="text-green-600 dark:text-green-400">online</strong> — intake-assistent actief</span></>
          )}
          {aiStatus === 'offline' && (
            <><span className="h-2 w-2 rounded-full bg-red-500 inline-block animate-pulse" />
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
            <span>AI-assistent <strong className="text-red-600 dark:text-red-400">niet beschikbaar</strong> — tippen is nog wel mogelijk</span></>
          )}
        </div>
      </div>
    </div>
  );
}
