import { useSearchParams } from 'react-router-dom';
import IntakeChat from '../components/IntakeChat';

export default function Intake() {
  const [searchParams] = useSearchParams();
  const preselectedTopic   = searchParams.get('topic');
  const preselectedArticle = searchParams.get('article');

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl grid lg:grid-cols-[1fr_260px] gap-5 px-4 py-6">
        <IntakeChat
          preselectedTopic={preselectedTopic}
          preselectedArticle={preselectedArticle}
          embedded={false}
        />

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sticky top-24">
            <div className="font-serif text-base font-semibold mb-3">Bronbescherming</div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Alles wat je hier deelt, blijft binnen de redactie van Redactieloket. We publiceren nooit
              zonder jouw uitdrukkelijke toestemming.
            </p>
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-400 space-y-2">
              <p>🔒 Versleutelde opslag</p>
              <p>🚫 Niet gedeeld met derden</p>
              <p>📋 Journalistieke standaarden</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
