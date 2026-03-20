import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { apiGet } from '@/lib/api';

const ROLE_MAP = {
  setter: 'Palleggiatore', outside_hitter: 'Schiacciatore', opposite: 'Opposto',
  middle_blocker: 'Centrale', libero: 'Libero', defensive_specialist: 'Difensore',
};

function fmt(n) { return n ?? 0; }
function pct(val) { return val != null && val > 0 ? `${val}%` : '—'; }
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatRow({ label, value, percent }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-muted text-sm font-condensed">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-condensed font-bold text-text">{fmt(value)}</span>
        {percent != null && (
          <span className="text-amber font-condensed text-xs w-10 text-right">{pct(percent)}</span>
        )}
      </div>
    </div>
  );
}

function StatSection({ title, rows }) {
  if (rows.every(r => !r.value)) return null;
  return (
    <div className="bg-surf1 border border-white/7 rounded-2xl p-4">
      <h3 className="font-condensed font-bold text-xs text-subtle uppercase tracking-widest mb-3">
        {title}
      </h3>
      {rows.map(r => <StatRow key={r.label} {...r} />)}
    </div>
  );
}

export default function PlayerDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [player,       setPlayer]       = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [stats,        setStats]        = useState(null);
  const [matches,      setMatches]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error,        setError]        = useState('');
  const [activeComp,   setActiveComp]   = useState(null); // null = totale

  async function fetchStats(comp) {
    setStatsLoading(true);
    try {
      const qs = comp
        ? `?competition_type=${comp.competition_type}&competition_id=${comp.competition_id}`
        : '';
      const data = await apiGet(`/players/${id}/stats${qs}`);
      setStats(data ?? {});
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [playerData, compsData, matchesData, statsData] = await Promise.all([
          apiGet(`/players/${id}`),
          apiGet(`/players/${id}/competitions`),
          apiGet(`/players/${id}/matches?limit=10`),
          apiGet(`/players/${id}/stats`),
        ]);
        setPlayer(playerData);
        setCompetitions(compsData ?? []);
        setMatches(matchesData ?? []);
        setStats(statsData ?? {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCompChange = (comp) => {
    setActiveComp(comp);
    fetchStats(comp);
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center h-48 text-muted font-condensed">
        Caricamento…
      </div>
    </AppShell>
  );

  if (error || !player) return (
    <AppShell>
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-red font-condensed">{error || 'Giocatore non trovato'}</p>
        <button onClick={() => navigate('/players')}
                className="text-teamA text-sm font-condensed hover:underline">
          ← Giocatori
        </button>
      </div>
    </AppShell>
  );

  const s = stats ?? {};

  const statSections = [
    {
      title: 'Battuta',
      rows: [
        { label: 'Ace',             value: s.aces,         percent: s.ace_pct  },
        { label: 'Errori battuta',  value: s.serve_errors                      },
        { label: 'Battute totali',  value: s.serves_total                      },
      ],
    },
    {
      title: 'Attacco',
      rows: [
        { label: 'Vincenti',        value: s.attack_kills,   percent: s.kill_pct },
        { label: 'Errori',          value: s.attack_errors                       },
        { label: 'Murati',          value: s.attack_blocked                      },
        { label: 'Totale attacchi', value: s.attacks_total                       },
      ],
    },
    {
      title: 'Muro',
      rows: [
        { label: 'Muri vincenti',     value: s.block_kills  },
        { label: 'Muri non vincenti', value: s.block_errors },
        { label: 'Totale muri',       value: s.blocks_total },
      ],
    },
    {
      title: 'Ricezione',
      rows: [
        { label: 'Positive',          value: s.reception_positive, percent: s.recv_pct },
        { label: 'Negative',          value: s.reception_negative                      },
        { label: 'Errori ricezione',  value: s.reception_errors                        },
        { label: 'Totale ricezioni',  value: s.receptions_total                        },
      ],
    },
    {
      title: 'Disciplina',
      rows: [
        { label: 'Cartellini gialli', value: s.cards_yellow },
        { label: 'Cartellini rossi',  value: s.cards_red    },
      ],
    },
  ];

  return (
    <AppShell title={`${player.surname} ${player.name}`}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate('/players')}
          className="text-muted hover:text-text text-sm font-condensed transition-colors"
        >
          ← Giocatori
        </button>

        {/* Player header card */}
        <div className="bg-surf1 border border-white/7 rounded-2xl p-5 flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-teamA flex items-center justify-center
                          font-condensed font-black text-2xl text-white flex-shrink-0">
            {player.shirt_number}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-condensed font-black text-2xl text-text">
              {player.surname} {player.name}
            </h2>
            <p className="text-muted text-sm font-condensed mt-0.5">
              {ROLE_MAP[player.role] ?? player.role ?? '—'}
              {player.team_name ? ` · ${player.team_name}` : ''}
            </p>
          </div>
          <div className="flex gap-6 flex-shrink-0">
            {[
              { l: 'Partite', v: fmt(s.matches) },
              { l: 'Punti',   v: fmt(s.pts)     },
              { l: 'Ace',     v: fmt(s.aces)    },
            ].map(({ l, v }) => (
              <div key={l} className="text-center">
                <p className="font-condensed font-black text-2xl text-text leading-none">{v}</p>
                <p className="text-subtle text-xs font-condensed mt-0.5 uppercase tracking-wide">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Competition filter tabs */}
        {competitions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleCompChange(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-condensed font-semibold transition-all
                ${!activeComp
                  ? 'bg-teamA/20 text-teamA border border-teamA/30'
                  : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
            >
              Totale
            </button>
            {competitions.map(c => {
              const isActive = activeComp?.competition_id === c.competition_id
                            && activeComp?.competition_type === c.competition_type;
              return (
                <button
                  key={`${c.competition_type}-${c.competition_id}`}
                  onClick={() => handleCompChange(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-condensed font-semibold transition-all
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

        {/* Stats sections */}
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 transition-opacity ${statsLoading ? 'opacity-40' : ''}`}>
          {statSections.map(sec => (
            <StatSection key={sec.title} title={sec.title} rows={sec.rows} />
          ))}
        </div>

        {/* Recent matches */}
        {matches.length > 0 && (
          <div className="bg-surf1 border border-white/7 rounded-2xl p-4">
            <h3 className="font-condensed font-bold text-xs text-subtle uppercase tracking-widest mb-4">
              Ultime partite
            </h3>
            <div className="space-y-2">
              {matches.map(m => (
                <div
                  key={m.match_id}
                  onClick={() => navigate(`/timeline/${m.match_id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surf2 border border-white/5
                             cursor-pointer hover:border-teamA/20 transition-all group"
                >
                  <span className={`font-condensed font-black text-sm w-4 flex-shrink-0
                    ${m.result === 'W' ? 'text-green' : 'text-red'}`}>
                    {m.result}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-condensed font-bold text-sm text-text truncate">
                      {m.home_team} <span className="text-subtle font-normal">vs</span> {m.away_team}
                    </p>
                    <p className="text-subtle text-xs font-condensed">{fmtDate(m.date)}</p>
                  </div>

                  <div className="flex gap-4 flex-shrink-0">
                    {[
                      { l: 'Pts',   v: fmt(m.pts)  },
                      { l: 'Ace',   v: fmt(m.ace)  },
                      { l: 'Kill',  v: fmt(m.kills) },
                      ...(m.kill_pct > 0 ? [{ l: 'Kill%', v: `${m.kill_pct}%`, amber: true }] : []),
                    ].map(({ l, v, amber }) => (
                      <div key={l} className="text-center min-w-[28px]">
                        <p className={`font-condensed font-bold text-sm leading-none ${amber ? 'text-amber' : 'text-text'}`}>{v}</p>
                        <p className="text-subtle text-[10px] font-condensed mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>

                  <span className="text-teamA text-sm opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
