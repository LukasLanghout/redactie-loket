import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error('Wachtwoord moet minimaal 6 tekens zijn');
    setLoading(true);
    try {
      await signUp(email, password, name);
      toast.success('Account aangemaakt. Check je mail als bevestiging verplicht is.');
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
      <p className="text-slate-500 mb-6 text-sm">Gratis. Geen reclame. Je kunt direct tips delen.</p>
      <form onSubmit={onSubmit} className="space-y-4">
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
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Bezig…' : 'Registreren'}</button>
      </form>
      <p className="text-sm text-slate-500 mt-4">
        Al een account? <Link to="/login" className="text-brand-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
