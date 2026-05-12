import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

const PROGRAMMAS = [
  {
    slug: 'pointer',
    naam: 'Pointer',
    omschrijving: 'Onderzoeksjournalistiek die misstanden blootlegt. Heb jij een tip voor ons?',
    kleur: '#E63946',
    emoji: '🔍',
  },
  {
    slug: 'keuringsdienst-van-waarde',
    naam: 'Keuringsdienst van Waarde',
    omschrijving: 'Wat zit er écht in ons eten? Signaleer jij misleidende claims of misstanden in de voedingsindustrie?',
    kleur: '#2196F3',
    emoji: '🧪',
  },
  {
    slug: 'de-slimste-mens',
    naam: 'De slimste mens',
    omschrijving: 'Heb je feedback op de vragen of het programma? Laat het ons weten.',
    kleur: '#FF9800',
    emoji: '🧠',
  },
  {
    slug: 'the-passion',
    naam: 'The Passion',
    omschrijving: 'Reacties, ervaringen of verhalen rondom The Passion? Deel ze met de redactie.',
    kleur: '#9C27B0',
    emoji: '✝️',
  },
  {
    slug: 'binnenstebuiten',
    naam: 'BinnensteBuiten',
    omschrijving: 'Zie jij kansen of misstanden in de natuur om je heen? Tip de redactie.',
    kleur: '#4CAF50',
    emoji: '🌿',
  },
  {
    slug: 'andere-tijden',
    naam: 'Andere Tijden',
    omschrijving: 'Heb je historische documenten, foto\'s of verhalen die aandacht verdienen?',
    kleur: '#795548',
    emoji: '📜',
  },
  {
    slug: 'brandpunt',
    naam: 'Brandpunt+',
    omschrijving: 'Diepgravende journalistiek over actuele kwesties. Ken jij een verhaal dat verteld moet worden?',
    kleur: '#F44336',
    emoji: '📡',
  },
  {
    slug: 'documentaires',
    naam: 'Documentaires',
    omschrijving: 'Heb je een onderwerp dat geschikt is voor een documentaire? Deel jouw idee.',
    kleur: '#607D8B',
    emoji: '🎬',
  },
] as const;

export default function Programmas() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Header */}
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-pointer mb-2">KRO-NCRV</div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Programma's</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Heb je iets meegemaakt dat relevant is voor een van onze programma's? Stuur direct een tip — het programma is al ingevuld.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROGRAMMAS.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="flex flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              {/* Colour tile */}
              <div
                className="h-36 flex items-center justify-center text-5xl"
                style={{ backgroundColor: p.kleur + '22' }}
              >
                <span aria-hidden>{p.emoji}</span>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-5">
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: p.kleur }}
                >
                  {p.naam}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1 mb-4">
                  {p.omschrijving}
                </p>
                <Link
                  to={`/intake?topic=${encodeURIComponent(p.naam)}&article=${encodeURIComponent(p.naam)}`}
                  className="group inline-flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: p.kleur }}
                >
                  <span className="inline-flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Tip insturen
                  </span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-serif text-xl font-bold mb-1">Ander programma?</div>
            <p className="text-sm text-slate-500">
              Staat jouw programma er niet bij? Je kunt ook een algemene tip insturen.
            </p>
          </div>
          <Link
            to="/intake"
            className="shrink-0 inline-flex items-center gap-2 bg-pointer text-pointer-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="h-4 w-4" />
            Algemene tip
          </Link>
        </div>
      </div>
    </div>
  );
}
