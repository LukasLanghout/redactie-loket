import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isSupabaseConfigured } from './lib/supabase';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Submit from './pages/Submit';
import Feed from './pages/Feed';
import SubmissionDetail from './pages/SubmissionDetail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-lg">
          <h1 className="text-2xl font-bold mb-3">Setup vereist</h1>
          <p className="mb-4 text-slate-600 dark:text-slate-300">
            Kopieer <code>.env.example</code> naar <code>.env</code> en vul je Supabase URL en anon key in.
            Zie <code>README.md</code> voor de volledige stappen.
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/submissions/:id" element={<SubmissionDetail />} />
        <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute staffOnly><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
