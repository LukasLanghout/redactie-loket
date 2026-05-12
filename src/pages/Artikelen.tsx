import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { ARTICLES } from '../data/articles';

export default function Artikelen() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Header */}
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-pointer mb-2">Nieuws & reportages</div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Artikelen</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Onze onderzoeken en reportages. Herken jij iets in een verhaal? Klik op een artikel om het te lezen en stuur direct een tip.
          </p>
        </div>

        {/* Article list */}
        <div className="space-y-6">
          {ARTICLES.map((a, i) => (
            <motion.article
              key={a.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="grid md:grid-cols-[200px_1fr] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              {/* Emoji tile — links to article */}
              <Link
                to={`/artikelen/${a.slug}`}
                className="flex items-center justify-center text-6xl h-48 md:h-auto hover:opacity-90 transition-opacity"
                style={{ backgroundColor: a.accent + '22' }}
                aria-hidden
              >
                <span>{a.emoji}</span>
              </Link>

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

                <Link to={`/artikelen/${a.slug}`} className="group">
                  <h2 className="font-serif text-2xl leading-snug mb-3 group-hover:text-pointer transition-colors">
                    {a.title}
                  </h2>
                </Link>

                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-5 flex-1">
                  {a.excerpt}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/artikelen/${a.slug}`}
                    className="group inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm hover:border-slate-900 dark:hover:border-stone-50 transition"
                  >
                    Lees artikel
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to={`/artikelen/${a.slug}#tip`}
                    onClick={() => {/* handled by page */}}
                    className="group inline-flex items-center gap-2 bg-pointer px-4 py-2.5 text-sm font-medium text-pointer-foreground hover:opacity-90 transition"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Stuur een tip
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
