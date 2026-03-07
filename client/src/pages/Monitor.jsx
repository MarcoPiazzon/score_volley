import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';
import { Match, Squad, Player } from '@/lib/match-engine';
import {
  STAT, ACTION_MAP, ACTION_EXTRA, ACTION_LABELS, ACTION_COLORS,
} from '@/lib/enums';

// ── Court position maps (2 colonne × 3 righe) ─────────────────────
const COURT_POS_A = {
  1: [14, 80], 2: [37, 80], 3: [37, 50],
  4: [37, 20], 5: [14, 20], 6: [14, 50],
};
const COURT_POS_B = {
  1: [86, 20], 2: [63, 20], 3: [63, 50],
  4: [63, 80], 5: [86, 80], 6: [86, 50],
};

// ── Utility ───────────────────────────────────────────────────────
function Flash({ msg, color }) {
  if (!msg) return null;
  return (
    <div
      key={msg + color}
      className="flash-msg font-condensed font-semibold text-sm px-5 py-2.5 rounded-xl z-50"
      style={{ background: color }}
    >
      {msg}
    </div>
  );
}

// ── Court Player Bubble ────────────────────────────────────────────
function CourtPlayer({ player, posMap, rotIdx, isSelected, isOutTarget, isServing, onClick }) {
  const pos    = posMap[rotIdx + 1];
  if (!pos) return null;
  const [x, y] = pos;

  return (
    <div
      onClick={onClick}
      className={[
        'court-player',
        `team-${player.team}`,
        player.libero ? 'libero' : '',
        isSelected  ? 'selected'   : '',
        isOutTarget ? 'out-target' : '',
      ].filter(Boolean).join(' ')}
      style={{ left: `${x}%`, top: `${y}%` }}
      title={`#${player.shirtNumber} ${player.fullName} · ${player.role}`}
    >
      {player.shirtNumber}
      {isServing && <span className="serve-dot" />}
    </div>
  );
}

// ── Bench Player Row ──────────────────────────────────────────────
function BenchRow({ player, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer
                  transition-all duration-100
                  ${isSelected
                    ? player.team === 'a'
                      ? 'bg-teamA/20 border border-teamA/40'
                      : 'bg-teamB/20 border border-teamB/40'
                    : 'hover:bg-surf3 border border-transparent'
                  }`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center
                       font-condensed font-bold text-sm flex-shrink-0 text-white
                       ${player.team === 'a' ? 'bg-teamA' : 'bg-teamB'}
                       ${player.libero ? 'opacity-70' : ''}`}>
        {player.shirtNumber}
      </div>
      <div className="min-w-0">
        <p className="text-text text-xs font-medium truncate">{player.displayName}</p>
        <p className="text-subtle text-[10px] capitalize">{player.role}</p>
      </div>
    </div>
  );
}

