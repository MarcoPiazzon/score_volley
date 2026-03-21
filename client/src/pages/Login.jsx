import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiPost } from '@/lib/api';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (isAuthenticated) return <Navigate to="/select-team" replace />;

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Inserisci username e password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/auth/login', form);
      login(data.token, data.user);
      navigate('/select-team', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-96 h-96 rounded-full bg-teamA/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
                          w-16 h-16 rounded-2xl bg-surf2 border border-white/10 mb-4
                          text-3xl shadow-glow-a">
            🏐
          </div>
          <h1 className="font-condensed font-bold text-3xl text-text tracking-wide">
            VOLLEYBALL
          </h1>
          <p className="text-muted text-sm mt-1 font-sans">Manager — Accedi al tuo account</p>
        </div>

        {/* Card */}
        <div className="bg-surf1 border border-white/7 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Username</label>
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                placeholder="il tuo username"
                className="w-full bg-surf2 border border-white/10 rounded-xl
                           px-4 py-2.5 text-text text-sm placeholder:text-subtle
                           focus:outline-none focus:border-teamA/60 focus:ring-1 focus:ring-teamA/30
                           transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-surf2 border border-white/10 rounded-xl
                             px-4 py-2.5 pr-10 text-text text-sm placeholder:text-subtle
                             focus:outline-none focus:border-teamA/60 focus:ring-1 focus:ring-teamA/30
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text
                             transition-colors text-xs"
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-2.5
                              text-red text-sm flex items-center gap-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teamA hover:bg-teamA/90 disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-condensed font-semibold
                         text-base py-2.5 rounded-xl transition-all duration-150
                         shadow-glow-a/50 hover:shadow-glow-a active:scale-[0.98]"
            >
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-subtle text-xs mt-6">
          Volleyball Manager © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
