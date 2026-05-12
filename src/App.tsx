import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { isSupabaseConfigured } from './lib/supabase';
import Home from './pages/Home';
import Intake from './pages/Intake';
import Artikelen from './pages/Artikelen';
import Tips from './pages/Tips';
import Login from './pages/Login';
import MijnTips from './pages/MijnTips';
import Programmas from './pages/Programmas';

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-lg">
          <h1 className="text-2xl font-bold mb-3">Setup vereist</h1>
          <p className="mb-4 text-slate-600 dark:text-slate-300">
            Kopieer <code>.env.example</code> naar <code>.env</code> en vul je Supabase URL en anon key in.
          </p>
          <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/artikelen" element={<Artikelen />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/programmas" element={<Programmas />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mijn-tips" element={<MijnTips />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
