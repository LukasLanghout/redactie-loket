import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare } from 'lucide-react';

const ARTICLES = [
  {
    slug: 'wachttijden-ggz',
    title: 'Maanden wachten op de GGZ: jongeren in de knel',
    excerpt:
      'Wachtlijsten in de jeugd-GGZ lopen op tot meer dan een jaar. Hulpverleners luiden de noodklok en ouders vertellen wat er in die tijd op het spel staat.',
    topic: 'Gezondheidszorg',
    tag: 'Onderzoek',
    date: '12 mei 2026',
    accent: '#00bcd4',
    emoji: '🏥',
    body: `De wachtlijsten in de Nederlandse jeugd-GGZ zijn in de afgelopen drie jaar verdubbeld. Uit cijfers die Redactieloket opvroeg bij zeventien grote aanbieders blijkt dat jongeren gemiddeld 14 maanden wachten voor een eerste behandeling. In sommige regio's loopt dat op tot meer dan twee jaar.

Ouders en hulpverleners zijn wanhopig. "We zien kinderen verslechteren terwijl ze op een lijst staan," zegt een orthopedagoog die anoniem wil blijven. "Dat is niet te verdedigen."

Herken jij dit? Heb jij zelf gewacht, of wacht je nog? Stuur ons jouw verhaal — anoniem mag.`,
  },
  {
    slug: 'huisjesmelkers-randstad',
    title: 'Schimmige huisbazen: hoe huurders worden uitgeknepen',
    excerpt:
      'In de Randstad rekenen verhuurders honderden euro\'s te veel huur. We zoeken huurders die ervaringen willen delen — anoniem mag.',
    topic: 'Wonen',
    tag: 'Lopend onderzoek',
    date: '5 mei 2026',
    accent: '#26a69a',
    emoji: '🏠',
    body: `Uit een analyse van meer dan 400 huurcontracten die Redactieloket ontving, blijkt dat een op de vijf huurders in de grote steden méér betaalt dan het wettelijk toegestane maximum. Gemiddeld gaat het om €280 per maand te veel.

De meeste huurders weten niet dat ze naar de Huurcommissie kunnen stappen, of durven dit niet uit angst de woning te verliezen. Verhuurders spelen daar bewust op in.

Ben jij gedupeerd? Deel je huurcontract en ervaring met ons — wij analyseren het gratis en anoniem.`,
  },
  {
    slug: 'lerarentekort-basisschool',
    title: 'Lerarentekort: noodgrepen op basisscholen onthuld',
    excerpt:
      'Directeuren grijpen naar bedenkelijke noodoplossingen om hun roosters rond te krijgen. Wat zie jij gebeuren op de school van je kinderen?',
    topic: 'Onderwijs',
    tag: 'Reportage',
    date: '28 april 2026',
    accent: '#7c4dff',
    emoji: '🎓',
    body: `Basisscholen in Nederland combineren klassen, zetten ouders voor de klas en huren zij-instromers in zonder opleiding. Een directeur die anoniem wil blijven: "We doen wat we kunnen, maar dit is niet hoe je kinderen moet leren."

Redactieloket sprak met twintig directeuren en vijftig ouders verspreid over het land. De conclusie: het lerarentekort raakt allang niet meer alleen de Randstad. Ook in Friesland, Zeeland en Limburg staan klassen wekenlang zonder vaste leraar.

Zie jij dit ook op de school van jouw kind? We horen het graag.`,
  },
] as const;

export default function Artikelen() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-pointer mb-2">Nieuws & reportages</div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Artikelen</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Onze onderzoeken en reportages. Herken jij iets in een verhaal? Stuur een tip — het onderwerp is dan al ingevuld.
          </p>
        </div>

        {/* Article list */}
        <div className="space-y-10">
          {ARTICLES.map((a, i) => (
            <motion.article
              key={a.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="grid md:grid-cols-[200px_1fr] gap-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              {/* Emoji tile */}
              <div
                className="flex items-center justify-center text-6xl h-48 md:h-auto"
                style={{ backgroundColor: a.accent + '22' }}
              >
                <span aria-hidden>{a.emoji}</span>
              </div>

              {/* Content */}
              <div className="p-7 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="inline-flex items-center border px-2 py-0.5 text-[10px] uppercase tracking-widest"
                    style={{ borderColor: a.accent, color: a.accent }}
                  >
                    {a.tag}
                  </span>
                  <span className="text-xs text-slate-400">{a.topic} · {a.date}</span>
                </div>

                <h2 className="font-serif text-2xl leading-snug mb-3">{a.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 flex-1">
                  {a.body}
                </p>

                <Link
                  to={`/intake?topic=${encodeURIComponent(a.topic)}&article=${encodeURIComponent(a.title)}`}
                  className="group inline-flex items-center gap-2 bg-pointer px-4 py-2.5 text-sm font-medium text-pointer-foreground w-fit hover:opacity-90 transition-opacity"
                >
                  <MessageSquare className="h-4 w-4" />
                  Stuur een tip over dit artikel
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
