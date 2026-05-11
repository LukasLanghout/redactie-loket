import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth, isStaff } from '../hooks/useAuth';

export function Layout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const nav = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300'
               : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-block w-8 h-8 rounded-lg bg-brand-500" />
            Redactie Loket
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={nav}>Home</NavLink>
            <NavLink to="/feed" className={nav}>Community</NavLink>
            <NavLink to="/submit" className={nav}>Deel tip</NavLink>
            {isStaff(profile) && <NavLink to="/dashboard" className={nav}>Dashboard</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="btn-ghost px-2"
              aria-label="Wissel donker/licht"
              title="Wissel donker/licht"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <NavLink to="/profile" className={nav}>
                  {profile?.name ?? user.email}
                </NavLink>
                <button onClick={async () => { await signOut(); navigate('/'); }} className="btn-ghost">
                  Uitloggen
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Inloggen</Link>
                <Link to="/register" className="btn-primary">Account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-sm text-slate-500 text-center">
        Redactie Loket · open community-platform voor tips, vragen en ervaringen
      </footer>
    </div>
  );
}
