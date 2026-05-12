import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Moon, Sun, Menu, X, UserCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/artikelen', label: 'Artikelen' },
  { to: '/programmas', label: "Programma's" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isIntake = location.pathname === '/intake';
  const fullWidth = isHome || isIntake;

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4 gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center bg-pointer text-pointer-foreground font-serif text-xl font-bold">
              R
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg font-bold tracking-tight">Redactieloket</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Onafhankelijk · Vertrouwelijk</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-pointer ${
                    isActive ? 'text-pointer' : 'text-slate-600 dark:text-slate-300'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/intake"
              className="hidden md:inline-flex items-center gap-2 bg-pointer px-4 py-2 text-sm font-medium text-pointer-foreground transition-opacity hover:opacity-90"
            >
              Tip de redactie <ArrowRight className="h-4 w-4" />
            </Link>
            {user ? (
              <Link
                to="/mijn-tips"
                className="hidden md:inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-pointer transition-colors"
              >
                <UserCircle className="h-4 w-4" /> Mijn tips
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-pointer transition-colors"
              >
                Inloggen
              </Link>
            )}
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-pointer"
              aria-label="Wissel donker/licht"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {/* Hamburger (mobile) */}
            <button
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-pointer"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 px-6 py-4 flex flex-col gap-4">
            {NAV.map(({ to, label }) => (
              <Link key={to} to={to} className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-pointer">
                {label}
              </Link>
            ))}
            <Link
              to="/intake"
              className="inline-flex items-center gap-2 bg-pointer px-4 py-2 text-sm font-medium text-pointer-foreground w-fit"
            >
              Tip de redactie <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {fullWidth ? children : <div className="max-w-6xl mx-auto px-6 py-10">{children}</div>}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-slate-500 md:flex-row">
          <div>© {new Date().getFullYear()} Redactieloket · Onafhankelijke journalistiek</div>
          <div className="flex gap-4">
            {NAV.map(({ to, label }) => (
              <Link key={to} to={to} className="hover:text-pointer">{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
