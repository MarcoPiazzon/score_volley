import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import LineupModal from '@/components/LineupModal';

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

function MatchCard({ match, lineupStatus, onLineupClick, onStartMatch, onOpen }) {
  const isScheduled = match.status === 'scheduled';
  const homeOk  = lineupStatus?.home ?? false;
  const awayOk  = lineupStatus?.away ?? false;
  const bothReady = homeOk && awayOk;

  const cardClickable = !isScheduled;

  return (
    <div
      onClick={cardClickable ? () => onOpen(match) : undefined}
      className={`bg-surf1 border border-white/7 rounded-2xl p-4 transition-all duration-150
                  ${cardClickable ? 'cursor-pointer hover:border-teamA/30 hover:bg-surf2/50 group' : ''}`}
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
          <p className="font-condensed font-bold text-base text-text truncate">{match.home_team}</p>
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
            <p className="text-subtle text-[10px] mt-0.5 font-condensed">Giornata {match.matchday}</p>
          )}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <p className="font-condensed font-bold text-base text-text truncate">{match.away_team}</p>
          <p className="text-muted text-xs mt-0.5">Ospite</p>
        </div>
      </div>

      {/* Action row */}
      <div className="mt-3 pt-3 border-t border-white/5">
        {isScheduled ? (
          <div className="flex items-center gap-2">
            {/* Formazione Casa */}
            <button
              onClick={(e) => { e.stopPropagation(); onLineupClick(match, match.home_team_id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl
                          text-xs font-condensed font-semibold transition-all border
                          ${homeOk
                            ? 'bg-green/10 border-green/25 text-green'
                            : 'bg-surf2 border-white/10 text-muted hover:border-white/25 hover:text-text'}`}
            >
              {homeOk ? '✓' : '○'} Casa
            </button>
            {/* Formazione Ospite */}
            <button
              onClick={(e) => { e.stopPropagation(); onLineupClick(match, match.away_team_id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl
                          text-xs font-condensed font-semibold transition-all border
                          ${awayOk
                            ? 'bg-green/10 border-green/25 text-green'
                            : 'bg-surf2 border-white/10 text-muted hover:border-white/25 hover:text-text'}`}
            >
              {awayOk ? '✓' : '○'} Ospite
            </button>
            {/* Avvia */}
            <button
              onClick={(e) => { e.stopPropagation(); onStartMatch(match); }}
              disabled={!bothReady}
              title={!bothReady ? 'Imposta entrambe le formazioni prima di avviare' : ''}
              className={`px-4 py-1.5 rounded-xl text-xs font-condensed font-semibold border transition-all
                          ${bothReady
                            ? 'bg-teamA/20 border-teamA/30 text-teamA hover:bg-teamA/30 cursor-pointer'
                            : 'bg-surf2 border-white/5 text-subtle cursor-not-allowed'}`}
            >
              Avvia →
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-subtle text-xs font-condensed">
              {match.status === 'in_progress' ? '🔴 Partita in corso →' :
               match.status === 'completed'   ? 'Vedi riepilogo →' : ''}
            </span>
            <span className="text-teamA opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
          </div>
        )}
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
  const { user, selectedTeam } = useAuth();
  const navigate = useNavigate();

  const [matches,      setMatches]      = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [compFilter,   setCompFilter]   = useState(null);
  const [lineupEdit,   setLineupEdit]   = useState(null);   // { match, teamId }
  const [lineupStatus, setLineupStatus] = useState({});     // { [matchId]: { home, away } }

  const teamId = selectedTeam?.id ?? null;

  // Carica competizioni (una volta sola)
  useEffect(() => {
    if (!teamId) return;
    apiGet(`/teams/${teamId}/competitions`)
      .then(data => setCompetitions(data ?? []))
      .catch(() => {});
  }, [teamId]);

  // Carica partite e stats al cambio di filtro competizione
  useEffect(() => {
    if (!teamId) return;
    async function load() {
      setLoading(true);
      try {
        const qs = compFilter
          ? `?competition_type=${compFilter.competition_type}&competition_id=${compFilter.competition_id}`
          : '';
        const [matchesData, statsData] = await Promise.all([
          apiGet(`/matches/team/${teamId}${qs}`),
          apiGet(`/teams/${teamId}/stats${qs}`),
        ]);
        setMatches(matchesData ?? []);
        setStats(statsData ?? null);

        // Carica stato formazioni per le partite scheduled
        const scheduled = (matchesData ?? []).filter(m => m.status === 'scheduled');
        const statuses = {};
        await Promise.all(scheduled.map(async (m) => {
          try {
            const lineup = await apiGet(`/matches/${m.id}/lineup`);
            statuses[m.id] = {
              home: (lineup?.home?.starters?.length ?? 0) >= 6,
              away: (lineup?.away?.starters?.length ?? 0) >= 6,
            };
          } catch {
            statuses[m.id] = { home: false, away: false };
          }
        }));
        setLineupStatus(statuses);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId, compFilter]);

  const refreshLineupStatus = async (matchId) => {
    try {
      const lineup = await apiGet(`/matches/${matchId}/lineup`);
      setLineupStatus(prev => ({
        ...prev,
        [matchId]: {
          home: (lineup?.home?.starters?.length ?? 0) >= 6,
          away: (lineup?.away?.starters?.length ?? 0) >= 6,
        },
      }));
    } catch {}
  };

  const filteredMatches = matches.filter(m =>
    statusFilter === 'all' || m.status === statusFilter
  );

  const handleOpenMatch = (match) => {
    if (match.status === 'in_progress') {
      localStorage.setItem('openMatch', JSON.stringify(match));
      navigate(`/monitor/${match.id}`);
    } else if (match.status === 'completed') {
      navigate(`/timeline/${match.id}`);
    } else {
      navigate(`/monitor/${match.id}`);
    }
  };

  const handleStartMatch = async (match) => {
    try {
      await apiPost(`/matches/${match.id}/start`, {});
      localStorage.setItem('openMatch', JSON.stringify(match));
      navigate(`/monitor/${match.id}`);
    } catch {
      setError('Errore durante l\'avvio della partita');
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
    <>
    <AppShell title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Welcome */}
        <div>
          <h2 className="font-condensed font-bold text-2xl text-text">
            Ciao, {user?.name ?? user?.username} 👋
          </h2>
          <p className="text-muted text-sm mt-1">
            {selectedTeam?.name ?? 'Nessuna squadra associata'}
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
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h3 className="font-condensed font-bold text-lg text-text mr-1">Partite</h3>

            {/* Filtro competizione */}
            {competitions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setCompFilter(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-condensed font-semibold transition-all
                    ${!compFilter
                      ? 'bg-teamA/20 text-teamA border border-teamA/30'
                      : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
                >
                  Tutte
                </button>
                {competitions.map(c => {
                  const key = `${c.competition_type}-${c.competition_id}`;
                  const isActive = compFilter?.competition_type === c.competition_type
                                && compFilter?.competition_id  === c.competition_id;
                  return (
                    <button
                      key={key}
                      onClick={() => setCompFilter(c)}
                      className={`px-3 py-1 rounded-lg text-xs font-condensed font-semibold transition-all
                        ${isActive
                          ? 'bg-teamA/20 text-teamA border border-teamA/30'
                          : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
                    >
                      {c.competition_name}{c.edition ? ` (${c.edition})` : ''}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filtro stato */}
            <div className="flex gap-1 ml-auto">
              {[
                { v: 'all',         l: 'Tutte' },
                { v: 'scheduled',   l: 'Programmate' },
                { v: 'in_progress', l: 'In corso' },
                { v: 'completed',   l: 'Completate' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-condensed font-semibold transition-all
                    ${statusFilter === v
                      ? 'bg-surf2 text-text border border-white/15'
                      : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
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
                <MatchCard
                  key={m.id}
                  match={m}
                  lineupStatus={lineupStatus[m.id]}
                  onLineupClick={(match, tid) => setLineupEdit({ match, teamId: tid })}
                  onStartMatch={handleStartMatch}
                  onOpen={handleOpenMatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>

    {/* Lineup modal — formazione casa o ospite */}
    {lineupEdit && (
      <LineupModal
        match={lineupEdit.match}
        teamId={lineupEdit.teamId}
        onClose={() => setLineupEdit(null)}
        onSaved={() => refreshLineupStatus(lineupEdit.match.id)}
      />
    )}
    </>
  );
}
