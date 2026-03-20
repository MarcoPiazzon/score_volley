import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { apiGet } from '@/lib/api';

const ROLE_MAP = {
  setter: 'Palleggiatore', outside_hitter: 'Schiacciatore', opposite: 'Opposto',
  middle_blocker: 'Centrale', libero: 'Libero', defensive_specialist: 'Difensore',
};

const ROLES = Object.entries(ROLE_MAP).map(([value, label]) => ({ value, label }));

export default function Players() {
  const navigate = useNavigate();
  const [players,    setPlayers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const teamsData = await apiGet('/teams/me');
        const teamList  = Array.isArray(teamsData) ? teamsData : [teamsData].filter(Boolean);
        if (teamList.length === 0) { setLoading(false); return; }
        const data = await apiGet(`/teams/${teamList[0].id}/players/stats`);
        setPlayers(data ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter(p => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (q) {
        const full = `${p.name} ${p.surname}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [players, search, roleFilter]);

  if (loading) return (
    <AppShell title="Giocatori">
      <div className="flex items-center justify-center h-48 text-muted font-condensed">
        Caricamento…
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Giocatori">
      <div className="max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-red text-sm">
            {error}
          </div>
        )}

        {/* Filtri */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Cerca per nome o cognome…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-surf1 border border-white/10 rounded-xl px-4 py-2
                       text-sm font-condensed text-text placeholder:text-subtle
                       focus:outline-none focus:border-teamA/50"
          />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-condensed font-semibold transition-all
                ${roleFilter === 'all'
                  ? 'bg-teamA/20 text-teamA border border-teamA/30'
                  : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
            >
              Tutti
            </button>
            {ROLES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRoleFilter(value)}
                className={`px-3 py-2 rounded-xl text-xs font-condensed font-semibold transition-all
                  ${roleFilter === value
                    ? 'bg-teamA/20 text-teamA border border-teamA/30'
                    : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-surf1 border border-white/7 rounded-2xl p-8 text-center">
            <p className="text-muted font-condensed">Nessun giocatore trovato</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/players/${p.id}`)}
                className="bg-surf1 border border-white/7 rounded-2xl p-4 cursor-pointer
                           hover:border-teamA/30 hover:bg-surf2/50 transition-all duration-150 group"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-teamA flex items-center justify-center
                                  font-condensed font-black text-lg text-white flex-shrink-0">
                    {p.shirt_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-condensed font-bold text-base text-text truncate">
                      {p.surname} {p.name}
                    </p>
                    <p className="text-subtle text-xs font-condensed capitalize">
                      {ROLE_MAP[p.role] ?? p.role ?? '—'}
                    </p>
                  </div>
                  <span className="text-teamA opacity-0 group-hover:opacity-100 transition-opacity text-sm flex-shrink-0">
                    →
                  </span>
                </div>

                {/* Stats mini */}
                <div className="grid grid-cols-4 gap-1 pt-3 border-t border-white/5">
                  {[
                    { l: 'Partite', v: p.matches ?? 0 },
                    { l: 'Punti',   v: p.pts ?? 0 },
                    { l: 'Ace',     v: p.ace ?? 0 },
                    { l: 'Kill%',   v: p.kill_pct != null && p.kill_pct > 0 ? `${p.kill_pct}%` : '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="text-center">
                      <p className="font-condensed font-bold text-base text-text leading-none">{v}</p>
                      <p className="text-subtle text-[10px] font-condensed mt-0.5 uppercase tracking-wide">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
