import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// ── Simple fake captcha ───────────────────────────────────────────────────────

function makeCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `${a} + ${b}`, answer: String(a + b) };
}

// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode]           = useState<Mode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [captchaVal, setCaptchaVal] = useState('');
  const [loading, setLoading]     = useState(false);

  const captcha = useMemo(() => makeCaptcha(), [mode]); // regenerate on mode switch

  const captchaOk = captchaVal.trim() === captcha.answer;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaOk) { toast.error('Antwoord op de verificatievraag klopt niet.'); return; }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mailadres of wachtwoord klopt niet.');
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }
      toast.success('Ingelogd!');
      navigate('/mijn-tips');
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (error.status === 422) {
          // Email confirmations required — try signing in directly instead
          toast.error('Controleer je inbox voor een bevestigingsmail, of log in als je al een account hebt.');
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }
      // If session is immediately available, email confirmation is disabled (good)
      if (data.session) {
        toast.success('Account aangemaakt — welkom!');
        navigate('/mijn-tips');
      } else {
        // Email confirmation required
        toast('Controleer je inbox en klik op de bevestigingslink.', { icon: '📧', duration: 6000 });
        setMode('login');
      }
    }

    setLoading(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setCaptchaVal('');
    setPassword('');
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8"
      >
        {/* Mode toggle */}
        <div className="flex border border-slate-200 dark:border-slate-700 mb-7 text-sm font-medium">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 transition ${
                mode === m
                  ? 'bg-slate-900 dark:bg-stone-50 text-stone-50 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {m === 'login' ? 'Inloggen' : 'Account aanmaken'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">E-mailadres</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jouw@email.nl"
              className="w-full border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm focus:outline-none focus:border-pointer"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Wachtwoord</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimaal 6 tekens"
                className="w-full border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-pointer"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pointer"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Fake captcha */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Verificatie — wat is {captcha.question}?
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={captchaVal}
              onChange={e => setCaptchaVal(e.target.value)}
              placeholder="Antwoord"
              className={`w-full border bg-transparent px-4 py-2.5 text-sm focus:outline-none transition ${
                captchaVal && !captchaOk
                  ? 'border-red-400 focus:border-red-400'
                  : captchaOk
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-pointer'
              }`}
            />
            {captchaVal && !captchaOk && (
              <p className="text-xs text-red-500 mt-1">Dat klopt niet — probeer opnieuw.</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !captchaOk}
            className="w-full bg-pointer text-pointer-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading
              ? (mode === 'login' ? 'Inloggen…' : 'Aanmaken…')
              : mode === 'login'
                ? <><span>Inloggen</span><ArrowRight className="h-4 w-4" /></>
                : <><span>Account aanmaken</span><ArrowRight className="h-4 w-4" /></>
            }
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-pointer mt-0.5" />
          <span>
            Een account is alleen voor het terugvinden van je eigen tips.
            Tippen kan altijd anoniem.{' '}
            <Link to="/intake" className="hover:text-pointer underline">Tip anoniem →</Link>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
