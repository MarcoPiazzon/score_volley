import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import './Timeline.css';

// ── Posizioni campo ───────────────────────────────────────────────
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

const EVENT_META = {
  point:       { icon: '✦', label: 'Punto',         cls: 'point'   },
  ace:         { icon: '⚡', label: 'Ace',           cls: 'ace'     },
  serve_error: { icon: '✗', label: 'Errore Battuta', cls: 'error'   },
  out:         { icon: '↗', label: 'Out',            cls: 'error'   },
  lost_ball:   { icon: '○', label: 'Palla persa',    cls: 'error'   },
  blocked:     { icon: '▣', label: 'Murato',         cls: 'error'   },
  double:      { icon: '!', label: 'Doppio',         cls: 'foul'    },
  '4touches':  { icon: '!', label: '4 Tocchi',       cls: 'foul'    },
  raised:      { icon: '!', label: 'Alzata Irr.',    cls: 'foul'    },
  position:    { icon: '!', label: 'Pos. Errata',    cls: 'foul'    },
  invasion:    { icon: '!', label: 'Invasione',      cls: 'foul'    },
  card:         { icon: '▪', label: 'Cartellino',     cls: 'card'         },
  timeout:      { icon: '⏱', label: 'Timeout',        cls: 'timeout'      },
  substitution: { icon: '⇄', label: 'Sostituzione',   cls: 'substitution' },
};

function getEventMeta(type) {
  if (!type) return { icon: '·', label: '—', cls: 'default' };
  return EVENT_META[type.toLowerCase().replace(/ /g, '_')] ?? { icon: '·', label: type, cls: 'default' };
}

function resolveTeamSide(raw) {
  if (raw === 'a' || raw === 1) return 'a';
  if (raw === 'b' || raw === 2) return 'b';
  return null;
}

// ── Categorie stats ───────────────────────────────────────────────
const STAT_CATS = {
  Generali:   ['touches', 'points_played'],
  Attacco:    ['attack_win', 'attack_successful', 'attack_out', 'total_attack'],
  Battuta:    ['ace', 'serves', 'serves_err', 'serves_err_line', 'total_serves'],
  Ricezione:  ['receive_successful', 'receive_not_successful', 'total_receive'],
  Difesa:     ['def_pos', 'def_neg', 'total_def'],
  Muro:       ['block_successful', 'block_not_successful', 'total_block'],
  Falli:      ['foul_double', 'foul_four_touches', 'foul_raised', 'foul_position', 'foul_invasion', 'total_foul'],
  Cartellini:    ['card_yellow', 'card_red', 'total_card'],
  Timeout:       ['total_timeout'],
  'Set Point':   ['total_set_points', 'set_points_win', 'set_points_err', 'set_points_cancelled'],
  'Match Point': ['total_match_points', 'match_points_win', 'match_points_err', 'match_points_cancelled'],
};
const STAT_SHORT = {
  touches:'Tocc', points_played:'PP',
  attack_win:'Kill', attack_successful:'Pos', attack_out:'Err', total_attack:'Tot',
  ace:'Ace', serves:'Ok', serves_err:'Err', serves_err_line:'Lin', total_serves:'Tot',
  receive_successful:'Ok', receive_not_successful:'Err', total_receive:'Tot',
  def_pos:'Pos', def_neg:'Neg', total_def:'Tot',
  block_successful:'Vin', block_not_successful:'Nv', total_block:'Tot',
  foul_double:'Dop', foul_four_touches:'4T', foul_raised:'Alz',
  foul_position:'Pos', foul_invasion:'Inv', total_foul:'Tot',
  card_yellow:'Gial', card_red:'Ros', total_card:'Tot',
  total_timeout:'T/O',
  total_set_points:'Tot', set_points_win:'Vin', set_points_err:'Err', set_points_cancelled:'Ann',
  total_match_points:'Tot', match_points_win:'Vin', match_points_err:'Err', match_points_cancelled:'Ann',
};
const STAT_FULL = {
  touches:'Tocchi', points_played:'Punti giocati',
  attack_win:'Kill (punto diretto)', attack_successful:'Attacco positivo (difeso)',
  attack_out:'Attacchi errati', total_attack:'Tot attacchi',
  ace:'Ace', serves:'Battute OK', serves_err:'Errori battuta', serves_err_line:'Errori linea', total_serves:'Tot battute',
  receive_successful:'Ricezione riuscita', receive_not_successful:'Ricezione non riuscita', total_receive:'Tot ricezioni',
  def_pos:'Difesa positiva', def_neg:'Difesa negativa', total_def:'Tot difese',
  block_successful:'Muri vincenti', block_not_successful:'Muri non vincenti', total_block:'Tot muri',
  foul_double:'Doppio fallo', foul_four_touches:'4 tocchi', foul_raised:'Alzata irr.',
  foul_position:'Fallo posizione', foul_invasion:'Invasione', total_foul:'Tot falli',
  card_yellow:'Cartellini gialli', card_red:'Cartellini rossi', total_card:'Tot cartellini',
  total_timeout:'Timeout chiamati',
  total_set_points:'Tot set point', set_points_win:'Set point vinti', set_points_err:'Set point errati', set_points_cancelled:'Set point annullati',
  total_match_points:'Tot match point', match_points_win:'Match point vinti', match_points_err:'Match point errati', match_points_cancelled:'Match point annullati',
};

