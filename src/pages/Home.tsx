import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Topic, Submission } from '../lib/types';

export default function Home() {
  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => (await supabase.from('topics').select('*').order('name')).data ?? [],
  });

  const { data: recent = [] } = useQuery<Submission[]>({
    queryKey: ['home-recent-6'],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('created_at', { ascending: false })
        .limit(6);
      return (data as Submission[]) ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ['home-counts'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('submissions').select('*', { count: 'exact', head: true });
      const { count: published } = await supabase
        .from('submissions').select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'published']);
      return { total: total ?? 0, published: published ?? 0 };
    },
  });

  const topicById = new Map(topics.map((t) => [t.id, t]));
  const featured = recent[0];
  const grid = recent.slice(1, 4);
  const lower = recent.slice(4, 6);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold mb-4">
              Onafhankelijk · Community-driven · Sinds 2026
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
              Ons onderzoek<br />begint bij <span className="text-brand-500">jou</span>.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-xl mb-8 leading-relaxed">
              Heb jij informatie waar journalisten iets mee kunnen? Een misstand gezien,
              een vraag die om uitzoekwerk vraagt, of een verhaal dat verteld moet worden?
              Wij lezen alles wat binnenkomt.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/submit" className="btn bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900 px-6 py-3 text-base font-semibold">
                Deel je ervaring
              </Link>
              <Link to="/feed" className="btn border-2 border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white px-6 py-3 text-base font-semibold">
                Naar de webapp →
              </Link>
            </div>
            {counts && (
              <div className="mt-10 flex gap-10 text-sm">
                <div>
                  <div className="text-3xl font-black">{counts.total}</div>
                  <div className="text-slate-500 uppercase tracking-wide text-xs">tips ontvangen</div>
                </div>
                <div>
                  <div className="text-3xl font-black">{counts.published}</div>
                  <div className="text-slate-500 uppercase tracking-wide text-xs">verhalen gedeeld</div>
                </div>
                <div>
                  <div className="text-3xl font-black">{topics.length}</div>
                  <div className="text-slate-500 uppercase tracking-wide text-xs">lopende onderzoeken</div>
                </div>
              </div>
            )}
          </div>
          <div className="md:col-span-5">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-brand-500 rounded-2xl rotate-6 opacity-20" />
              <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-accent-500 rounded-2xl -rotate-6 opacity-30" />
              <div className="relative bg-slate-900 dark:bg-slate-800 text-white rounded-2xl p-8 shadow-2xl">
                <div className="text-xs uppercase tracking-widest text-brand-300 mb-2">Quote van de week</div>
                <blockquote className="text-2xl font-semibold leading-snug mb-4">
                  "Ik dacht: dit moet iemand weten. Een week later belde de redactie me terug."
                </blockquote>
                <div className="text-sm text-slate-400">— Anonieme tipgever, over een lopend onderzoek</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ONZE ONDERZOEKEN */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold mb-2">
                Onze onderzoeken
              </div>
              <h2 className="text-3xl md:text-4xl font-black">Waar wij ons nu in vastbijten</h2>
            </div>
            <Link to="/feed" className="hidden md:inline text-sm font-semibold uppercase tracking-wide text-brand-600 hover:underline">
              Bekijk alles →
            </Link>
          </div>
          {topics.length === 0 ? (
            <div className="text-slate-500">Nog geen onderwerpen. Run <code>database/seed.sql</code> in Supabase.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {topics.slice(0, 5).map((t) => (
                <Link
                  key={t.id}
                  to={`/feed?topic=${t.id}`}
                  className="group rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:shadow-lg transition"
                  style={{ background: (t.color ?? '#00bcd4') + '10' }}
                >
                  <div className="text-4xl mb-3">{t.icon}</div>
                  <div className="font-bold text-lg leading-tight mb-1">{t.name}</div>
                  <div className="text-xs text-slate-500 line-clamp-2">{t.description}</div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600 opacity-0 group-hover:opacity-100 transition">
                    Lees verder →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED ARTICLE */}
      {featured && (
        <section className="border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <Link
              to={`/submissions/${featured.id}`}
              className="grid md:grid-cols-2 gap-8 items-center group"
            >
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)',
                }} />
                <div className="text-6xl md:text-8xl font-black relative">"</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold mb-3">
                  Uitgelicht verhaal
                </div>
                <h3 className="text-3xl md:text-4xl font-black leading-tight mb-4 group-hover:text-brand-600 transition">
                  {featured.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-lg line-clamp-3 mb-4">{featured.content}</p>
                <div className="text-sm text-slate-500">
                  {new Date(featured.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* RECENTE ARTIKELEN */}
      {grid.length > 0 && (
        <section className="border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold mb-2">
              Recente artikelen
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-8">Wat de community deelt</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {grid.map((s) => {
                const t = s.topic_id ? topicById.get(s.topic_id) : null;
                return (
                  <Link
                    key={s.id}
                    to={`/submissions/${s.id}`}
                    className="group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-lg transition flex flex-col"
                  >
                    <div className="aspect-[16/10] flex items-center justify-center text-5xl"
                         style={{ background: (t?.color ?? '#00bcd4') + '22', color: t?.color ?? '#00bcd4' }}>
                      {t?.icon ?? '📰'}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      {t && (
                        <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: t.color ?? '#00bcd4' }}>
                          {t.name}
                        </div>
                      )}
                      <h3 className="font-bold text-lg leading-snug mb-2 group-hover:text-brand-600 transition">{s.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{s.content}</p>
                      <div className="mt-auto text-xs text-slate-500">
                        {new Date(s.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA / WEBAPP-SECTIE */}
      <section className="bg-slate-900 dark:bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-brand-300 font-semibold mb-3">
              De journalistiek begint bij jou
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              Stap in de webapp en zie wat anderen delen.
            </h2>
            <p className="text-slate-300 text-lg mb-6 max-w-lg">
              Lees goedgekeurde verhalen, like wat je raakt, en reageer op tips. Volg lopende onderzoeken
              en zie precies hoe ver de redactie staat.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/feed" className="btn bg-brand-500 text-white hover:bg-brand-600 px-6 py-3 text-base font-semibold">
                Naar de webapp →
              </Link>
              <Link to="/submit" className="btn border-2 border-white text-white hover:bg-white hover:text-slate-900 px-6 py-3 text-base font-semibold">
                Deel je ervaring
              </Link>
            </div>
          </div>
          {lower.length > 0 && (
            <div className="space-y-3">
              {lower.map((s) => (
                <Link
                  key={s.id}
                  to={`/submissions/${s.id}`}
                  className="block bg-slate-800 hover:bg-slate-700 rounded-xl p-5 transition"
                >
                  <div className="text-xs uppercase tracking-wide text-brand-300 mb-1 capitalize">{s.type}</div>
                  <div className="font-semibold text-lg leading-snug mb-1">{s.title}</div>
                  <div className="text-sm text-slate-400 line-clamp-2">{s.content}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
