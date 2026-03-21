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
  card:        { icon: '▪', label: 'Cartellino',     cls: 'card'    },
  timeout:     { icon: '⏱', label: 'Timeout',        cls: 'timeout' },
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
  Attacco:    ['attack_win', 'attack_out', 'attack_not_successful', 'total_attack'],
  Battuta:    ['ace', 'serves', 'serves_err', 'total_serves'],
  Muro:       ['block_successful', 'block_not_successful', 'total_block'],
  Falli:      ['foul_double', 'foul_four_touches', 'foul_raised', 'foul_position', 'foul_invasion', 'total_foul'],
  Cartellini: ['card_yellow', 'card_red', 'total_card'],
};
const STAT_SHORT = {
  touches:'Tocc', points_played:'PP',
  attack_win:'ATT', attack_out:'Out', attack_not_successful:'Nv', total_attack:'Tot',
  ace:'Ace', serves:'Ok', serves_err:'Err', total_serves:'Tot',
  block_successful:'Vin', block_not_successful:'Nv', total_block:'Tot',
  foul_double:'Dop', foul_four_touches:'4T', foul_raised:'Alz',
  foul_position:'Pos', foul_invasion:'Inv', total_foul:'Tot',
  card_yellow:'Gial', card_red:'Ros', total_card:'Tot',
};
const STAT_FULL = {
  touches:'Tocchi', points_played:'Punti giocati',
  attack_win:'Attacchi vincenti', attack_out:'Attacchi out',
  attack_not_successful:'Non vincenti', total_attack:'Tot attacchi',
  ace:'Ace', serves:'Battute OK', serves_err:'Errori battuta', total_serves:'Tot battute',
  block_successful:'Muri vincenti', block_not_successful:'Muri non vincenti', total_block:'Tot muri',
  foul_double:'Doppio fallo', foul_four_touches:'4 tocchi', foul_raised:'Alzata irr.',
  foul_position:'Fallo posizione', foul_invasion:'Invasione', total_foul:'Tot falli',
  card_yellow:'Cartellini gialli', card_red:'Cartellini rossi', total_card:'Tot cartellini',
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

  // ── Navigazione ─────────────────────────────────────────────────
  const prevTouch = useCallback(() => setTouchStep(s => Math.max(0, (s ?? 0) - 1)), []);
  const nextTouch = useCallback(() => setTouchStep(s => Math.min(totalSteps - 1, (s ?? 0) + 1)), [totalSteps]);

  const handleEvtSelect = useCallback((idx) => {
    setSelEvtIdx(idx); setTouchStep(0); setPopupPlayer(null); setRightPanel('detail');
  }, []);

  const totalEvents = currentSet?.events?.length ?? 0;
  const prevEvent = useCallback(() => {
    if (selEvtIdx === null || selEvtIdx <= 0) return;
    handleEvtSelect(selEvtIdx - 1);
  }, [selEvtIdx, handleEvtSelect]);
  const nextEvent = useCallback(() => {
    if (selEvtIdx === null || selEvtIdx >= totalEvents - 1) return;
    handleEvtSelect(selEvtIdx + 1);
  }, [selEvtIdx, totalEvents, handleEvtSelect]);

  const handleSetSelect = useCallback((idx) => {
    setSelSetIdx(idx);
    const evts = sets[idx]?.events ?? [];
    setSelEvtIdx(evts.length > 0 ? 0 : null);
    setTouchStep(evts.length > 0 ? 0 : null);
    setPopupPlayer(null);
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

        <div className="tl-event-list">
          {(currentSet?.events??[]).length===0 && (
            <div style={{color:'var(--muted)',fontSize:'12px',padding:'12px 4px',textAlign:'center'}}>Nessun evento</div>
          )}
          {(currentSet?.events??[]).map((evt,i) => {
            const meta = getEventMeta(evt.event_type);
            const side = evt.point_won_by_team != null
              ? (evt.point_won_by_team === matchData?.home_team_id ? 'a' : 'b')
              : resolveTeamSide(evt.team_side);
            return (
              <div key={evt.id??i}
                   className={`tl-event-item ${selEvtIdx===i?'active':''}`}
                   onClick={()=>handleEvtSelect(i)}>
                <div className="tl-event-score">{evt.score_home??'?'}–{evt.score_away??'?'}</div>
                <div className="tl-event-icon">{meta.icon}</div>
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

          {/* Navigazione punti */}
          {totalEvents > 0 && (
            <div className="tl-nav-bar">
              <button className="tl-nav-btn" onClick={prevEvent} disabled={!selEvtIdx || selEvtIdx<=0}>‹</button>
              <div className="tl-nav-label" style={{fontSize:'11px'}}>
                Punto {selEvtIdx !== null ? selEvtIdx + 1 : '—'} / {totalEvents}
              </div>
              <button className="tl-nav-btn" onClick={nextEvent} disabled={selEvtIdx===null||selEvtIdx>=totalEvents-1}>›</button>
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
                    </>
                  );
                })()
          )}

          {/* STATISTICHE */}
          {rightPanel==='stats' && (
            <div className="tl-stats-panel">

              {/* Tab match/set */}
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

              {/* Categorie */}
              <div className="tl-stats-cats">
                {Object.keys(STAT_CATS).map(cat => (
                  <button key={cat}
                          className={`tl-stats-cat-btn ${statsCat===cat?'active':''}`}
                          onClick={()=>setStatsCat(cat)}>
                    {cat}
                  </button>
                ))}
              </div>

              {!statsData ? (
                <div style={{color:'var(--muted)',fontSize:'12px',padding:'12px 0'}}>
                  Statistiche non disponibili — salva la partita prima.
                </div>
              ) : (
                <div className="tl-stats-two-col">
              {[
                  {isHome:true,  side:'a', name:lineup?.home?.team_name??homeShort},
                  {isHome:false, side:'b', name:lineup?.away?.team_name??awayShort},
                ].map(({isHome,side,name}) => {
                  const keys      = STAT_CATS[statsCat] ?? [];
                  const teamStat  = getTeamStats(isHome);
                  const players   = getPlayerStats().filter(p =>
                    p.team_id === (isHome ? statsData.homeTeamId : statsData.awayTeamId)
                  );
                  return (
                    <div key={side} className="tl-stats-team-block">
                      <div className="tl-stats-team-title" style={{color:`var(--${side})`}}>{name}</div>

                      {teamStat && (
                        <div className="tl-stats-squad-bar">
                          {[
                            {k:'attack_win',l:'Att',c:'var(--green)'},
                            {k:'ace',l:'Ace',c:'var(--green)'},
                            {k:'block_successful',l:'Muro',c:'var(--green)'},
                            {k:'total_foul',l:'Falli',c:'var(--red)'},
                            {k:'total_card',l:'Card',c:'var(--amber)'},
                          ].map((item,i,arr) => (
                            <div key={item.k} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <div className="tl-ssb-item">
                                <div className="tl-ssb-val" style={{color:item.c}}>{teamStat[item.k]??0}</div>
                                <div className="tl-ssb-lbl">{item.l}</div>
                              </div>
                              {i<arr.length-1 && <div className="tl-ssb-sep"/>}
                            </div>
                          ))}
                        </div>
                      )}

                      <table className="tl-stats-tbl">
                        <thead>
                          <tr>
                            <th>#</th><th>Giocatore</th>
                            {keys.map(k => <th key={k} title={STAT_FULL[k]}>{STAT_SHORT[k]}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {players.length===0 && (
                            <tr><td colSpan={2+keys.length} style={{color:'var(--muted)',textAlign:'center',fontSize:'11px'}}>
                              Nessun dato
                            </td></tr>
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