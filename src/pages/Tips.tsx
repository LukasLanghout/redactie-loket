import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PublicTip {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  topics?: { name: string; icon: string | null } | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min geleden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} uur geleden`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} dag${days !== 1 ? 'en' : ''} geleden`;
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

// Truncate content for the card preview
function preview(text: string, max = 200) {
  const clean = text.replace(/\*\*/g, '').replace(/\n+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean;
}

const TYPE_LABELS: Record<string, string> = {
  tip: 'Tip',
  vraag: 'Vraag',
  feedback: 'Feedback',
  experience: 'Ervaring',
};

export default function Tips() {
  const { data: tips = [], isLoading, error } = useQuery<PublicTip[]>({
    queryKey: ['public-tips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, title, content, type, created_at, topics(name, icon)')
        .eq('share_consent', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PublicTip[];
    },
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-pointer mb-2">Community</div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Tips van lezers</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Geanonimiseerde bijdragen van mensen die iets hebben meegemaakt. Herken jij een patroon?
            Stuur jouw eigen tip — samen maken we misstanden zichtbaar.
          </p>
        </div>

        {/* CTA */}
        <div className="mb-10 border border-pointer/30 bg-pointer/5 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-medium mb-0.5">Heb jij ook iets meegemaakt?</div>
            <p className="text-sm text-slate-500">Deel jouw verhaal. Anoniem kan altijd.</p>
          </div>
          <Link
            to="/intake"
            className="group inline-flex items-center gap-2 bg-pointer px-5 py-2.5 text-sm font-medium text-pointer-foreground hover:opacity-90 transition-opacity shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            Tip de redactie
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Feed */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-3 w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded mb-1 w-full" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-700 dark:text-red-400">
            Kon de tips niet laden. Probeer het later opnieuw.
          </div>
        )}

        {!isLoading && !error && tips.length === 0 && (
          <div className="text-center py-24 text-slate-500">
            <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Nog geen gedeelde tips</p>
            <p className="text-sm">Wees de eerste — stuur jouw verhaal naar de redactie.</p>
            <Link
              to="/intake"
              className="mt-6 inline-flex items-center gap-2 bg-pointer px-5 py-2.5 text-sm font-medium text-pointer-foreground hover:opacity-90"
            >
              Start hier <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {!isLoading && tips.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tips.map((tip, i) => (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: Math.min(i, 5) * 0.05 }}
                className="flex flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                {/* Meta */}
                <div className="flex items-center gap-2 mb-3">
                  {tip.topics && (
                    <span className="text-[10px] uppercase tracking-widest border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-slate-500">
                      {tip.topics.icon} {tip.topics.name}
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-widest text-pointer">
                    {TYPE_LABELS[tip.type] ?? tip.type}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif text-base leading-snug mb-2 line-clamp-2">{tip.title}</h3>

                {/* Preview */}
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1 line-clamp-4">
                  {preview(tip.content)}
                </p>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {timeAgo(tip.created_at)}
                  <span className="ml-auto italic">Anoniem gedeeld</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