// ═════════════════════════════════════════════════════════════════
export default function Timeline() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [lineup,    setLineup]    = useState(null);
  const [sets,      setSets]      = useState([]);
  const [statsData, setStatsData] = useState(null);

  const [selSetIdx,   setSelSetIdx]   = useState(0);
  const [selEvtIdx,   setSelEvtIdx]   = useState(null);
  const [touchStep,   setTouchStep]   = useState(null); // null=tutti, 0..N-1
  const [popupPlayer, setPopupPlayer] = useState(null);

  // 'detail' | 'stats'
  const [rightPanel, setRightPanel] = useState('detail');
  const [statsCat,   setStatsCat]   = useState('Generali');
  const [statsScope, setStatsScope] = useState('match'); // 'match' | set_number int
  const [statsView,  setStatsView]  = useState('players'); // 'players' | 'teams'
  const [evtFilter,  setEvtFilter]  = useState('all'); // 'all' | 'point' | 'card' | 'timeout'

  // ── Caricamento ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchRes, lineupRes, timelineRes, statsRes] = await Promise.all([
          apiGet(`/matches/${matchId}`),
          apiGet(`/matches/${matchId}/lineup`),
          apiGet(`/matches/${matchId}/timeline`),
          apiGet(`/matches/${matchId}/stats`).catch(() => null),
        ]);
        setMatchData(matchRes);
        setLineup(lineupRes);
        setSets(timelineRes.sets ?? []);
        setStatsData(statsRes);
        if ((timelineRes.sets?.[0]?.events?.length ?? 0) > 0) {
          setSelEvtIdx(0);
          setTouchStep(0);
        }
      } catch (err) {
        setError(err.message ?? 'Impossibile caricare la timeline');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [matchId]);

  // ── Mappa playerId → giocatore ───────────────────────────────────
  const playerMap = useMemo(() => {
    if (!lineup) return new Map();
    const map = new Map();
    const add = (list, side) => list?.forEach(p => map.set(p.player_id, { ...p, side }));
    add(lineup.home?.starters, 'a'); add(lineup.home?.bench, 'a');
    add(lineup.away?.starters, 'b'); add(lineup.away?.bench, 'b');
    return map;
  }, [lineup]);

  const currentSet   = sets[selSetIdx] ?? null;
  const currentEvent = selEvtIdx !== null && currentSet ? (currentSet.events[selEvtIdx] ?? null) : null;
  const touchOrder   = currentEvent?.event_order ?? [];
  const totalSteps   = touchOrder.length;
  const activePlayerId = (touchStep !== null && touchStep < totalSteps) ? touchOrder[touchStep] : null;
  const serverPlayerId = currentEvent?.server_player_id ?? null;
  const winSide        = currentEvent?.point_won_by_team != null
    ? (currentEvent.point_won_by_team === matchData?.home_team_id ? 'a' : 'b')
    : null;

  const homeStarters = useMemo(() =>
    lineup?.home?.starters ? [...lineup.home.starters].sort((a,b)=>(a.position_number??99)-(b.position_number??99)) : []
  , [lineup]);
  const awayStarters = useMemo(() =>
    lineup?.away?.starters ? [...lineup.away.starters].sort((a,b)=>(a.position_number??99)-(b.position_number??99)) : []
  , [lineup]);

  // Giocatori in campo per l'evento selezionato (posizioni dinamiche da court_positions)
  // Fallback sulla formazione iniziale per compatibilità con partite senza dati posizione
  const courtA = useMemo(() => {
    const ids = currentEvent?.court_positions?.a;
    if (ids?.length === 6) return ids.map(pid => playerMap.get(pid)).filter(Boolean);
    return homeStarters;
  }, [currentEvent, playerMap, homeStarters]);

  const courtB = useMemo(() => {
    const ids = currentEvent?.court_positions?.b;
    if (ids?.length === 6) return ids.map(pid => playerMap.get(pid)).filter(Boolean);
    return awayStarters;
  }, [currentEvent, playerMap, awayStarters]);
  const availableSets = useMemo(() => sets.filter(s => s.winner_team_id !== null), [sets]);

  // ── Filtro eventi ────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const evts = currentSet?.events ?? [];
    return evts
      .map((evt, i) => ({ evt, realIdx: i }))
      .filter(({ evt }) => {
        if (evtFilter === 'all') return true;
        if (evtFilter === 'point') return evt.event_type !== 'card' && evt.event_type !== 'timeout' && evt.event_type !== 'substitution';
        return evt.event_type === evtFilter;
      });
  }, [currentSet, evtFilter]);

  // ── Navigazione ─────────────────────────────────────────────────
  const prevTouch = useCallback(() => setTouchStep(s => Math.max(0, (s ?? 0) - 1)), []);
  const nextTouch = useCallback(() => setTouchStep(s => Math.min(totalSteps - 1, (s ?? 0) + 1)), [totalSteps]);

  const handleEvtSelect = useCallback((realIdx) => {
    setSelEvtIdx(realIdx); setTouchStep(0); setPopupPlayer(null); setRightPanel('detail');
  }, []);

  const filteredIdx   = filteredEvents.findIndex(({ realIdx }) => realIdx === selEvtIdx);
  const totalFiltered = filteredEvents.length;

  const prevEvent = useCallback(() => {
    if (filteredIdx <= 0) return;
    handleEvtSelect(filteredEvents[filteredIdx - 1].realIdx);
  }, [filteredIdx, filteredEvents, handleEvtSelect]);
  const nextEvent = useCallback(() => {
    if (filteredIdx >= totalFiltered - 1) return;
    handleEvtSelect(filteredEvents[filteredIdx + 1].realIdx);
  }, [filteredIdx, filteredEvents, totalFiltered, handleEvtSelect]);

  const handleSetSelect = useCallback((idx) => {
    setSelSetIdx(idx);
    const evts = sets[idx]?.events ?? [];
    setSelEvtIdx(evts.length > 0 ? 0 : null);
    setTouchStep(evts.length > 0 ? 0 : null);
    setPopupPlayer(null);
    setEvtFilter('all');
  }, [sets]);

  // ── Stats helpers ────────────────────────────────────────────────
  const getPlayerStats = useCallback(() => {
    if (!statsData) return [];
    return statsScope === 'match'
      ? (statsData.playerMatch ?? [])
      : (statsData.playerSets ?? []).filter(p => p.set_number === statsScope);
  }, [statsData, statsScope]);

  const getTeamStats = useCallback((isHome) => {
    if (!statsData) return null;
    const tid = isHome ? statsData.homeTeamId : statsData.awayTeamId;
    return statsScope === 'match'
      ? (statsData.teamMatch ?? []).find(t => t.team_id === tid) ?? null
      : (statsData.teamSets ?? []).find(t => t.team_id === tid && t.set_number === statsScope) ?? null;
  }, [statsData, statsScope]);

  const handlePlayerClick = useCallback((p, side) => {
    setPopupPlayer({ player: p, side });
  }, []);

  // ── Label step corrente ──────────────────────────────────────────
  function stepLabel() {
    if (touchStep === null || !currentEvent || totalSteps === 0) return '';
    if (touchStep >= totalSteps) return `Fine punto`;
    const pid  = touchOrder[touchStep];
    const p    = playerMap.get(pid);
    const name = p ? (p.surname ?? p.name ?? `#${p.shirt_number}`) : `#${pid}`;
    const isS  = pid === serverPlayerId && touchStep === 0;
    return `${touchStep + 1} / ${totalSteps} — ${name}${isS ? ' ⚡' : ''}`;
  }

  if (loading) return <div className="tl-root"><div className="tl-center">Caricamento…</div></div>;
  if (error)   return <div className="tl-root"><div className="tl-center" style={{color:'var(--red)'}}>Errore: {error}</div></div>;

  const homeShort = lineup?.home?.short_name ?? lineup?.home?.team_name?.slice(0,3).toUpperCase() ?? 'HOM';
  const awayShort = lineup?.away?.short_name ?? lineup?.away?.team_name?.slice(0,3).toUpperCase() ?? 'AWY';

  return (
    <div className="tl-root">

      {/* TOP BAR */}
      <div className="tl-topbar">
        <button className="tl-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      {/* MAIN */}
      <div className="tl-main">

        {/* SX: set selector + lista eventi */}
        <div className="tl-left-col">

          {/* Set selector */}
          <div className="tl-set-bar">
            <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--subtle)'}}>Set</span>
            {sets.map((s,i) => (
              <button key={i} className={`tl-set-btn ${selSetIdx===i?'active':''}`} onClick={()=>handleSetSelect(i)}>
                {s.set_number}
              </button>
            ))}
          </div>

          {/* Filtro tipo evento */}
          <div className="tl-evt-filter-bar">
            {[
              { key: 'all',          label: 'Tutti' },
              { key: 'point',        label: '✦ Punti' },
              { key: 'card',         label: '▪ Cartellini' },
              { key: 'timeout',      label: '⏱ Timeout' },
              { key: 'substitution', label: '⇄ Cambi' },
            ].map(({ key, label }) => (
              <button key={key}
                      className={`tl-evt-filter-btn ${evtFilter === key ? 'active' : ''}`}
                      onClick={() => {
                        setEvtFilter(key);
                        const first = (currentSet?.events ?? [])
                          .findIndex(e => key === 'all' ? true
                            : key === 'point' ? (e.event_type !== 'card' && e.event_type !== 'timeout' && e.event_type !== 'substitution')
                            : e.event_type === key);
                        setSelEvtIdx(first >= 0 ? first : null);
                        setTouchStep(first >= 0 ? 0 : null);
                      }}>
                {label}
              </button>
            ))}
          </div>

        <div className="tl-event-list">
          {filteredEvents.length === 0 && (
            <div style={{color:'var(--muted)',fontSize:'12px',padding:'12px 4px',textAlign:'center'}}>Nessun evento</div>
          )}
          {filteredEvents.map(({ evt, realIdx }) => {
            const meta = getEventMeta(evt.event_type);
            const side = evt.point_won_by_team != null
              ? (evt.point_won_by_team === matchData?.home_team_id ? 'a' : 'b')
              : resolveTeamSide(evt.team_side);
            const icon = evt.event_type === 'card'
              ? (evt.card_type === 'red' ? '🟥' : '🟨')
              : meta.icon;
            return (
              <div key={evt.id ?? realIdx}
                   className={`tl-event-item ${selEvtIdx === realIdx ? 'active' : ''} ${meta.cls}`}
                   onClick={() => handleEvtSelect(realIdx)}>
                <div className="tl-event-score">{evt.score_home ?? '?'}–{evt.score_away ?? '?'}</div>
                <div className="tl-event-icon">{icon}</div>
                {side && <div className={`tl-event-dot ${side}`}/>}
              </div>
            );
          })}
        </div>
        </div>{/* /tl-left-col */}

        {/* CENTRO: campo + nav */}
        <div className="tl-court-area">

          {/* Scoreboard — segue il punto selezionato */}
          <div className="tl-scoreboard">
            <div className="tl-team-block a" style={{padding:'0 16px'}}>
              <span className="tl-team-name a">{homeShort}</span>
              <div className="tl-set-pips">
                {sets.map((s,i) => (
                  <div key={i} className={`tl-set-pip ${s.winner_team_id===matchData?.home_team_id?'won-a':''}`}>{s.home_score}</div>
                ))}
              </div>
            </div>
            <div className="tl-pts a">{currentEvent?.score_home ?? 0}</div>
            <div className="tl-pts-div">:</div>
            <div className="tl-pts b">{currentEvent?.score_away ?? 0}</div>
            <div className="tl-team-block b" style={{padding:'0 16px'}}>
              <span className="tl-team-name b">{awayShort}</span>
              <div className="tl-set-pips">
                {sets.map((s,i) => (
                  <div key={i} className={`tl-set-pip ${s.winner_team_id===matchData?.away_team_id?'won-b':''}`}>{s.away_score}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Contenuto centrato (navigazione + campo) */}
          <div className="tl-court-content">

          {/* Navigazione eventi */}
          {totalFiltered > 0 && (
            <div className="tl-nav-bar">
              <button className="tl-nav-btn" onClick={prevEvent} disabled={filteredIdx <= 0}>‹</button>
              <div className="tl-nav-label" style={{fontSize:'11px'}}>
                {filteredIdx >= 0 ? filteredIdx + 1 : '—'} / {totalFiltered}
              </div>
              <button className="tl-nav-btn" onClick={nextEvent} disabled={filteredIdx < 0 || filteredIdx >= totalFiltered - 1}>›</button>
            </div>
          )}

          {/* Barra navigazione tocchi */}
          {currentEvent && totalSteps > 0 && (
            <div className="tl-nav-bar">
              <button className="tl-nav-btn" onClick={prevTouch} disabled={touchStep===0}>‹ Prec</button>
              <div className="tl-nav-label">{stepLabel()}</div>
              <button className="tl-nav-btn" onClick={nextTouch} disabled={touchStep>=totalSteps-1}>Succ ›</button>
            </div>
          )}

          {/* Pallini progressione */}
          {currentEvent && totalSteps > 0 && (
            <div className="tl-touch-progress">
              {touchOrder.map((pid,i) => {
                const side = playerMap.get(pid)?.side ?? 'a';
                return (
                  <div key={i}
                       className={`tl-progress-dot ${side} ${i===touchStep?'current':''} ${i<(touchStep??0)?'past':''}`}
                       onClick={()=>setTouchStep(i)}
                       title={`Tocco ${i+1}`} />
                );
              })}
            </div>
          )}

          {/* Campo */}
          <div className="tl-court-wrap">
            <div className={`tl-court ${winSide?`win-${winSide}`:''}`}>
              <div className="tl-net" />

              {courtA.map((p,idx) => {
                const pos = COURT_POS_A[idx+1]; if (!pos) return null;
                const pid = p.player_id ?? p.id;
                const isActive = pid === activePlayerId;
                const isServer = pid === serverPlayerId && touchStep === 0;
                return (
                  <div key={pid}
                       className={['tl-player a', p.is_libero?'libero':'', isActive?'active-touch':'', isServer?'server':''].join(' ')}
                       style={{left:`${pos[0]}%`,top:`${pos[1]}%`}}
                       onClick={()=>handlePlayerClick(p,'a')}
                       title={`#${p.shirt_number} ${p.name??''} ${p.surname??''}`}>
                    {p.shirt_number}
                    {isActive && <span className="tl-touch-badge">{touchStep+1}</span>}
                  </div>
                );
              })}

              {courtB.map((p,idx) => {
                const pos = COURT_POS_B[idx+1]; if (!pos) return null;
                const pid = p.player_id ?? p.id;
                const isActive = pid === activePlayerId;
                const isServer = pid === serverPlayerId && touchStep === 0;
                return (
                  <div key={pid}
                       className={['tl-player b', p.is_libero?'libero':'', isActive?'active-touch':'', isServer?'server':''].join(' ')}
                       style={{left:`${pos[0]}%`,top:`${pos[1]}%`}}
                       onClick={()=>handlePlayerClick(p,'b')}
                       title={`#${p.shirt_number} ${p.name??''} ${p.surname??''}`}>
                    {p.shirt_number}
                    {isActive && <span className="tl-touch-badge">{touchStep+1}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          </div>{/* /tl-court-content */}
        </div>{/* /tl-court-area */}

        {/* DX: dettaglio / stats */}
        <div className={`tl-detail${rightPanel === 'stats' ? ' wide' : ''}`}>

          {/* Toggle */}
          <div className="tl-detail-toggle">
            <button className={`tl-toggle-btn ${rightPanel==='detail'?'active':''}`} onClick={()=>setRightPanel('detail')}>Dettaglio</button>
            <button className={`tl-toggle-btn ${rightPanel==='stats'?'active':''}`}  onClick={()=>setRightPanel('stats')}>Statistiche</button>
          </div>

          {/* DETTAGLIO */}
          {rightPanel==='detail' && (
            !currentEvent
              ? <div className="tl-detail-empty">Seleziona un evento</div>
              : (() => {
                  const meta   = getEventMeta(currentEvent.event_type);
                  const side   = currentEvent.point_won_by_team != null
                    ? (currentEvent.point_won_by_team === matchData?.home_team_id ? 'a' : 'b')
                    : resolveTeamSide(currentEvent.team_side);
                  const server = serverPlayerId ? playerMap.get(serverPlayerId) : null;
                  const touches = touchOrder.map(pid=>playerMap.get(pid)).filter(Boolean);
                  return (
                    <>
                      <div className="tl-detail-section">
                        <div className="tl-detail-label">Punteggio</div>
                        <div className="tl-detail-score">
                          <span className="a">{currentEvent.score_home??'?'}</span>
                          <span className="sep">:</span>
                          <span className="b">{currentEvent.score_away??'?'}</span>
                        </div>
                      </div>

                      <div className="tl-detail-section">
                        <div className="tl-detail-label">Tipo evento</div>
                        <div className={`tl-event-type-badge ${meta.cls}`}>{meta.icon} {meta.label}</div>
                        {currentEvent.is_ace && <div className="tl-event-type-badge ace" style={{marginTop:4}}>⚡ ACE</div>}
                      </div>

                      {side && (
                        <div className="tl-detail-section">
                          <div className="tl-detail-label">Punto a</div>
                          <div className="tl-detail-value" style={{color:side==='a'?'var(--a)':'var(--b)'}}>
                            {side==='a' ? (lineup?.home?.team_name??'Home') : (lineup?.away?.team_name??'Away')}
                          </div>
                        </div>
                      )}

                      {server && (
                        <div className="tl-detail-section">
                          <div className="tl-detail-label">Battitore</div>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <div className={`tl-touch-num ${server.side}`}>{server.shirt_number}</div>
                            <div style={{fontSize:'12px',color:'var(--muted)'}}>{server.name} {server.surname}</div>
                          </div>
                        </div>
                      )}

                      {touches.length > 0 && (
                        <div className="tl-detail-section">
                          <div className="tl-detail-label">Sequenza tocchi ({touches.length})</div>
                          <div className="tl-touch-list">
                            {touches.map((p,i) => {
                              const isCur  = i === touchStep;
                              const isServ = i===0 && touchOrder[0]===serverPlayerId;
                              return (
                                <div key={p.player_id??i}
                                     className={`tl-touch-row ${isCur?'current-step':''}`}
                                     onClick={()=>setTouchStep(i)}
                                     style={{cursor:'pointer'}}>
                                  <div className={`tl-touch-order ${isServ?'serve':''}`}>{isServ?'⚡':i+1}</div>
                                  <div className={`tl-touch-num ${p.side}`}>{p.shirt_number}</div>
                                  <div className="tl-touch-name">{p.surname??p.name??`#${p.shirt_number}`}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {currentEvent.card_type && (
                        <div className="tl-detail-section">
                          <div className="tl-detail-label">Cartellino</div>
                          <div className="tl-detail-value">
                            {currentEvent.card_type==='yellow'?'🟨 Giallo':'🟥 Rosso'}
                            {currentEvent.card_player_id && (() => {
                              const cp = playerMap.get(currentEvent.card_player_id);
                              return cp ? ` — #${cp.shirt_number} ${cp.surname??''}` : '';
                            })()}
                          </div>
                        </div>
                      )}

                      {currentEvent.event_type === 'timeout' && (() => {
                        const tSide = resolveTeamSide(currentEvent.team_side);
                        const tName = tSide === 'a' ? (lineup?.home?.team_name ?? homeShort) : (lineup?.away?.team_name ?? awayShort);
                        return (
                          <div className="tl-detail-section">
                            <div className="tl-detail-label">Timeout chiamato da</div>
                            <div className="tl-detail-value" style={{color: tSide === 'a' ? 'var(--a)' : 'var(--b)'}}>
                              {tName}
                            </div>
                          </div>
                        );
                      })()}

                      {currentEvent.event_type === 'substitution' && (() => {
                        const cp = currentEvent.court_positions;
                        const pOut = cp?.out != null ? playerMap.get(cp.out) : null;
                        const pIn  = cp?.in  != null ? playerMap.get(cp.in)  : null;
                        const subSide = resolveTeamSide(currentEvent.team_side);
                        return (
                          <div className="tl-detail-section">
                            <div className="tl-detail-label">Sostituzione</div>
                            <div className="tl-sub-row">
                              <span className="tl-sub-tag out">OUT</span>
                              {pOut
                                ? <><div className={`tl-touch-num ${subSide}`}>{pOut.shirt_number}</div><span className="tl-touch-name">{pOut.surname ?? pOut.name ?? `#${cp.out}`}</span></>
                                : <span className="tl-touch-name" style={{color:'var(--muted)'}}>—</span>
                              }
                            </div>
                            <div className="tl-sub-row">
                              <span className="tl-sub-tag in">IN</span>
                              {pIn
                                ? <><div className={`tl-touch-num ${subSide}`}>{pIn.shirt_number}</div><span className="tl-touch-name">{pIn.surname ?? pIn.name ?? `#${cp.in}`}</span></>
                                : <span className="tl-touch-name" style={{color:'var(--muted)'}}>—</span>
                              }
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()
          )}

          {/* STATISTICHE */}
          {rightPanel==='stats' && (
            <div className="tl-stats-panel">

              {/* Riga controlli: set tabs + view toggle */}
              <div className="tl-stats-controls-row">
                <div className="tl-stats-tabs">
                  <button className={`tl-stats-tab ${statsScope==='match'?'active':''}`} onClick={()=>setStatsScope('match')}>Match</button>
                  {availableSets.map(s => (
                    <button key={s.set_number}
                            className={`tl-stats-tab ${statsScope===s.set_number?'active':''}`}
                            onClick={()=>setStatsScope(s.set_number)}>
                      Set {s.set_number}
                    </button>
                  ))}
                </div>
                <div className="tl-stats-view-toggle">
                  <button className={`tl-stats-view-btn ${statsView==='players'?'active':''}`} onClick={()=>setStatsView('players')}>Giocatori</button>
                  <button className={`tl-stats-view-btn ${statsView==='teams'?'active':''}`}   onClick={()=>setStatsView('teams')}>Squadre</button>
                </div>
              </div>

              {/* Categorie (solo vista giocatori) */}
              {statsView==='players' && (
                <div className="tl-stats-cats">
                  {Object.keys(STAT_CATS).map(cat => (
                    <button key={cat}
                            className={`tl-stats-cat-btn ${statsCat===cat?'active':''}`}
                            onClick={()=>setStatsCat(cat)}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {!statsData ? (
                <div style={{color:'var(--muted)',fontSize:'12px',padding:'12px 0'}}>
                  Statistiche non disponibili — salva la partita prima.
                </div>
              ) : (
                <>
                  {/* ── VISTA GIOCATORI ── */}
                  {statsView==='players' && (
                    <div className="tl-stats-two-col">
                      {[
                        {isHome:true,  side:'a', name:lineup?.home?.team_name??homeShort},
                        {isHome:false, side:'b', name:lineup?.away?.team_name??awayShort},
                      ].map(({isHome,side,name}) => {
                        const keys    = STAT_CATS[statsCat] ?? [];
                        const players = getPlayerStats().filter(p =>
                          p.team_id === (isHome ? statsData.homeTeamId : statsData.awayTeamId)
                        );
                        return (
                          <div key={side} className="tl-stats-team-block">
                            <div className="tl-stats-team-title" style={{color:`var(--${side})`}}>{name}</div>
                            <table className="tl-stats-tbl">
                              <thead>
                                <tr>
                                  <th>#</th><th>Giocatore</th>
                                  {keys.map(k => <th key={k} title={STAT_FULL[k]}>{STAT_SHORT[k]}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {players.length===0 && (
                                  <tr><td colSpan={2+keys.length} style={{color:'var(--muted)',textAlign:'center',fontSize:'11px'}}>Nessun dato</td></tr>
                                )}
                                {players.map(p => (
                                  <tr key={p.player_id}>
                                    <td><span className={`tl-stat-num ${side}`}>{p.shirt_number}</span></td>
                                    <td className="tl-stat-name">
                                      {p.surname??p.name}
                                      {p.is_libero && <span className="tl-lib-badge">L</span>}
                                    </td>
                                    {keys.map(k => {
                                      const v = p[k]??0;
                                      return <td key={k} className={`tl-stat-val ${v>0?'nz':''}`}>{v}</td>;
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── VISTA SQUADRE ── */}
                  {statsView==='teams' && (() => {
                    const sA = getTeamStats(true);
                    const sB = getTeamStats(false);
                    return (
                      <table className="tl-stats-tbl tl-teams-tbl">
                        <thead>
                          <tr>
                            <th>Statistica</th>
                            <th style={{color:'var(--a)'}}>{homeShort}</th>
                            <th style={{color:'var(--b)'}}>{awayShort}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(STAT_CATS).map(([cat, keys]) => (
                            <>
                              <tr key={`cat-${cat}`} className="tl-teams-cat-row">
                                <td colSpan={3}>{cat}</td>
                              </tr>
                              {keys.map(k => {
                                const vA = sA?.[k] ?? 0;
                                const vB = sB?.[k] ?? 0;
                                return (
                                  <tr key={k}>
                                    <td className="tl-stat-name">{STAT_FULL[k]}</td>
                                    <td className={`tl-stat-val ${vA>0?'nz':''} ${vA>vB?'best':''}`}>{vA}</td>
                                    <td className={`tl-stat-val ${vB>0?'nz':''} ${vB>vA?'best':''}`}>{vB}</td>
                                  </tr>
                                );
                              })}
                            </>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PLAYER POPUP */}
      {popupPlayer && (
        <div className="tl-player-popup">
          <div className="tl-player-popup-bg" onClick={()=>setPopupPlayer(null)}/>
          <div className="tl-player-popup-card">
            <button className="tl-popup-close" onClick={()=>setPopupPlayer(null)}>✕</button>
            <div className={`tl-popup-num ${popupPlayer.side}`}>{popupPlayer.player.shirt_number}</div>
            <div className="tl-popup-name">{popupPlayer.player.name} {popupPlayer.player.surname}</div>
            <div className="tl-popup-role">
              {ROLE_MAP[popupPlayer.player.role]??popupPlayer.player.role??'—'}
              {popupPlayer.player.is_libero?' · Libero':''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}