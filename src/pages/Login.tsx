import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/mijn-tips` },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8"
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="font-serif text-2xl font-bold mb-1">Inloggen</div>
          <p className="text-sm text-slate-500">
            Je ontvangt een inloglink per e-mail — geen wachtwoord nodig.
          </p>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <Mail className="h-10 w-10 text-pointer mx-auto mb-4" />
            <div className="font-medium mb-2">Check je inbox</div>
            <p className="text-sm text-slate-500 mb-6">
              We hebben een inloglink gestuurd naar <strong>{email}</strong>.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-slate-400 hover:text-pointer"
            >
              Ander e-mailadres proberen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pointer text-pointer-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Versturen…' : <>Stuur inloglink <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}

        {/* Privacy note */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-pointer mt-0.5" />
          <span>
            Je account is alleen voor het inzien van je eigen tips.
            Tippen kan altijd anoniem.{' '}
            <Link to="/intake" className="hover:text-pointer underline">Tip anoniem →</Link>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
