import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StatusBadge({ status }) {
  const cfg = {
    scheduled:   { label: 'Programmata', cls: 'bg-surf3 text-muted' },
    in_progress: { label: 'In corso',    cls: 'bg-amber/15 text-amber' },
    completed:   { label: 'Completata',  cls: 'bg-green/15 text-green' },
    cancelled:   { label: 'Annullata',   cls: 'bg-red/15 text-red'   },
  };
  const c = cfg[status] ?? { label: status, cls: 'bg-surf3 text-muted' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-condensed font-semibold uppercase tracking-wide ${c.cls}`}>
      {c.label}
    </span>
  );
}

function MatchCard({ match, onOpen }) {
  const isHome = true; // nel contesto del coach, la squadra è sempre "casa" in vista
  return (
    <div
      onClick={() => onOpen(match)}
      className="bg-surf1 border border-white/7 rounded-2xl p-4 cursor-pointer
                 hover:border-teamA/30 hover:bg-surf2/50 transition-all duration-150 group"
    >
      {/* Top row: date + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted text-xs font-condensed">
          {formatDate(match.scheduled_at ?? match.played_at)}
          {match.venue && ` · ${match.venue}`}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-condensed font-bold text-base text-text truncate">
            {match.home_team}
          </p>
          <p className="text-muted text-xs mt-0.5">Casa</p>
        </div>

        <div className="text-center flex-shrink-0">
          {match.status === 'completed' ? (
            <div className="flex items-center gap-1.5">
              <span className={`font-condensed font-black text-2xl leading-none
                ${match.home_sets_won > match.away_sets_won ? 'text-green' : 'text-text'}`}>
                {match.home_sets_won}
              </span>
              <span className="text-muted font-bold text-lg">–</span>
              <span className={`font-condensed font-black text-2xl leading-none
                ${match.away_sets_won > match.home_sets_won ? 'text-green' : 'text-text'}`}>
                {match.away_sets_won}
              </span>
            </div>
          ) : (
            <span className="font-condensed text-muted text-lg font-bold">vs</span>
          )}
          {match.matchday && (
            <p className="text-subtle text-[10px] mt-0.5 font-condensed">
              Giornata {match.matchday}
            </p>
          )}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <p className="font-condensed font-bold text-base text-text truncate">
            {match.away_team}
          </p>
          <p className="text-muted text-xs mt-0.5">Ospite</p>
        </div>
      </div>

      {/* Action hint */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-subtle text-xs font-condensed">
          {match.status === 'scheduled' ? 'Imposta formazione →' :
           match.status === 'in_progress' ? '🔴 Partita in corso →' :
           match.status === 'completed' ? 'Vedi riepilogo →' : ''}
        </span>
        <span className="text-teamA opacity-0 group-hover:opacity-100 transition-opacity text-sm">
          →
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-text' }) {
  return (
    <div className="bg-surf1 border border-white/7 rounded-2xl p-4">
      <p className="text-muted text-xs font-condensed uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-condensed font-black text-3xl leading-none ${color}`}>{value}</p>
      {sub && <p className="text-subtle text-xs mt-1 font-condensed">{sub}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches]   = useState([]);
  const [stats,   setStats]     = useState(null);
  const [teams,   setTeams]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [filter,  setFilter]    = useState('all');  // all | scheduled | completed

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Team/s del coach
        const teamsData = await apiGet('/teams/me');
        const teamList  = Array.isArray(teamsData) ? teamsData : [teamsData].filter(Boolean);
        setTeams(teamList);

        if (teamList.length === 0) { setLoading(false); return; }

        const primaryTeam = teamList[0];

        // Partite del team principale
        const [matchesData, statsData] = await Promise.all([
          apiGet(`/matches/team/${primaryTeam.id}`),
          apiGet(`/teams/${primaryTeam.id}/stats`),
        ]);

        setMatches(matchesData ?? []);
        setStats(statsData ?? null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const handleOpenMatch = async (match) => {
    if (match.status === 'scheduled') {
      // Avvia la partita → imposta in_progress + apri monitor
      try {
        await apiPost(`/matches/${match.id}/save`, {
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          setsWonHome: 0, setsWonAway: 0,
          homeTotalPts: 0, awayTotalPts: 0,
          sets: [], players: [],
        });
        // Salva dati partita per monitor
        localStorage.setItem('openMatch', JSON.stringify(match));
        navigate(`/monitor/${match.id}`);
      } catch {
        localStorage.setItem('openMatch', JSON.stringify(match));
        navigate(`/monitor/${match.id}`);
      }
    } else if (match.status === 'in_progress') {
      localStorage.setItem('openMatch', JSON.stringify(match));
      navigate(`/monitor/${match.id}`);
    } else {
      navigate(`/monitor/${match.id}`);
    }
  };

  if (loading) return (
    <AppShell title="Dashboard">
      <div className="flex items-center justify-center h-48 text-muted font-condensed">
        Caricamento…
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Welcome */}
        <div>
          <h2 className="font-condensed font-bold text-2xl text-text">
            Ciao, {user?.name ?? user?.username} 👋
          </h2>
          <p className="text-muted text-sm mt-1">
            {teams.length > 0
              ? teams.map(t => t.name).join(' · ')
              : 'Nessuna squadra associata'}
          </p>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-red text-sm">
            {error}
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Partite" value={stats.matches} />
            <StatCard label="Vittorie" value={stats.wins} color="text-green" />
            <StatCard label="Sconfitte" value={stats.losses} color="text-red" />
            <StatCard label="Set vinti" value={stats.sets_won}
                      sub={`${stats.sets_lost} persi`} color="text-teamA" />
            <StatCard label="Win %"
                      value={stats.matches > 0
                        ? `${Math.round(stats.wins / stats.matches * 100)}%`
                        : '—'}
                      color="text-amber" />
          </div>
        )}

        {/* Matches section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-condensed font-bold text-lg text-text">Partite</h3>
            <div className="flex gap-1 ml-auto">
              {[
                { v: 'all', l: 'Tutte' },
                { v: 'scheduled', l: 'Programmate' },
                { v: 'in_progress', l: 'In corso' },
                { v: 'completed', l: 'Completate' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-condensed font-semibold transition-all
                    ${filter === v
                      ? 'bg-teamA/20 text-teamA border border-teamA/30'
                      : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="bg-surf1 border border-white/7 rounded-2xl p-8 text-center">
              <p className="text-muted font-condensed">Nessuna partita trovata</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredMatches.map(m => (
                <MatchCard key={m.id} match={m} onOpen={handleOpenMatch} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
