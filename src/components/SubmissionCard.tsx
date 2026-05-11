import { Link } from 'react-router-dom';
import type { Submission, Topic } from '../lib/types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  published: 'bg-brand-100 text-brand-700',
  rejected: 'bg-rose-100 text-rose-800',
};

export function SubmissionCard({ s, topic }: { s: Submission; topic?: Topic | null }) {
  const date = new Date(s.created_at).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  return (
    <Link
      to={`/submissions/${s.id}`}
      className="card p-5 block hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-lg leading-tight">{s.title}</h3>
        <span className={`badge ${statusStyles[s.status] ?? 'bg-slate-100 text-slate-700'}`}>
          {s.status}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-3">{s.content}</p>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {topic && (
          <span className="badge" style={{ backgroundColor: (topic.color ?? '#00bcd4') + '22', color: topic.color ?? '#00bcd4' }}>
            {topic.icon} {topic.name}
          </span>
        )}
        <span className="capitalize">{s.type}</span>
        <span>·</span>
        <span>{date}</span>
      </div>
    </Link>
  );
}
