import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';
import { Match, Squad, Player } from '@/lib/match-engine';
import { STAT } from '@/lib/enums';
import './Monitor.css';

// ── Court position maps (fedeli all'originale) ────────────────────
const COURT_POS_A = {
  1: [14, 80], 2: [37, 80], 3: [37, 50],
  4: [37, 20], 5: [14, 20], 6: [14, 50],
};
const COURT_POS_B = {
  1: [86, 20], 2: [63, 20], 3: [63, 50],
  4: [63, 80], 5: [86, 80], 6: [86, 50],
};

const ROLE_MAP = {
  setter: 'Palleggiatore', outside_hitter: 'Schiacciatore', opposite: 'Opposto',
  middle_blocker: 'Centrale', libero: 'Libero', defensive_specialist: 'Difensore',
};

// ── Stats config ──────────────────────────────────────────────────
const STAT_CATS = {
  Generali:  [STAT.TOUCHES, STAT.POINTS_PLAYED],
  Attacco:   [STAT.ATTACK_WIN, STAT.ATTACK_OUT, STAT.ATTACK_NOT_SUCCESSFUL, STAT.TOTAL_ATTACK],
  Battuta:   [STAT.ACE, STAT.SERVES, STAT.SERVES_ERR, STAT.TOTAL_SERVES],
  Difesa:    [STAT.DEF_POS, STAT.DEF_NEG, STAT.TOTAL_RECEIVE],
  Muro:      [STAT.BLOCK_SUCCESSFUL, STAT.BLOCK_NOT_SUCCESSFUL, STAT.TOTAL_BLOCK],
  Falli:     [STAT.FOUL_DOUBLE, STAT.FOUL_FOUR_TOUCHES, STAT.FOUL_RAISED, STAT.FOUL_POSITION, STAT.FOUL_INVASION, STAT.TOTAL_FOUL],
  Cartellini:[STAT.CARD_YELLOW, STAT.CARD_RED, STAT.TOTAL_CARD],
};
const STAT_SHORT = {
  [STAT.TOUCHES]: 'Toc', [STAT.POINTS_PLAYED]: 'Pts',
  [STAT.ATTACK_WIN]: 'Kill', [STAT.ATTACK_OUT]: 'Out', [STAT.ATTACK_NOT_SUCCESSFUL]: 'NV', [STAT.TOTAL_ATTACK]: 'Tot',
  [STAT.ACE]: 'Ace', [STAT.SERVES]: 'OK', [STAT.SERVES_ERR]: 'Err', [STAT.TOTAL_SERVES]: 'Tot',
  [STAT.DEF_POS]: 'Pos', [STAT.DEF_NEG]: 'Neg', [STAT.TOTAL_RECEIVE]: 'Tot',
  [STAT.BLOCK_SUCCESSFUL]: 'Muro', [STAT.BLOCK_NOT_SUCCESSFUL]: 'Ten', [STAT.TOTAL_BLOCK]: 'Tot',
  [STAT.FOUL_DOUBLE]: 'Dop', [STAT.FOUL_FOUR_TOUCHES]: '4T', [STAT.FOUL_RAISED]: 'Alz',
  [STAT.FOUL_POSITION]: 'Pos', [STAT.FOUL_INVASION]: 'Inv', [STAT.TOTAL_FOUL]: 'Tot',
  [STAT.CARD_YELLOW]: 'Gial', [STAT.CARD_RED]: 'Ros', [STAT.TOTAL_CARD]: 'Tot',
};
const STAT_FULL = {
  [STAT.TOUCHES]: 'Tocchi', [STAT.POINTS_PLAYED]: 'Punti giocati',
  [STAT.ATTACK_WIN]: 'Attacchi vincenti', [STAT.ATTACK_OUT]: 'Attacchi out',
  [STAT.ATTACK_NOT_SUCCESSFUL]: 'Non vincenti', [STAT.TOTAL_ATTACK]: 'Totale attacchi',
  [STAT.ACE]: 'Ace', [STAT.SERVES]: 'Battute OK', [STAT.SERVES_ERR]: 'Errori battuta',
  [STAT.TOTAL_SERVES]: 'Totale battute',
  [STAT.DEF_POS]: 'Ricezione positiva', [STAT.DEF_NEG]: 'Ricezione negativa', [STAT.TOTAL_RECEIVE]: 'Totale ricezioni',
  [STAT.BLOCK_SUCCESSFUL]: 'Muri vincenti', [STAT.BLOCK_NOT_SUCCESSFUL]: 'Muri non vincenti', [STAT.TOTAL_BLOCK]: 'Totale muri',
  [STAT.FOUL_DOUBLE]: 'Doppio fallo', [STAT.FOUL_FOUR_TOUCHES]: '4 tocchi',
  [STAT.FOUL_RAISED]: 'Alzata irregolare', [STAT.FOUL_POSITION]: 'Fallo posizione',
  [STAT.FOUL_INVASION]: 'Invasione', [STAT.TOTAL_FOUL]: 'Totale falli',
  [STAT.CARD_YELLOW]: 'Cartellini gialli', [STAT.CARD_RED]: 'Cartellini rossi', [STAT.TOTAL_CARD]: 'Totale cartellini',
};

