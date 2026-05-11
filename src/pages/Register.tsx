import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

type AccountType = 'public' | 'editor';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('public');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error('Wachtwoord moet minimaal 6 tekens zijn');
    if (accountType === 'editor' && !inviteCode.trim()) {
      return toast.error('Een redactie-account vereist een uitnodigingscode');
    }
    setLoading(true);
    try {
      await signUp(email, password, name, accountType, inviteCode || undefined);
      if (accountType === 'editor') {
        toast.success('Redactie-account aangemaakt. Check je mail als bevestiging verplicht is.');
      } else {
        toast.success('Account aangemaakt. Check je mail als bevestiging verplicht is.');
      }
      navigate('/');
    } catch (err) {
      toast.error((err as Error).message || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-bold mb-1">Account aanmaken</h1>
      <p className="text-slate-500 mb-6 text-sm">Gratis. Geen reclame.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Account type selector */}
        <div>
          <label className="label">Wat voor account?</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccountType('public')}
              className={`p-3 border text-left transition ${
                accountType === 'public'
                  ? 'border-pointer bg-pointer/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="font-semibold text-sm">👤 Gebruiker</div>
              <div className="text-xs text-slate-500 mt-1">
                Ik wil tips, vragen of ervaringen insturen.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('editor')}
              className={`p-3 border text-left transition ${
                accountType === 'editor'
                  ? 'border-pointer bg-pointer/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="font-semibold text-sm">📰 Redactie</div>
              <div className="text-xs text-slate-500 mt-1">
                Ik check en keur ingestuurde tips.
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="label">Naam</label>
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Wachtwoord</label>
          <input type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {accountType === 'editor' && (
          <div className="p-3 border border-pointer/30 bg-pointer/5">
            <label className="label">Uitnodigingscode redactie</label>
            <input
              required
              className="input"
              placeholder="Vraag deze code op bij de hoofdredactie"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Zonder geldige code krijg je een normaal gebruikersaccount.
            </p>
          </div>
        )}

        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Bezig…' : 'Registreren'}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-4">
        Al een account? <Link to="/login" className="text-brand-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