// ── Action Button ─────────────────────────────────────────────────
const ACTION_GROUPS = [
  { label: 'Azione',  actions: ['POINT', 'ACE', 'OUT', 'SERVE_ERROR', 'LOST_BALL', 'BLOCKED'] },
  { label: 'Falli',   actions: ['DOUBLE', '4TOUCHES', 'RAISED', 'POSITION', 'INVASION'] },
];

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function Monitor() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();

  // Il match engine vive in un ref (non React state) per evitare re-render inutili
  const matchRef  = useRef(null);
  const [tick, setTick]       = useState(0);      // forza re-render dopo ogni azione
  const rerender = useCallback(() => setTick(t => t + 1), []);

  const [flash,   setFlash]   = useState({ msg: '', color: '' });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // UI State
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [subMode,   setSubMode]   = useState(false);
  const [outPlayer, setOutPlayer] = useState(null);
  const [cardMode,  setCardMode]  = useState(null);  // 'yellow'|'red'|null
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsCat,  setStatsCat]  = useState('Generali');
  const [saving,    setSaving]    = useState(false);

  const showFlash = useCallback((msg, color = '#3b8bff') => {
    setFlash({ msg, color });
    setTimeout(() => setFlash({ msg: '', color: '' }), 2000);
  }, []);

  // ── Auto-select server ─────────────────────────────────────────
  const autoSelectServer = useCallback(() => {
    const m = matchRef.current;
    if (!m?.servingSquad) return;
    setSelectedPlayer(m.servingSquad.players[0] ?? null);
  }, []);

  // ── Load lineup ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchData, lineupData] = await Promise.all([
          apiGet(`/matches/${matchId}`),
          apiGet(`/matches/${matchId}/lineup`),
        ]);
        localStorage.setItem('openMatch', JSON.stringify(matchData));

        const { home, away } = lineupData;

        const makeSquad = (teamData, side) => {
          const squad = new Squad({
            teamId:    teamData.team_id,
            name:      teamData.team_name,
            shortName: teamData.team_name?.slice(0, 3).toUpperCase(),
            side,
          });

          // Starters → ordinati per position_number
          const starters = [...teamData.starters].sort(
            (a, b) => a.position_number - b.position_number
          );
          squad.players = starters.map(p => {
            const player = new Player({
              id:          p.player_id,
              shirtNumber: p.shirt_number,
              name:        p.name,
              surname:     p.surname,
              role:        p.role,
              team:        side,
              libero:      !!p.is_libero,
            });
            player.onCourt = true;
            return player;
          });

          squad.bench = teamData.bench.map(p => new Player({
            id:          p.player_id,
            shirtNumber: p.shirt_number,
            name:        p.name,
            surname:     p.surname,
            role:        p.role,
            team:        side,
            libero:      !!p.is_libero,
          }));

          return squad;
        };

        const squadA = makeSquad(home, 'a');
        const squadB = makeSquad(away, 'b');

        const match = new Match(squadA, squadB);

        match._onSetEnd = (winner, sA, sB) => {
          const setNum = match.currentSetNumber - 1;
          showFlash(`Set ${setNum} → ${winner.shortName}! (${sA}-${sB})`,
                    winner.side === 'a' ? '#3b8bff' : '#ff6b35');
          autoSelectServer();
          rerender();
        };
        match._onMatchEnd = (winner) => {
          showFlash(`🏆 Vittoria ${winner.shortName}! (${winner.setsWon}-${
            (winner === match.squadA ? match.squadB : match.squadA).setsWon})`, '#f5c542');
          rerender();
        };
        match._onFieldChange = () => {
          showFlash('↕ Cambio campo (5° set)', '#f5c542');
        };

        match.startMatch(squadA);
        matchRef.current = match;
        autoSelectServer();
        rerender();
      } catch (err) {
        console.error(err);
        setError(err.message ?? 'Impossibile caricare la partita');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const match = matchRef.current;

  // ── Handle court click ─────────────────────────────────────────
  const handleCourtClick = useCallback((player) => {
    if (!matchRef.current) return;
    const m = matchRef.current;

    // Card mode
    if (cardMode) {
      m.assignCard(player, cardMode);
      showFlash(`Cartellino ${cardMode === 'red' ? 'rosso 🟥' : 'giallo 🟨'} — #${player.shirtNumber}`,
                cardMode === 'red' ? '#f04e4e' : '#f5c542');
      setCardMode(null);
      autoSelectServer();
      rerender();
      return;
    }

    // Sub mode — selezione chi esce (solo titolari in campo)
    if (subMode) {
      setOutPlayer(player);
      return;
    }

    // Normal: toggle select
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
  }, [cardMode, subMode, showFlash, autoSelectServer, rerender]);

  const handleBenchClick = useCallback((player) => {
    if (!matchRef.current) return;
    const m = matchRef.current;

    // Card mode: puoi dare cartellino anche a chi è in panchina
    if (cardMode) {
      m.assignCard(player, cardMode);
      showFlash(`Cartellino ${cardMode === 'red' ? 'rosso 🟥' : 'giallo 🟨'} — #${player.shirtNumber}`,
                cardMode === 'red' ? '#f04e4e' : '#f5c542');
      setCardMode(null);
      autoSelectServer();
      rerender();
      return;
    }

    // Sub mode — selezione chi entra
    if (subMode && outPlayer) {
      try {
        const squad = player.team === 'a' ? m.squadA : m.squadB;
        m.makeSubstitute(squad, outPlayer, player);
        showFlash(`↕ Cambio: #${outPlayer.shirtNumber} → #${player.shirtNumber}`, '#a78bfa');
        setSubMode(false);
        setOutPlayer(null);
        autoSelectServer();
        rerender();
      } catch (err) {
        showFlash(err.message, '#f04e4e');
      }
      return;
    }

    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
  }, [cardMode, subMode, outPlayer, showFlash, autoSelectServer, rerender]);

  // ── Register event ─────────────────────────────────────────────
  const registerEvent = useCallback((type) => {
    if (!matchRef.current) return;
    const m = matchRef.current;

    if (type === 'CHANGE') {
      if (subMode) { setSubMode(false); setOutPlayer(null); return; }
      setSubMode(true); setOutPlayer(null);
      showFlash('Modalità cambio attiva', '#a78bfa');
      return;
    }
    if (type === 'TIMEOUT_A' || type === 'TIMEOUT_B') {
      const squad = type === 'TIMEOUT_A' ? m.squadA : m.squadB;
      if (!m.callTimeout(squad)) {
        showFlash(`${squad.shortName}: timeout esauriti`, '#f04e4e'); return;
      }
      showFlash(`⏱ Timeout ${squad.shortName} (${squad.timeout}/2)`, '#3b8bff');
      rerender(); return;
    }
    if (type === 'YELLOW_CARD') {
      setCardMode(cm => cm === 'yellow' ? null : 'yellow');
      showFlash('Seleziona giocatore per cartellino giallo 🟨', '#f5c542'); return;
    }
    if (type === 'RED_CARD') {
      setCardMode(cm => cm === 'red' ? null : 'red');
      showFlash('Seleziona giocatore per cartellino rosso 🟥', '#f04e4e'); return;
    }
    if (type === 'UNDO') {
      if (!m.undoLastPoint()) { showFlash('Nulla da annullare', '#64748b'); return; }
      showFlash('↩ Annullato', '#f5c542');
      autoSelectServer();
      rerender(); return;
    }
    if (type === 'SWAP_SERVE') {
      m.servingSquad = m.servingSquad === m.squadA ? m.squadB : m.squadA;
      m.assignServe();
      autoSelectServer();
      rerender();
      showFlash('⇄ Battuta cambiata', '#a78bfa'); return;
    }

    // Score actions
    const action = ACTION_MAP[type];
    if (!action) { console.warn('Evento sconosciuto:', type); return; }
    if (!selectedPlayer) { showFlash('Seleziona prima un giocatore!', '#f04e4e'); return; }

    const player = selectedPlayer;
    const squad  = player.team === 'a' ? m.squadA : m.squadB;
    const extras = ACTION_EXTRA[type] ?? [];
    extras.forEach(s => {
      m.addStatPlayer(player, s);
      m.addStatSet(player, s);
    });
    if (type === 'ACE') {
      m.addStatPlayer(player, STAT.TOUCHES);
      m.addStatSet(player, STAT.TOUCHES);
    }
    m.scorePoint(player, action.value, action.stat);
    showFlash(ACTION_LABELS[type] ?? type, ACTION_COLORS[type] ?? '#e8eaf2');
    autoSelectServer();
    rerender();
  }, [subMode, selectedPlayer, showFlash, autoSelectServer, rerender]);

  // ── Save match ────────────────────────────────────────────────
  const saveMatch = async () => {
    if (!match) return;
    const matchMeta = JSON.parse(localStorage.getItem('openMatch') ?? '{}');
    if (!matchMeta.id) { showFlash('ID partita mancante', '#f04e4e'); return; }

    const confirmed = window.confirm(
      `Salvare la partita?\n${match.squadA.name} ${match.squadA.setsWon}–${match.squadB.setsWon} ${match.squadB.name}`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = match.toSavePayload(matchMeta);
      const res = await apiPost(`/matches/${matchMeta.id}/save`, payload);
      showFlash(`✓ Salvata (${res.sets} set, ${res.players} giocatori)`, '#22d47a');
    } catch (err) {
      showFlash(`Errore: ${err.message}`, '#f04e4e');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-muted font-condensed text-lg">Caricamento formazione…</div>
    </div>
  );

  if (error || !match) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <p className="text-red font-condensed text-lg">{error || 'Errore caricamento'}</p>
      <button onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-surf2 border border-white/10 rounded-xl
                         text-text font-condensed hover:bg-surf3 transition-colors">
        ← Dashboard
      </button>
    </div>
  );

  const { squadA, squadB } = match;

  // ── Computed state for render ──────────────────────────────────
  const servingSide = match.servingSquad?.side;

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex flex-col overflow-hidden"
         style={{ height: '100dvh' }}>
      <Flash msg={flash.msg} color={flash.color} />

      {/* ═══ TOP BAR ═════════════════════════════════════════════ */}
      <header className="bg-surf1 border-b border-white/7 px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Back */}
          <button onClick={() => navigate('/dashboard')}
                  className="w-8 h-8 rounded-lg bg-surf2 hover:bg-surf3 flex items-center justify-center
                             text-muted hover:text-text transition-colors text-sm flex-shrink-0">
            ←
          </button>

          {/* Team A Score */}
          <div className="flex-1 flex items-center gap-2">
            <div className="text-center">
              <div className="font-condensed font-black text-3xl leading-none text-teamA">
                {squadA.score}
              </div>
              <div className="text-muted text-[10px] font-condensed truncate max-w-[80px]">
                {squadA.shortName}
              </div>
            </div>

            {/* Set pips */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="bg-surf3/70 px-2 py-0.5 rounded-full text-[10px] font-condensed text-muted">
                SET {match.currentSetNumber}
              </div>
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="flex gap-0.5 items-center">
                    <span className={`text-xs font-condensed font-bold
                      ${i < squadA.setsWon ? 'text-teamA' : 'text-subtle'}`}>
                      {i < squadA.setsWon ? '✓' : (match.sets[i]?.scoreA ?? 0)}
                    </span>
                    <span className="text-subtle text-[9px]">-</span>
                    <span className={`text-xs font-condensed font-bold
                      ${i < squadB.setsWon ? 'text-teamB' : 'text-subtle'}`}>
                      {i < squadB.setsWon ? '✓' : (match.sets[i]?.scoreB ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B Score */}
            <div className="text-center">
              <div className="font-condensed font-black text-3xl leading-none text-teamB">
                {squadB.score}
              </div>
              <div className="text-muted text-[10px] font-condensed truncate max-w-[80px]">
                {squadB.shortName}
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => registerEvent('SWAP_SERVE')}
                    className="px-2 py-1.5 bg-surf2 hover:bg-surf3 rounded-lg
                               text-muted hover:text-text font-condensed text-xs transition-colors">
              ⇄
            </button>
            <button onClick={() => registerEvent('UNDO')}
                    className="px-2 py-1.5 bg-surf2 hover:bg-amber/20 border border-transparent
                               hover:border-amber/30 rounded-lg text-muted hover:text-amber
                               font-condensed text-xs transition-colors">
              ↩
            </button>
            <button onClick={saveMatch} disabled={saving}
                    className="px-2 py-1.5 bg-surf2 hover:bg-green/20 border border-transparent
                               hover:border-green/30 rounded-lg text-muted hover:text-green
                               font-condensed text-xs transition-colors disabled:opacity-40">
              {saving ? '⏳' : '💾'}
            </button>
            <button onClick={() => setStatsOpen(o => !o)}
                    className={`px-2 py-1.5 rounded-lg font-condensed text-xs transition-colors
                      ${statsOpen
                        ? 'bg-purple/20 border border-purple/30 text-purple'
                        : 'bg-surf2 hover:bg-surf3 text-muted hover:text-text border border-transparent'
                      }`}>
              ◉
            </button>
          </div>
        </div>
      </header>

      {/* ═══ SELECTED PLAYER BAR ═════════════════════════════════ */}
      <div className={`flex-shrink-0 px-3 py-2 border-b border-white/5 text-sm font-condensed
                        transition-colors duration-200
                       ${subMode     ? 'bg-purple/10 text-purple' :
                         cardMode    ? 'bg-amber/10 text-amber'   :
                         selectedPlayer ? (selectedPlayer.team === 'a'
                           ? 'bg-teamA/10 text-teamA'
                           : 'bg-teamB/10 text-teamB')
                         : 'bg-surf1 text-muted'}`}>
        {subMode && !outPlayer && '⇄ Cambio — seleziona il giocatore che ESCE dal campo'}
        {subMode && outPlayer  && `⇄ Fuori: #${outPlayer.shirtNumber} ${outPlayer.fullName} — seleziona dalla panchina chi ENTRA`}
        {cardMode && !subMode  && `${cardMode === 'red' ? '🟥' : '🟨'} Cartellino ${cardMode} — clicca un giocatore`}
        {!subMode && !cardMode && selectedPlayer &&
          `#${selectedPlayer.shirtNumber} ${selectedPlayer.fullName} · ${selectedPlayer.role}`}
        {!subMode && !cardMode && !selectedPlayer &&
          'Seleziona un giocatore per registrare un evento'}
      </div>

      {/* ═══ MAIN AREA ═══════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── BENCH A ─────────────────────────────────────── */}
        <div className="w-[100px] lg:w-[130px] flex flex-col bg-surf1 border-r border-white/7 flex-shrink-0">
          <div className="px-2 py-1.5 border-b border-white/5">
            <p className="text-[10px] font-condensed text-teamA font-semibold uppercase tracking-wide">
              {squadA.shortName} · panchina
            </p>
            <p className="text-subtle text-[10px] font-condensed">T/O: {squadA.timeout}/2</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1 space-y-0.5">
            {squadA.bench.map(p => (
              <BenchRow key={p.id} player={p}
                        isSelected={selectedPlayer?.id === p.id}
                        onClick={() => handleBenchClick(p)} />
            ))}
          </div>
          {/* Timeout A */}
          <button onClick={() => registerEvent('TIMEOUT_A')}
                  className="mx-2 mb-2 py-1.5 bg-surf2 hover:bg-teamA/20 border border-transparent
                             hover:border-teamA/30 rounded-lg text-muted hover:text-teamA
                             font-condensed text-xs transition-colors">
            T/O A
          </button>
        </div>

        {/* ── COURT ──────────────────────────────────────── */}
        <div className="flex-1 relative" style={{ background: '#c8a55a' }}>
          {/* Court lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 }}>
            {/* Center line */}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="2" />
            {/* Net */}
            <line x1="50%" y1="40%" x2="50%" y2="60%" stroke="white" strokeWidth="4"
                  strokeLinecap="round" opacity="0.8" />
            {/* Attack lines */}
            <line x1="0" y1="37%" x2="50%" y2="37%" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="50%" y1="37%" x2="100%" y2="37%" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="0" y1="63%" x2="50%" y2="63%" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="50%" y1="63%" x2="100%" y2="63%" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>

          {/* Team A players */}
          {squadA.players.map((p, idx) => (
            <CourtPlayer key={p.id} player={p} posMap={COURT_POS_A} rotIdx={idx}
                         isSelected={selectedPlayer?.id === p.id}
                         isOutTarget={outPlayer?.id === p.id}
                         isServing={servingSide === 'a' && idx === 0}
                         onClick={() => handleCourtClick(p)} />
          ))}

          {/* Team B players */}
          {squadB.players.map((p, idx) => (
            <CourtPlayer key={p.id} player={p} posMap={COURT_POS_B} rotIdx={idx}
                         isSelected={selectedPlayer?.id === p.id}
                         isOutTarget={outPlayer?.id === p.id}
                         isServing={servingSide === 'b' && idx === 0}
                         onClick={() => handleCourtClick(p)} />
          ))}
        </div>

        {/* ── BENCH B ─────────────────────────────────────── */}
        <div className="w-[100px] lg:w-[130px] flex flex-col bg-surf1 border-l border-white/7 flex-shrink-0">
          <div className="px-2 py-1.5 border-b border-white/5">
            <p className="text-[10px] font-condensed text-teamB font-semibold uppercase tracking-wide">
              {squadB.shortName} · panchina
            </p>
            <p className="text-subtle text-[10px] font-condensed">T/O: {squadB.timeout}/2</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1 space-y-0.5">
            {squadB.bench.map(p => (
              <BenchRow key={p.id} player={p}
                        isSelected={selectedPlayer?.id === p.id}
                        onClick={() => handleBenchClick(p)} />
            ))}
          </div>
          <button onClick={() => registerEvent('TIMEOUT_B')}
                  className="mx-2 mb-2 py-1.5 bg-surf2 hover:bg-teamB/20 border border-transparent
                             hover:border-teamB/30 rounded-lg text-muted hover:text-teamB
                             font-condensed text-xs transition-colors">
            T/O B
          </button>
        </div>

        {/* ── STATS PANEL (slide-in) ────────────────────── */}
        {statsOpen && (
          <div className="w-72 lg:w-80 bg-surf1 border-l border-white/7 flex flex-col overflow-hidden flex-shrink-0">
            <StatsPanel match={match} statsCat={statsCat} setStatsCat={setStatsCat} />
          </div>
        )}
      </div>

      {/* ═══ ACTION BUTTONS ══════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-surf1 border-t border-white/7 px-2 py-2">
        {/* Change + Card row */}
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => registerEvent('CHANGE')}
            className={`flex-1 py-2 rounded-xl font-condensed text-sm font-semibold transition-all
              ${subMode
                ? 'bg-purple/20 border border-purple/40 text-purple'
                : 'bg-surf2 hover:bg-surf3 border border-white/7 text-muted hover:text-text'
              }`}
          >
            {subMode ? '✕ Annulla cambio' : '⇄ Cambio'}
          </button>
          <button
            onClick={() => registerEvent('YELLOW_CARD')}
            className={`px-3 py-2 rounded-xl font-condensed text-sm font-semibold transition-all
              ${cardMode === 'yellow'
                ? 'bg-amber/20 border border-amber/40 text-amber'
                : 'bg-surf2 hover:bg-surf3 border border-white/7 text-muted hover:text-amber'
              }`}
          >
            🟨
          </button>
          <button
            onClick={() => registerEvent('RED_CARD')}
            className={`px-3 py-2 rounded-xl font-condensed text-sm font-semibold transition-all
              ${cardMode === 'red'
                ? 'bg-red/20 border border-red/40 text-red'
                : 'bg-surf2 hover:bg-surf3 border border-white/7 text-muted hover:text-red'
              }`}
          >
            🟥
          </button>
        </div>

        {/* Score actions */}
        {ACTION_GROUPS.map(group => (
          <div key={group.label} className="flex gap-1 mb-1.5">
            {group.actions.map(type => {
              const colors = {
                POINT: 'hover:bg-green/20 hover:border-green/30 hover:text-green',
                ACE:   'hover:bg-green/20 hover:border-green/30 hover:text-green',
                OUT:   'hover:bg-red/20 hover:border-red/30 hover:text-red',
                SERVE_ERROR: 'hover:bg-red/20 hover:border-red/30 hover:text-red',
              };
              return (
                <button
                  key={type}
                  onClick={() => registerEvent(type)}
                  disabled={!selectedPlayer}
                  className={`flex-1 py-2 rounded-xl font-condensed text-xs font-semibold
                             transition-all border border-white/7 bg-surf2
                             disabled:opacity-30 disabled:cursor-not-allowed
                             ${colors[type] ?? 'hover:bg-surf3 hover:text-text text-muted'}`}
                >
                  {ACTION_LABELS[type]}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats Panel ────────────────────────────────────────────────────
const STAT_CATS = {
  Generali:  [STAT.TOUCHES, STAT.POINTS_PLAYED],
  Attacco:   [STAT.ATTACK_WIN, STAT.ATTACK_OUT, STAT.ATTACK_NOT_SUCCESSFUL, STAT.TOTAL_ATTACK],
  Battuta:   [STAT.ACE, STAT.SERVES, STAT.SERVES_ERR, STAT.TOTAL_SERVES],
  Muro:      [STAT.BLOCK_SUCCESSFUL, STAT.BLOCK_NOT_SUCCESSFUL, STAT.TOTAL_BLOCK],
  Falli:     [STAT.FOUL_DOUBLE, STAT.FOUL_FOUR_TOUCHES, STAT.FOUL_RAISED, STAT.FOUL_POSITION, STAT.FOUL_INVASION, STAT.TOTAL_FOUL],
  Cartellini:[STAT.CARD_YELLOW, STAT.CARD_RED],
};

const STAT_LABELS = {
  [STAT.TOUCHES]:             'Tocchi',
  [STAT.POINTS_PLAYED]:       'Punti giocati',
  [STAT.ATTACK_WIN]:          'Kill',
  [STAT.ATTACK_OUT]:          'Out',
  [STAT.ATTACK_NOT_SUCCESSFUL]:'Murato',
  [STAT.TOTAL_ATTACK]:        'Totale att.',
  [STAT.ACE]:                 'Ace',
  [STAT.SERVES]:              'Battute ok',
  [STAT.SERVES_ERR]:          'Errori batt.',
  [STAT.TOTAL_SERVES]:        'Totale batt.',
  [STAT.BLOCK_SUCCESSFUL]:    'Muri',
  [STAT.BLOCK_NOT_SUCCESSFUL]:'Tentati',
  [STAT.TOTAL_BLOCK]:         'Totale muri',
  [STAT.FOUL_DOUBLE]:         'Doppio',
  [STAT.FOUL_FOUR_TOUCHES]:   '4 tocchi',
  [STAT.FOUL_RAISED]:         'Sollevata',
  [STAT.FOUL_POSITION]:       'Posizione',
  [STAT.FOUL_INVASION]:       'Invasione',
  [STAT.TOTAL_FOUL]:          'Totale falli',
  [STAT.CARD_YELLOW]:         'Gialli',
  [STAT.CARD_RED]:            'Rossi',
};

function StatsPanel({ match, statsCat, setStatsCat }) {
  const keys = STAT_CATS[statsCat] ?? [];

  const renderTeam = (squad) => {
    const allPlayers = [...squad.players, ...squad.bench];
    return (
      <div>
        <p className={`text-[10px] font-condensed font-bold uppercase tracking-wide mb-1
                       ${squad.side === 'a' ? 'text-teamA' : 'text-teamB'}`}>
          {squad.name}
        </p>
        <table className="w-full text-[10px] font-condensed">
          <thead>
            <tr className="text-subtle">
              <th className="text-left pb-1 font-normal">#</th>
              {keys.map(k => (
                <th key={k} className="text-right pb-1 font-normal"
                    title={STAT_LABELS[k]}>
                  {STAT_LABELS[k]?.slice(0,4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPlayers.map(p => (
              <tr key={p.id}
                  className={`border-t border-white/5 ${!p.onCourt ? 'opacity-50' : ''}`}>
                <td className="py-0.5 text-text font-semibold">{p.shirtNumber}</td>
                {keys.map(k => (
                  <td key={k} className={`text-right py-0.5
                    ${p.stats[k] > 0 ? 'text-text' : 'text-subtle'}`}>
                    {p.stats[k] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="px-3 py-2 border-b border-white/7">
        <p className="text-text text-xs font-condensed font-semibold mb-2">Statistiche</p>
        <div className="flex flex-wrap gap-1">
          {Object.keys(STAT_CATS).map(cat => (
            <button key={cat} onClick={() => setStatsCat(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-condensed transition-all
                      ${statsCat === cat
                        ? 'bg-purple/20 border border-purple/30 text-purple'
                        : 'bg-surf2 text-muted hover:text-text border border-transparent'
                      }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {renderTeam(match.squadA)}
        {renderTeam(match.squadB)}
      </div>
    </>
  );
}
