import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth, isStaff } from '../hooks/useAuth';

export function Layout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium tracking-wide uppercase transition ${
      isActive ? 'text-brand-600' : 'text-slate-700 dark:text-slate-200 hover:text-brand-600'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-tight">redactie</span>
            <span className="text-3xl font-black tracking-tight text-brand-500">loket</span>
            <span className="text-2xl font-black text-brand-500">.</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            <NavLink to="/feed" className={linkCls}>Onderzoeken</NavLink>
            <NavLink to="/feed?type=experience" className={linkCls}>Artikelen</NavLink>
            <NavLink to="/feed?type=tip" className={linkCls}>Tips</NavLink>
            <a href="#over-ons" className="text-sm font-medium tracking-wide uppercase text-slate-700 dark:text-slate-200 hover:text-brand-600">Over ons</a>
            {isStaff(profile) && <NavLink to="/dashboard" className={linkCls}>Redactie</NavLink>}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/submit"
              className="hidden md:inline-flex btn bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-sm font-semibold"
            >
              Deel je ervaring
            </Link>
            <Link
              to="/feed"
              className="hidden md:inline-flex btn border-2 border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white px-4 py-2 text-sm font-semibold"
            >
              Naar de webapp →
            </Link>
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
                <NavLink to="/profile" className="text-sm font-medium px-2 hover:text-brand-600">
                  {profile?.name ?? user.email}
                </NavLink>
                <button onClick={async () => { await signOut(); navigate('/'); }} className="btn-ghost text-sm">
                  Uitloggen
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-ghost text-sm">Inloggen</Link>
            )}
            <button
              className="lg:hidden btn-ghost px-2"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-2">
            <NavLink to="/feed" className="block py-2" onClick={() => setOpen(false)}>Onderzoeken</NavLink>
            <NavLink to="/feed?type=experience" className="block py-2" onClick={() => setOpen(false)}>Artikelen</NavLink>
            <NavLink to="/feed?type=tip" className="block py-2" onClick={() => setOpen(false)}>Tips</NavLink>
            <a href="#over-ons" className="block py-2" onClick={() => setOpen(false)}>Over ons</a>
            <Link to="/submit" className="block py-2 font-semibold" onClick={() => setOpen(false)}>Deel je ervaring</Link>
            <Link to="/feed" className="block py-2 font-semibold text-brand-600" onClick={() => setOpen(false)}>Naar de webapp →</Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {isHome ? children : <div className="max-w-6xl mx-auto px-4 py-10">{children}</div>}
      </main>

      <footer id="over-ons" className="bg-slate-900 text-slate-300 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="text-2xl font-black text-white mb-3">
              redactie<span className="text-brand-400">loket</span><span className="text-brand-400">.</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Onafhankelijk community-platform voor tips, vragen en ervaringen. Onze journalistiek begint bij jou.
            </p>
            <div className="flex gap-3 mt-5 text-xl">
              <a href="#" aria-label="Facebook" className="hover:text-white">📘</a>
              <a href="#" aria-label="Instagram" className="hover:text-white">📸</a>
              <a href="#" aria-label="LinkedIn" className="hover:text-white">💼</a>
              <a href="#" aria-label="TikTok" className="hover:text-white">🎵</a>
              <a href="#" aria-label="Newsletter" className="hover:text-white">✉️</a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Doe mee</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/submit" className="hover:text-white">Deel je ervaring</Link></li>
              <li><Link to="/feed" className="hover:text-white">Community-feed</Link></li>
              <li><Link to="/register" className="hover:text-white">Account aanmaken</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Info</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Voorwaarden</a></li>
              <li><a href="#" className="hover:text-white">Privacy</a></li>
              <li><a href="#" className="hover:text-white">Cookies</a></li>
              <li><a href="#" className="hover:text-white">Vacatures</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-slate-400 flex flex-wrap justify-between gap-2">
            <span>© {new Date().getFullYear()} Redactie Loket</span>
            <span className="italic">Samen komen we verder.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
