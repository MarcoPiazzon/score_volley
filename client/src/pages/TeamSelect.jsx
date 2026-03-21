import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';

export default function TeamSelect() {
  const { selectTeam, selectedTeam } = useAuth();
  const navigate = useNavigate();
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet('/teams/me');
        const list = Array.isArray(data) ? data : [data].filter(Boolean);
        if (list.length === 1) {
          selectTeam(list[0]);
          navigate('/dashboard', { replace: true });
          return;
        }
        setTeams(list);
      } catch (err) {
        setError(err.message ?? 'Errore nel caricamento delle squadre');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (team) => {
    selectTeam(team);
    navigate('/dashboard', { replace: true });
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-muted font-condensed text-lg animate-pulse">Caricamento…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-96 h-96 rounded-full bg-teamA/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
                          w-16 h-16 rounded-2xl bg-surf2 border border-white/10 mb-4
                          text-3xl shadow-glow-a">
            🏐
          </div>
          <h1 className="font-condensed font-bold text-3xl text-text tracking-wide">
            Seleziona squadra
          </h1>
          <p className="text-muted text-sm mt-1">Scegli con quale squadra vuoi lavorare</p>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-red text-sm mb-4 flex items-center gap-2">
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          {teams.map(team => {
            const isActive = selectedTeam?.id === team.id;
            return (
              <button
                key={team.id}
                onClick={() => handleSelect(team)}
                className={`w-full text-left bg-surf1 border rounded-2xl p-4
                            transition-all duration-150 group flex items-center gap-4
                            ${isActive
                              ? 'border-teamA/50 bg-teamA/5'
                              : 'border-white/7 hover:border-teamA/30 hover:bg-surf2/50'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-surf2 border border-white/10 flex-shrink-0
                                flex items-center justify-center text-xl">
                  🏐
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-condensed font-bold text-lg text-text leading-tight truncate">
                    {team.name}
                  </p>
                  {team.city && (
                    <p className="text-muted text-sm font-condensed">{team.city}</p>
                  )}
                </div>
                <span className={`text-lg flex-shrink-0 transition-opacity
                  ${isActive ? 'text-teamA opacity-100' : 'text-teamA opacity-0 group-hover:opacity-100'}`}>
                  →
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
