import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuth, isStaff } from '../hooks/useAuth';

export function Layout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isIntake = location.pathname === '/intake';
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${
      isActive ? 'text-pointer font-medium' : 'text-slate-700 dark:text-slate-300 hover:text-pointer'
    }`;

  return (
    <div className={`min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${isIntake ? '' : ''}`}>
      <header className="border-b border-slate-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center bg-pointer text-pointer-foreground font-serif text-xl font-bold">
              R
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg font-bold tracking-tight">Redactieloket</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Onafhankelijk · Vertrouwelijk</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            <NavLink to="/feed" className={navItem}>Onderzoeken</NavLink>
            <NavLink to="/feed?type=experience" className={navItem}>Artikelen</NavLink>
            <NavLink to="/feed?type=tip" className={navItem}>Tips</NavLink>
            <a href="#over-ons" className="text-sm text-slate-700 dark:text-slate-300 hover:text-pointer transition-colors">Over ons</a>
            {isStaff(profile) && <NavLink to="/dashboard" className={navItem}>Redactie</NavLink>}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/intake"
              className="hidden md:inline-flex items-center gap-2 bg-pointer px-4 py-2 text-sm font-medium text-pointer-foreground transition-opacity hover:opacity-90"
            >
              Tip de redactie <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-pointer"
              aria-label="Wissel donker/licht"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <>
                <NavLink to="/profile" className="hidden sm:inline text-sm font-medium px-2 hover:text-pointer">
                  {profile?.name ?? user.email?.split('@')[0]}
                </NavLink>
                <button onClick={async () => { await signOut(); navigate('/'); }} className="hidden sm:inline text-sm text-slate-500 hover:text-pointer">
                  Uitloggen
                </button>
              </>
            ) : (
              <Link to="/login" className="hidden sm:inline text-sm text-slate-700 dark:text-slate-300 hover:text-pointer">
                Inloggen
              </Link>
            )}
            <button
              className="lg:hidden p-2"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3">
            <NavLink to="/feed" className="block" onClick={() => setOpen(false)}>Onderzoeken</NavLink>
            <NavLink to="/feed?type=experience" className="block" onClick={() => setOpen(false)}>Artikelen</NavLink>
            <NavLink to="/feed?type=tip" className="block" onClick={() => setOpen(false)}>Tips</NavLink>
            <a href="#over-ons" className="block" onClick={() => setOpen(false)}>Over ons</a>
            <Link to="/intake" className="block font-medium text-pointer" onClick={() => setOpen(false)}>Tip de redactie →</Link>
            {!user && <Link to="/login" className="block" onClick={() => setOpen(false)}>Inloggen</Link>}
          </div>
        )}
      </header>

      <main className="flex-1">
        {isHome || isIntake ? children : <div className="max-w-6xl mx-auto px-6 py-10">{children}</div>}
      </main>

      <footer id="over-ons" className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-slate-500 md:flex-row">
          <div>© {new Date().getFullYear()} Redactieloket · Onafhankelijke journalistiek</div>
          <div>Onderzoeksjournalistiek · Nederland · Samen komen we verder</div>
        </div>
      </footer>
    </div>
  );
}
