import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Ingelogd');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-bold mb-1">Inloggen</h1>
      <p className="text-slate-500 mb-6 text-sm">Welkom terug.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Wachtwoord</label>
          <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Bezig…' : 'Inloggen'}</button>
      </form>
      <p className="text-sm text-slate-500 mt-4">
        Nog geen account? <Link to="/register" className="text-brand-600 hover:underline">Registreer</Link>
      </p>
    </div>
  );
}
