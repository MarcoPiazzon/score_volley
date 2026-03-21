import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function fmt(n) { return n ?? 0; }
function pct(val) { return val != null && val > 0 ? `${val}%` : '—'; }

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

const ROLE_MAP = {
  setter: 'Palleggiatore', outside_hitter: 'Schiacciatore', opposite: 'Opposto',
  middle_blocker: 'Centrale', libero: 'Libero', defensive_specialist: 'Difensore',
};

const TOP_CATEGORIES = [
  { key: 'pts',      label: 'Punti',        statKey: 'pts'      },
  { key: 'ace',      label: 'Ace',          statKey: 'ace'      },
  { key: 'kills',    label: 'Vincenti',     statKey: 'kills'    },
  { key: 'kill_pct', label: 'Kill%',        statKey: 'kill_pct' },
  { key: 'blk',      label: 'Muri',         statKey: 'blk'      },
];

export default function Stats() {
  const navigate = useNavigate();
  const { selectedTeam } = useAuth();
  const teamId = selectedTeam?.id ?? null;

  const [competitions, setCompetitions] = useState([]);
  const [teamStats,    setTeamStats]    = useState(null);
  const [topPlayers,   setTopPlayers]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error,        setError]        = useState('');
  const [activeComp,   setActiveComp]   = useState(null);
  const [topCat,       setTopCat]       = useState('pts');

  // Carica competizioni e stats iniziali
  useEffect(() => {
    if (!teamId) return;
    async function load() {
      setLoading(true);
      try {
        const [compsData, statsData, topData] = await Promise.all([
          apiGet(`/teams/${teamId}/competitions`),
          apiGet(`/teams/${teamId}/stats`),
          apiGet(`/teams/${teamId}/players/stats?stat=pts&limit=5`),
        ]);
        setCompetitions(compsData ?? []);
        setTeamStats(statsData ?? {});
        setTopPlayers(topData ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId]);

  async function fetchStats(comp, cat = topCat) {
    if (!teamId) return;
    setStatsLoading(true);
    try {
      const qs = comp
        ? `?competition_type=${comp.competition_type}&competition_id=${comp.competition_id}`
        : '';
      const [statsData, topData] = await Promise.all([
        apiGet(`/teams/${teamId}/stats${qs}`),
        apiGet(`/teams/${teamId}/players/stats${qs ? qs + `&stat=${cat}&limit=5` : `?stat=${cat}&limit=5`}`),
      ]);
      setTeamStats(statsData ?? {});
      setTopPlayers(topData ?? []);
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchTop(cat) {
    if (!teamId) return;
    setStatsLoading(true);
    try {
      const qs = activeComp
        ? `?competition_type=${activeComp.competition_type}&competition_id=${activeComp.competition_id}&stat=${cat}&limit=5`
        : `?stat=${cat}&limit=5`;
      const topData = await apiGet(`/teams/${teamId}/players/stats${qs}`);
      setTopPlayers(topData ?? []);
    } finally {
      setStatsLoading(false);
    }
  }

  const handleCompChange = (comp) => {
    setActiveComp(comp);
    fetchStats(comp, topCat);
  };

  const handleCatChange = (cat) => {
    setTopCat(cat);
    fetchTop(cat);
  };

  if (loading) return (
    <AppShell title="Statistiche">
      <div className="flex items-center justify-center h-48 text-muted font-condensed">
        Caricamento…
      </div>
    </AppShell>
  );

  const s = teamStats ?? {};
  const winPct = s.matches > 0 ? Math.round(s.wins / s.matches * 100) : null;
  const setsPct = (s.sets_won + s.sets_lost) > 0
    ? Math.round(s.sets_won / (s.sets_won + s.sets_lost) * 100)
    : null;

  const statSections = [
    {
      title: 'Risultati',
      rows: [
        { label: 'Partite giocate', value: s.matches                           },
        { label: 'Vittorie',        value: s.wins,    percent: winPct           },
        { label: 'Sconfitte',       value: s.losses                             },
        { label: 'Set vinti',       value: s.sets_won, percent: setsPct         },
        { label: 'Set persi',       value: s.sets_lost                          },
      ],
    },
    {
      title: 'Statistiche tecniche',
      rows: [
        { label: 'Ace totali',          value: s.aces                           },
        { label: 'Muri totali',         value: s.blocks                         },
        { label: '% ricezione positiva',value: null,   percent: s.recv_pct      },
        { label: '% attacchi vincenti', value: null,   percent: s.kill_pct      },
      ],
    },
  ];

  return (
    <AppShell title="Statistiche">
      <div className="max-w-4xl mx-auto space-y-6">

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-red text-sm">
            {error}
          </div>
        )}

        {/* Competition tabs */}
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

        {/* Team stat sections */}
        <div className={`grid gap-4 md:grid-cols-2 transition-opacity ${statsLoading ? 'opacity-40' : ''}`}>
          {statSections.map(sec => (
            <StatSection key={sec.title} title={sec.title} rows={sec.rows} />
          ))}
        </div>

        {/* Top players */}
        <div className="bg-surf1 border border-white/7 rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="font-condensed font-bold text-xs text-subtle uppercase tracking-widest">
              Classifica giocatori
            </h3>
            <div className="flex gap-1">
              {TOP_CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleCatChange(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-condensed font-semibold transition-all
                    ${topCat === key
                      ? 'bg-teamA/20 text-teamA border border-teamA/30'
                      : 'text-muted hover:text-text hover:bg-surf2 border border-transparent'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={`space-y-2 transition-opacity ${statsLoading ? 'opacity-40' : ''}`}>
            {topPlayers.length === 0 ? (
              <p className="text-muted font-condensed text-sm text-center py-4">Nessun dato</p>
            ) : topPlayers.map((p, i) => {
              const cat = TOP_CATEGORIES.find(c => c.key === topCat);
              const val = p[cat?.statKey ?? 'pts'];
              const displayVal = topCat === 'kill_pct'
                ? pct(val)
                : fmt(val);
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/players/${p.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surf2 border border-white/5
                             cursor-pointer hover:border-teamA/20 transition-all group"
                >
                  <span className="font-condensed font-black text-lg text-subtle w-5 flex-shrink-0 text-center">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-teamA flex items-center justify-center
                                  font-condensed font-black text-sm text-white flex-shrink-0">
                    {p.shirt_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-condensed font-bold text-sm text-text truncate">
                      {p.surname} {p.name}
                    </p>
                    <p className="text-subtle text-xs font-condensed">
                      {ROLE_MAP[p.role] ?? p.role ?? '—'}
                    </p>
                  </div>
                  <span className={`font-condensed font-black text-xl
                    ${topCat === 'kill_pct' ? 'text-amber' : 'text-teamA'}`}>
                    {displayVal}
                  </span>
                  <span className="text-teamA text-sm opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