// ── Action config (identico all'originale) ────────────────────────
const ACTION_MAP = {
  POINT:       { stat: STAT.ATTACK_WIN,          value: true  },
  ACE:         { stat: STAT.ACE,                 value: true  },
  OUT:         { stat: STAT.ATTACK_OUT,           value: false },
  LOST_BALL:   { stat: STAT.BALL_LOST,            value: false },
  SERVE_ERROR: { stat: STAT.SERVES_ERR,           value: false },
  BLOCKED:     { stat: STAT.BLOCK_NOT_SUCCESSFUL, value: false },
  DOUBLE:      { stat: STAT.FOUL_DOUBLE,          value: false },
  '4TOUCHES':  { stat: STAT.FOUL_FOUR_TOUCHES,    value: false },
  RAISED:      { stat: STAT.FOUL_RAISED,          value: false },
  POSITION:    { stat: STAT.FOUL_POSITION,        value: false },
  INVASION:    { stat: STAT.FOUL_INVASION,        value: false },
};
const ACTION_EXTRA = {
  POINT:       [STAT.TOTAL_ATTACK],
  ACE:         [STAT.TOTAL_SERVES, STAT.SERVES],
  OUT:         [STAT.TOTAL_ATTACK],
  SERVE_ERROR: [STAT.TOTAL_SERVES],
  BLOCKED:     [STAT.TOTAL_BLOCK],
  DOUBLE:      [STAT.TOTAL_FOUL],
  '4TOUCHES':  [STAT.TOTAL_FOUL],
  RAISED:      [STAT.TOTAL_FOUL],
  POSITION:    [STAT.TOTAL_FOUL],
  INVASION:    [STAT.TOTAL_FOUL],
};

