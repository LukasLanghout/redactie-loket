import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, ChevronDown, ChevronUp, Calendar, Tag } from 'lucide-react';
import { getArticle } from '../data/articles';
import IntakeChat from '../components/IntakeChat';

// Simple markdown-like renderer: bold (**text**), paragraphs, bullet points
function RenderBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n\n+/);
  return (
    <div className="space-y-5 text-slate-700 dark:text-slate-300 leading-relaxed text-[17px]">
      {paragraphs.map((p, i) => {
        // Heading: starts with **...**\n (bold whole line)
        if (/^\*\*[^*]+\*\*$/.test(p.trim())) {
          const text = p.trim().replace(/^\*\*|\*\*$/g, '');
          return (
            <h3 key={i} className="font-serif text-xl font-semibold text-slate-900 dark:text-slate-100 mt-6">
              {text}
            </h3>
          );
        }

        // Bullet list
        if (p.trim().startsWith('- ') || p.trim().startsWith('1. ')) {
          const items = p.trim().split('\n').filter(Boolean);
          return (
            <ul key={i} className="space-y-2 pl-5">
              {items.map((item, j) => {
                const clean = item.replace(/^[-\d]+[.)]\s*/, '');
                return (
                  <li key={j} className="list-disc marker:text-pointer">
                    <RenderInline text={clean} />
                  </li>
                );
              })}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <p key={i}>
            <RenderInline text={p} />
          </p>
        );
      })}
    </div>
  );
}

function RenderInline({ text }: { text: string }) {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part)
          ? <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function ArtikelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const article = getArticle(slug ?? '');
  const [intakeOpen, setIntakeOpen] = useState(false);

  if (!article) return <Navigate to="/artikelen" replace />;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">

      {/* Top nav bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-3">
          <Link
            to="/artikelen"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-pointer transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Alle artikelen
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-6 py-10">

        {/* Label + meta */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span
            className="inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11px] uppercase tracking-widest font-medium"
            style={{ borderColor: article.accent, color: article.accent }}
          >
            <Tag className="h-3 w-3" />
            {article.tag}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {article.date}
          </span>
          <span className="text-xs text-slate-400">{article.topic}</span>
        </div>

        {/* Hero emoji */}
        <div
          className="w-full h-44 flex items-center justify-center text-8xl mb-8 border border-slate-200 dark:border-slate-800"
          style={{ backgroundColor: article.accent + '18' }}
        >
          <span aria-hidden>{article.emoji}</span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4 text-slate-900 dark:text-slate-100">
          {article.title}
        </h1>

        {/* Excerpt (lead) */}
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 border-l-2 border-pointer pl-4 italic">
          {article.excerpt}
        </p>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 mb-8" />

        {/* Body */}
        <RenderBody body={article.body} />

        {/* Author */}
        {article.author && (
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-400">
            Door <span className="font-medium text-slate-600 dark:text-slate-300">{article.author}</span>
          </div>
        )}
      </article>

      {/* ── Intake dropdown ───────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">

          {/* Toggle button */}
          <button
            onClick={() => setIntakeOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-stone-50 dark:hover:bg-slate-800 transition group"
          >
            <span className="flex items-center gap-3">
              <span
                className="flex items-center justify-center h-9 w-9 shrink-0"
                style={{ backgroundColor: article.accent + '22', color: article.accent }}
              >
                <MessageSquare className="h-4 w-4" />
              </span>
              <span>
                <span className="font-serif text-lg font-semibold text-slate-900 dark:text-slate-100 block">
                  Stuur een tip over dit artikel
                </span>
                <span className="text-sm text-slate-500">
                  Anoniem mag · Vertrouwelijk · AI-intake-assistent
                </span>
              </span>
            </span>
            <span className="text-slate-400 group-hover:text-pointer transition shrink-0 ml-4">
              {intakeOpen
                ? <ChevronUp className="h-5 w-5" />
                : <ChevronDown className="h-5 w-5" />
              }
            </span>
          </button>

          {/* Collapsible intake */}
          <AnimatePresence initial={false}>
            {intakeOpen && (
              <motion.div
                key="intake"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-200 dark:border-slate-800">
                  <IntakeChat
                    preselectedTopic={article.topic}
                    preselectedArticle={article.title}
                    embedded
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