// ════════════════════════════════════════════════════════════════
//  MONITOR COMPONENT
// ════════════════════════════════════════════════════════════════
export default function Monitor() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();

  const matchRef = useRef(null);
  const flashRef = useRef(null);
  const [tick, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsCat,  setStatsCat]  = useState('Generali');
  const [statsSet,  setStatsSet]  = useState('match'); // 'match' | 'current' | number

  // UI state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [subMode,   setSubMode]   = useState(false);
  const [outPlayer, setOutPlayer] = useState(null);
  const [cardMode,  setCardMode]  = useState(null); // 'yellow'|'red'|null

  // ── Flash (identico all'originale) ──────────────────────────
  const flashMsg = useCallback((msg, color = '#e8eaf2') => {
    const el = flashRef.current;
    if (!el) return;
    el.textContent = msg;
    el.style.color = color;
    el.style.borderColor = color + '44';
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 1400);
  }, []);

  // ── Auto-select server ───────────────────────────────────────
  const autoSelectServer = useCallback(() => {
    const m = matchRef.current;
    if (m?.servingSquad?.players?.[0]) {
      setSelectedPlayer(m.servingSquad.players[0]);
    }
  }, []);

  // ── Load lineup ──────────────────────────────────────────────
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
          const starters = [...teamData.starters].sort(
            (a, b) => a.position_number - b.position_number
          );
          squad.players = starters.map(p => {
            const pl = new Player({
              id: p.player_id, shirtNumber: p.shirt_number,
              name: p.name, surname: p.surname,
              role: p.role, team: side, libero: !!p.is_libero,
            });
            pl.onCourt = true;
            return pl;
          });
          squad.bench = teamData.bench.map(p => new Player({
            id: p.player_id, shirtNumber: p.shirt_number,
            name: p.name, surname: p.surname,
            role: p.role, team: side, libero: !!p.is_libero,
          }));
          return squad;
        };

        const squadA = makeSquad(home, 'a');
        const squadB = makeSquad(away, 'b');
        const match  = new Match(squadA, squadB);

        match._onSetEnd = (winner, sA, sB) => {
          const n = match.currentSetNumber - 1;
          flashMsg(`Set ${n} → ${winner.shortName}! (${sA}-${sB})`,
                   winner.side === 'a' ? '#3b8bff' : '#ff6b35');
          autoSelectServer();
          rerender();
        };
        match._onMatchEnd = (winner) => {
          const other = winner === match.squadA ? match.squadB : match.squadA;
          flashMsg(`🏆 Vittoria ${winner.shortName}! (${winner.setsWon}-${other.setsWon})`, '#f5c542');
          rerender();
        };
        match._onFieldChange = () => flashMsg('↕ Cambio campo (5° set)', '#f5c542');

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

  // ── Court click ──────────────────────────────────────────────
  const handleCourtClick = useCallback((player) => {
    const m = matchRef.current; if (!m) return;
    if (cardMode) {
      m.assignCard(player, cardMode);
      flashMsg(`Cartellino ${cardMode === 'red' ? 'rosso 🟥' : 'giallo 🟨'} — #${player.shirtNumber}`,
               cardMode === 'red' ? '#f04e4e' : '#f5c542');
      setCardMode(null); autoSelectServer(); rerender(); return;
    }
    if (subMode) { setOutPlayer(player); return; }
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
  }, [cardMode, subMode, flashMsg, autoSelectServer, rerender]);

  // ── Bench click ──────────────────────────────────────────────
  const handleBenchClick = useCallback((player) => {
    const m = matchRef.current; if (!m) return;
    if (cardMode) {
      m.assignCard(player, cardMode);
      flashMsg(`Cartellino ${cardMode === 'red' ? 'rosso 🟥' : 'giallo 🟨'} — #${player.shirtNumber}`,
               cardMode === 'red' ? '#f04e4e' : '#f5c542');
      setCardMode(null); autoSelectServer(); rerender(); return;
    }
    if (subMode && outPlayer) {
      try {
        const squad = player.team === 'a' ? m.squadA : m.squadB;
        m.makeSubstitute(squad, outPlayer, player);
        flashMsg(`↕ Cambio: #${outPlayer.shirtNumber} → #${player.shirtNumber}`, '#a78bfa');
        setSubMode(false); setOutPlayer(null); autoSelectServer(); rerender();
      } catch (err) { flashMsg(err.message, '#f04e4e'); }
      return;
    }
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
  }, [cardMode, subMode, outPlayer, flashMsg, autoSelectServer, rerender]);

  // ── Register event ───────────────────────────────────────────
  const registerEvent = useCallback((type) => {
    const m = matchRef.current; if (!m) return;

    if (type === 'CHANGE') {
      if (subMode) { setSubMode(false); setOutPlayer(null); return; }
      setSubMode(true); setOutPlayer(null);
      flashMsg('Cambio: seleziona chi esce dal campo', '#a78bfa'); return;
    }
    if (type === 'TIMEOUT_A' || type === 'TIMEOUT_B') {
      const squad = type === 'TIMEOUT_A' ? m.squadA : m.squadB;
      if (!m.callTimeout(squad)) { flashMsg(`${squad.shortName}: timeout esauriti`, '#f04e4e'); return; }
      flashMsg(`⏱ Timeout ${squad.shortName} (${squad.timeout}/2)`, '#3b8bff');
      rerender(); return;
    }
    if (type === 'YELLOW_CARD') {
      setCardMode(c => c === 'yellow' ? null : 'yellow');
      flashMsg('Seleziona giocatore — cartellino giallo 🟨', '#f5c542'); return;
    }
    if (type === 'RED_CARD') {
      setCardMode(c => c === 'red' ? null : 'red');
      flashMsg('Seleziona giocatore — cartellino rosso 🟥', '#f04e4e'); return;
    }
    if (type === 'UNDO') {
      if (!m.undoLastPoint()) { flashMsg('Nulla da annullare', '#64748b'); return; }
      flashMsg('↩ Punto annullato', '#f5c542');
      autoSelectServer(); rerender(); return;
    }
    if (type === 'SWAP_SERVE') {
      m.servingSquad = m.servingSquad === m.squadA ? m.squadB : m.squadA;
      m.assignServe(); autoSelectServer(); rerender();
      flashMsg('⇄ Battuta cambiata', '#a78bfa'); return;
    }
    if (type === 'SAVE') { saveMatch(); return; }

    const action = ACTION_MAP[type];
    if (!action) return;
    if (!selectedPlayer) { flashMsg('Seleziona prima un giocatore!', '#f04e4e'); return; }

    const extras = ACTION_EXTRA[type] ?? [];
    extras.forEach(s => { m.addStatPlayer(selectedPlayer, s); m.addStatSet(selectedPlayer, s); });
    if (type === 'ACE') { m.addStatPlayer(selectedPlayer, STAT.TOUCHES); m.addStatSet(selectedPlayer, STAT.TOUCHES); }
    m.scorePoint(selectedPlayer, action.value, action.stat);

    const labels = { POINT:'✦ Point!', ACE:'⚡ Ace!', OUT:'✕ Out', LOST_BALL:'○ Lost Ball',
                     SERVE_ERROR:'✗ Serve Error', BLOCKED:'▣ Blocked', DOUBLE:'Double',
                     '4TOUCHES':'4 Touches', RAISED:'Raised', POSITION:'Position', INVASION:'Invasion' };
    const colors = { POINT:'#22d47a', ACE:'#22d47a', SERVE_ERROR:'#f04e4e', OUT:'#f04e4e',
                     BLOCKED:'#64748b', DOUBLE:'#f5c542', '4TOUCHES':'#f5c542',
                     RAISED:'#f5c542', POSITION:'#f5c542', INVASION:'#f5c542', LOST_BALL:'#64748b' };
    flashMsg(labels[type] ?? type, colors[type]);
    autoSelectServer(); rerender();
  }, [subMode, selectedPlayer, flashMsg, autoSelectServer, rerender]);

  // ── Save ─────────────────────────────────────────────────────
  const saveMatch = async () => {
    if (!match) return;
    const meta = JSON.parse(localStorage.getItem('openMatch') ?? '{}');
    if (!meta.id) { flashMsg('ID partita mancante', '#f04e4e'); return; }
    if (!window.confirm(`Salvare la partita?\n${match.squadA.name} ${match.squadA.setsWon}–${match.squadB.setsWon} ${match.squadB.name}`)) return;
    setSaving(true);
    try {
      const payload = match.toSavePayload(meta);
      const res = await apiPost(`/matches/${meta.id}/save`, payload);
      flashMsg(`✓ Salvata (${res.sets} set, ${res.players} giocatori)`, '#22d47a');
    } catch (err) {
      flashMsg(`Errore: ${err.message}`, '#f04e4e');
    } finally { setSaving(false); }
  };

  // ── Loading / Error ──────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontFamily:'Barlow Condensed,sans-serif', color:'var(--muted)', fontSize:'18px' }}>
        Caricamento formazione…
      </span>
    </div>
  );

  if (error || !match) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:'14px' }}>
      <div style={{ fontSize:'36px' }}>⚠️</div>
      <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'20px', fontWeight:'800', color:'var(--text)' }}>
        {error || 'Errore caricamento'}
      </div>
      <button onClick={() => navigate('/dashboard')}
              style={{ padding:'8px 20px', borderRadius:'6px', border:'1px solid var(--a)',
                       background:'var(--a-dim)', color:'var(--a)', cursor:'pointer',
                       fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:'700' }}>
        ← Dashboard
      </button>
    </div>
  );

  const { squadA, squadB } = match;
  const servingSide = match.servingSquad?.side;

  // Mode banner content
  let modeBannerClass = '';
  let modeBannerText  = '';
  if (subMode && !outPlayer)  { modeBannerClass = 'sub';         modeBannerText = 'Cambio — seleziona chi ESCE'; }
  if (subMode && outPlayer)   { modeBannerClass = 'sub';         modeBannerText = `Fuori: #${outPlayer.shirtNumber} — seleziona chi ENTRA`; }
  if (cardMode === 'yellow')  { modeBannerClass = 'card-yellow'; modeBannerText = '🟨 Clicca un giocatore'; }
  if (cardMode === 'red')     { modeBannerClass = 'card-red';    modeBannerText = '🟥 Clicca un giocatore'; }

  // Selected bar
  let selBarClass = 'mon-selected-bar';
  if (!selectedPlayer && !subMode && !cardMode) selBarClass += ' none';
  if (subMode)  selBarClass += ' sub-mode';
  if (cardMode) selBarClass += ' card-mode';

  return (
    <div style={{ height:'100dvh', background:'var(--bg)', color:'var(--text)',
                  fontFamily:'Barlow,sans-serif', display:'flex', flexDirection:'column',
                  overflow:'hidden', userSelect:'none' }}>

      {/* FLASH */}
      <div className="mon-flash" ref={flashRef} />

      {/* ═══ TOP BAR ═══════════════════════════════════════════ */}
      <div className="mon-topbar">
        {/* Team A name + set pips */}
        <div className="mon-team-block a">
          <span className="mon-team-name a">{squadA.shortName ?? squadA.name}</span>
          <div className="mon-score-sets">
            {[0,1,2].map(i => (
              <div key={i} className={`mon-set-pip ${i < squadA.setsWon ? 'won-a' : ''}`}>
                {match.sets[i]?.scoreA ?? 0}
              </div>
            ))}
          </div>
        </div>

        {/* Scoreboard (centered) */}
        <div className="mon-scoreboard">
          <div className="mon-pts a">{squadA.score}</div>
          <div className="mon-pts-div">:</div>
          <div className="mon-pts b">{squadB.score}</div>
        </div>

        {/* Team B name + set pips */}
        <div className="mon-team-block b">
          <span className="mon-team-name b">{squadB.shortName ?? squadB.name}</span>
          <div className="mon-score-sets">
            {[0,1,2].map(i => (
              <div key={i} className={`mon-set-pip ${i < squadB.setsWon ? 'won-b' : ''}`}>
                {match.sets[i]?.scoreB ?? 0}
              </div>
            ))}
          </div>
        </div>

        {/* Right buttons */}
        <div className="mon-topbar-right">
          <button className="mon-ctrl-sm undo" onClick={() => registerEvent('UNDO')}>↩ Undo</button>
          <button className="mon-ctrl-sm" onClick={() => registerEvent('SWAP_SERVE')}>⇄ Battuta</button>
          <button className="mon-ctrl-sm save" onClick={saveMatch} disabled={saving}>
            {saving ? '⏳' : '↑ Salva'}
          </button>
        </div>
      </div>

      {/* Set label badge */}
      <div className="mon-set-label" id="set-label">Set {match.currentSetNumber}</div>

      {/* ═══ MAIN ══════════════════════════════════════════════ */}
      <div className="mon-main">

        {/* Bench A */}
        <div className="bench-panel a">
          <div className="bench-header">
            <div className="bench-title a">{squadA.name}</div>
            <div className={`bench-timeout ${squadA.timeout > 0 ? 'has-to' : ''}`}>
              Timeout: {squadA.timeout} / 2
            </div>
          </div>
          {squadA.bench.map(p => (
            <div key={p.id}
                 className={[
                   'bench-player',
                   selectedPlayer?.id === p.id ? 'selected-a' : '',
                   outPlayer?.id === p.id ? 'out-target' : '',
                 ].join(' ')}
                 onClick={() => handleBenchClick(p)}>
              <div className="bp-num a">{p.shirtNumber}</div>
              <div className="bp-name">
                {p.displayName}<br />
                <span style={{ fontSize:'9px', color:'var(--subtle)', textTransform:'capitalize' }}>
                  {ROLE_MAP[p.role] ?? p.role}
                  {p.libero ? ' · L' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Court + Actions */}
        <div className="mon-court-area">

          {/* Court */}
          <div className="mon-court-wrap">
            <div className="mon-court">
              <div className="mon-net" />

              {/* Team A players */}
              {squadA.players.map((p, idx) => {
                const pos = COURT_POS_A[idx + 1]; if (!pos) return null;
                return (
                  <div key={p.id}
                       className={[
                         'court-player a',
                         p.libero ? 'libero' : '',
                         selectedPlayer?.id === p.id ? 'selected' : '',
                         outPlayer?.id === p.id ? 'out-selected' : '',
                       ].join(' ')}
                       style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
                       onClick={() => handleCourtClick(p)}
                       title={`#${p.shirtNumber} ${p.fullName} · ${ROLE_MAP[p.role] ?? p.role}`}>
                    {p.shirtNumber}
                    {servingSide === 'a' && idx === 0 && <span className="serve-dot" />}
                  </div>
                );
              })}

              {/* Team B players */}
              {squadB.players.map((p, idx) => {
                const pos = COURT_POS_B[idx + 1]; if (!pos) return null;
                return (
                  <div key={p.id}
                       className={[
                         'court-player b',
                         p.libero ? 'libero' : '',
                         selectedPlayer?.id === p.id ? 'selected' : '',
                         outPlayer?.id === p.id ? 'out-selected' : '',
                       ].join(' ')}
                       style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
                       onClick={() => handleCourtClick(p)}
                       title={`#${p.shirtNumber} ${p.fullName} · ${ROLE_MAP[p.role] ?? p.role}`}>
                    {p.shirtNumber}
                    {servingSide === 'b' && idx === 0 && <span className="serve-dot" />}
                  </div>
                );
              })}
            </div>

            {/* Mode banner */}
            {modeBannerClass && (
              <div className={`mon-mode-banner ${modeBannerClass}`}
                   onClick={() => { setSubMode(false); setOutPlayer(null); setCardMode(null); autoSelectServer(); }}>
                {modeBannerText} · [×] Annulla
              </div>
            )}
          </div>

          {/* Selected player bar */}
          <div className={selBarClass}>
            <div className={`sel-badge ${selectedPlayer ? selectedPlayer.team : 'neutral'}`}>
              {selectedPlayer ? selectedPlayer.shirtNumber : '–'}
            </div>
            <div className="sel-info">
              <div className="sel-name">
                {subMode && !outPlayer && 'Cambio — seleziona chi ESCE dal campo'}
                {subMode && outPlayer  && `Fuori: #${outPlayer.shirtNumber} ${outPlayer.fullName} — seleziona dalla panchina`}
                {cardMode && !subMode  && `Cartellino ${cardMode} — clicca un giocatore`}
                {!subMode && !cardMode && (selectedPlayer ? selectedPlayer.fullName : 'Nessun giocatore selezionato')}
              </div>
              <div className="sel-role">
                {!subMode && !cardMode && selectedPlayer
                  ? (ROLE_MAP[selectedPlayer.role] ?? selectedPlayer.role)
                  : 'Seleziona un giocatore sul campo o in panchina'}
              </div>
            </div>
          </div>

          {/* Action panel */}
          <div className="mon-action-panel">

            <div className="action-group-label">▸ PUNTO / ERRORE</div>
            <div className="action-group">
              <button className="act-btn green lg" onClick={() => registerEvent('POINT')} disabled={!selectedPlayer}>
                <span className="act-icon">✦</span> Point
              </button>
              <button className="act-btn red" onClick={() => registerEvent('OUT')} disabled={!selectedPlayer}>
                <span className="act-icon">✕</span> Out
              </button>
              <button className="act-btn red" onClick={() => registerEvent('LOST_BALL')} disabled={!selectedPlayer}>
                <span className="act-icon">○</span> Lost Ball
              </button>
              <button className="act-btn slate" onClick={() => registerEvent('BLOCKED')} disabled={!selectedPlayer}>
                <span className="act-icon">▣</span> Blocked
              </button>
            </div>

            <div className="action-group-label">▸ BATTUTA</div>
            <div className="action-group">
              <button className="act-btn green lg" onClick={() => registerEvent('ACE')} disabled={!selectedPlayer}>
                <span className="act-icon">⚡</span> Ace
              </button>
              <button className="act-btn red lg" onClick={() => registerEvent('SERVE_ERROR')} disabled={!selectedPlayer}>
                <span className="act-icon">✗</span> Serve Error
              </button>
            </div>

            <div className="action-group-label">▸ FALLI</div>
            <div className="action-group">
              <button className="act-btn amber" onClick={() => registerEvent('DOUBLE')} disabled={!selectedPlayer}>Double</button>
              <button className="act-btn amber" onClick={() => registerEvent('4TOUCHES')} disabled={!selectedPlayer}>4 Touches</button>
              <button className="act-btn amber" onClick={() => registerEvent('RAISED')} disabled={!selectedPlayer}>Raised</button>
              <button className="act-btn amber" onClick={() => registerEvent('POSITION')} disabled={!selectedPlayer}>Position</button>
              <button className="act-btn amber" onClick={() => registerEvent('INVASION')} disabled={!selectedPlayer}>Invasion</button>
            </div>

            <div className="action-group-label">▸ GESTIONE</div>
            <div className="action-group">
              <button className={`act-btn amber ${cardMode === 'yellow' ? 'active-mode' : ''}`}
                      onClick={() => registerEvent('YELLOW_CARD')}>
                <span className="act-icon">▪</span> Yellow
              </button>
              <button className={`act-btn red ${cardMode === 'red' ? 'active-mode' : ''}`}
                      onClick={() => registerEvent('RED_CARD')}>
                <span className="act-icon">▪</span> Red
              </button>
              <button className={`act-btn purple ${subMode ? 'active-mode' : ''}`}
                      onClick={() => registerEvent('CHANGE')}>
                <span className="act-icon">⇄</span> {subMode ? 'Annulla' : 'Change'}
              </button>
              <button className="act-btn a-col" onClick={() => registerEvent('TIMEOUT_A')}>
                <span className="act-icon">◷</span> T/O A
              </button>
              <button className="act-btn b-col" onClick={() => registerEvent('TIMEOUT_B')}>
                <span className="act-icon">◷</span> T/O B
              </button>
            </div>

            <div className="util-controls">
              <button className="ctrl-btn undo" onClick={() => registerEvent('UNDO')}>↩ Undo</button>
              <button className="ctrl-btn" onClick={() => registerEvent('SWAP_SERVE')}>⇄ Battuta</button>
              <button className="ctrl-btn" onClick={saveMatch} disabled={saving}>
                {saving ? '⏳ Salvataggio…' : '↑ Salva'}
              </button>
            </div>
          </div>
        </div>

        {/* Bench B */}
        <div className="bench-panel b">
          <div className="bench-header">
            <div className="bench-title b">{squadB.name}</div>
            <div className={`bench-timeout ${squadB.timeout > 0 ? 'has-to' : ''}`}>
              Timeout: {squadB.timeout} / 2
            </div>
          </div>
          {squadB.bench.map(p => (
            <div key={p.id}
                 className={[
                   'bench-player',
                   selectedPlayer?.id === p.id ? 'selected-b' : '',
                   outPlayer?.id === p.id ? 'out-target' : '',
                 ].join(' ')}
                 onClick={() => handleBenchClick(p)}>
              <div className="bp-num b">{p.shirtNumber}</div>
              <div className="bp-name">
                {p.displayName}<br />
                <span style={{ fontSize:'9px', color:'var(--subtle)', textTransform:'capitalize' }}>
                  {ROLE_MAP[p.role] ?? p.role}
                  {p.libero ? ' · L' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ STATS FIXED BUTTON ════════════════════════════════ */}
      <button className="stats-fixed-btn" onClick={() => setStatsOpen(o => !o)}>
        ◉ Stats
      </button>

      {/* ═══ STATS PANEL (slide-in from right) ════════════════ */}
      <div className={`sp-panel ${statsOpen ? 'open' : ''}`}>
        <div className="sp-header">
          <span className="sp-title">◉ Statistiche</span>
          <div className="sp-pills">
            {Object.keys(STAT_CATS).map(cat => (
              <button key={cat}
                      className={`sp-cat-btn ${statsCat === cat ? 'active' : ''}`}
                      onClick={() => setStatsCat(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <button className="sp-close" onClick={() => setStatsOpen(false)}>✕</button>
        </div>

        {/* Set tabs */}
        <div className="sp-tabs">
          <button className={`sp-tab ${statsSet === 'match' ? 'active' : ''}`}
                  onClick={() => setStatsSet('match')}>Match</button>
          {match.sets.slice(0, match.currentSetNumber - 1).map((_, i) => (
            <button key={i} className={`sp-tab ${statsSet === i ? 'active' : ''}`}
                    onClick={() => setStatsSet(i)}>Set {i+1}</button>
          ))}
          <button className={`sp-tab ${statsSet === 'current' ? 'active' : ''}`}
                  onClick={() => setStatsSet('current')}>
            Set {match.currentSetNumber} (live)
          </button>
        </div>

        {/* Stats body */}
        <div className="sp-body">
          <div className="stats-two-col">
            {[squadA, squadB].map(squad => {
              const allPlayers = [...squad.players, ...squad.bench];
              const keys = STAT_CATS[statsCat] ?? [];
              const getStats = (player) => {
                if (statsSet === 'match') return player.stats;
                const idx = statsSet === 'current' ? match.currentSetNumber - 1 : statsSet;
                return match.sets[idx]?.stats?.players?.[player.id] ?? player.stats;
              };
              return (
                <div key={squad.side}>
                  <div className="stats-col-title" style={{ color: `var(--${squad.side})` }}>
                    {squad.name}
                  </div>
                  <div className="stats-col-meta">
                    Set vinti: <b>{squad.setsWon}</b> ·
                    Punteggio: <b>{squad.score}</b> ·
                    Timeout: <b>{squad.timeout}/2</b>
                  </div>
                  <div className="stats-squad-bar">
                    {[
                      { key: STAT.ATTACK_WIN, lbl: 'Att', color: 'var(--green)' },
                      { key: STAT.ACE, lbl: 'Ace', color: 'var(--green)' },
                      { key: STAT.BLOCK_SUCCESSFUL, lbl: 'Muro', color: 'var(--green)' },
                      { key: STAT.TOTAL_FOUL, lbl: 'Falli', color: 'var(--red)' },
                      { key: STAT.TOTAL_CARD, lbl: 'Card', color: 'var(--amber)' },
                    ].map((item, i, arr) => (
                      <>
                        <div key={item.key} className="ssb-item">
                          <div className="ssb-val" style={{ color: item.color }}>
                            {squad.players.reduce((s, p) => s + (p.stats[item.key] ?? 0), 0) +
                             squad.bench.reduce((s, p) => s + (p.stats[item.key] ?? 0), 0)}
                          </div>
                          <div className="ssb-lbl">{item.lbl}</div>
                        </div>
                        {i < arr.length - 1 && <div className="ssb-sep" />}
                      </>
                    ))}
                  </div>
                  <table className="stats-tbl">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Giocatore</th>
                        {keys.map(k => (
                          <th key={k} title={STAT_FULL[k]}>{STAT_SHORT[k]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allPlayers.map(p => {
                        const ps = getStats(p);
                        return (
                          <tr key={p.id} className={p.onCourt ? '' : 'bench-row'}>
                            <td><span className={`stat-num ${squad.side}`}>{p.shirtNumber}</span></td>
                            <td className="stat-name">
                              {p.displayName}
                              {p.libero && <span className="lib-badge">L</span>}
                            </td>
                            {keys.map(k => {
                              const v = ps?.[k] ?? 0;
                              return <td key={k} className={`stat-val ${v > 0 ? 'nz' : ''}`}>{v}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
