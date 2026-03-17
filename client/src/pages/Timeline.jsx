import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import './Timeline.css';

// ── Posizioni campo (identiche a Monitor) ─────────────────────────
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

// ── Icona e label per tipo evento ─────────────────────────────────
const EVENT_META = {
  point:       { icon: '✦', label: 'Punto',         cls: 'point'   },
  ace:         { icon: '⚡', label: 'Ace',           cls: 'ace'     },
  serve_error: { icon: '✗', label: 'Errore Battuta', cls: 'error'   },
  out:         { icon: '↗', label: 'Out',            cls: 'error'   },
  lost_ball:   { icon: '○', label: 'Palla persa',   cls: 'error'   },
  blocked:     { icon: '▣', label: 'Murato',         cls: 'error'   },
  double:      { icon: '!', label: 'Doppio',         cls: 'foul'    },
  '4touches':  { icon: '!', label: '4 Tocchi',      cls: 'foul'    },
  raised:      { icon: '!', label: 'Alzata Irr.',   cls: 'foul'    },
  position:    { icon: '!', label: 'Pos. Errata',   cls: 'foul'    },
  invasion:    { icon: '!', label: 'Invasione',      cls: 'foul'    },
  card:        { icon: '▪', label: 'Cartellino',     cls: 'card'    },
  timeout:     { icon: '⏱', label: 'Timeout',       cls: 'timeout' },
};

function getEventMeta(type) {
  if (!type) return { icon: '·', label: '—', cls: 'default' };
  const key = type.toLowerCase().replace(/ /g, '_');
  return EVENT_META[key] ?? { icon: '·', label: type, cls: 'default' };
}

// ── Determina il "team side" dell'evento come stringa 'a'|'b'|null ─
// Il DB lo salva come smallint (1=home/a, 2=away/b) o come stringa
function resolveTeamSide(raw) {
  if (raw === 'a' || raw === 1) return 'a';
  if (raw === 'b' || raw === 2) return 'b';
  return null;
}

// ─────────────────────────────────────────────────────────────────
export default function Timeline() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();

  // ── Dati ────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [matchData, setMatchData]   = useState(null);
  const [lineup, setLineup]         = useState(null);   // { home, away }
  const [sets, setSets]             = useState([]);     // array di set con .events

  // ── Selezione ───────────────────────────────────────────────────
  const [selSetIdx, setSelSetIdx]   = useState(0);
  const [selEvtIdx, setSelEvtIdx]   = useState(null);
  const [popupPlayer, setPopupPlayer] = useState(null); // { player, touchIdx }

  // ── Caricamento ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchRes, lineupRes, timelineRes] = await Promise.all([
          apiGet(`/matches/${matchId}`),
          apiGet(`/matches/${matchId}/lineup`),
          apiGet(`/matches/${matchId}/timeline`),
        ]);
        setMatchData(matchRes);
        setLineup(lineupRes);
        setSets(timelineRes.sets ?? []);
        // Seleziona automaticamente il primo evento del primo set
        if ((timelineRes.sets?.[0]?.events?.length ?? 0) > 0) {
          setSelEvtIdx(0);
        }
      } catch (err) {
        console.error(err);
        setError(err.message ?? 'Impossibile caricare la timeline');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [matchId]);

  // ── Dati derivati ───────────────────────────────────────────────

  // Mappa playerId → dati giocatore (da lineup)
  const playerMap = (() => {
    if (!lineup) return new Map();
    const map = new Map();
    const add = (list, side) => list?.forEach(p => map.set(p.player_id, { ...p, side }));
    add(lineup.home?.starters, 'a');
    add(lineup.home?.bench,    'a');
    add(lineup.away?.starters, 'b');
    add(lineup.away?.bench,    'b');
    return map;
  })();

  const currentSet = sets[selSetIdx] ?? null;
  const currentEvent = (selEvtIdx !== null && currentSet)
    ? (currentSet.events[selEvtIdx] ?? null)
    : null;

  // Set di player IDs coinvolti nell'evento selezionato
  const touchedIds    = new Set(currentEvent?.event_order ?? []);
  const serverPlayerId = currentEvent?.server_player_id ?? null;

  // Touch order map: playerId → indice (1-based)
  const touchOrderMap = new Map(
    (currentEvent?.event_order ?? []).map((pid, i) => [pid, i + 1])
  );

  // ── Squadra vincitrice nel punto selezionato ─────────────────────
  const winSide = currentEvent ? resolveTeamSide(currentEvent.point_won_by_team) : null;

  // ── Score totale set corrente (dall'ultimo evento, o 0-0) ────────
  const totalScoreA = matchData ? (matchData.home_sets_won ?? 0) : 0;
  const totalScoreB = matchData ? (matchData.away_sets_won ?? 0) : 0;

  // ── Starters per il campo ────────────────────────────────────────
  const homeStarters = lineup?.home?.starters
    ? [...lineup.home.starters].sort((a, b) => (a.position_number ?? 99) - (b.position_number ?? 99))
    : [];
  const awayStarters = lineup?.away?.starters
    ? [...lineup.away.starters].sort((a, b) => (a.position_number ?? 99) - (b.position_number ?? 99))
    : [];

  // ── Handler click giocatore ─────────────────────────────────────
  const handlePlayerClick = useCallback((player, side) => {
    const touchIdx = touchOrderMap.get(player.player_id) ?? null;
    const isServer = player.player_id === serverPlayerId;
    setPopupPlayer({ player, side, touchIdx, isServer });
  }, [touchOrderMap, serverPlayerId]);

  // ── Handler selezione set ───────────────────────────────────────
  const handleSetSelect = useCallback((idx) => {
    setSelSetIdx(idx);
    setSelEvtIdx((sets[idx]?.events?.length ?? 0) > 0 ? 0 : null);
    setPopupPlayer(null);
  }, [sets]);

  // ── Stato di caricamento / errore ────────────────────────────────
  if (loading) return (
    <div className="tl-root">
      <div className="tl-center">Caricamento timeline…</div>
    </div>
  );
  if (error) return (
    <div className="tl-root">
      <div className="tl-center" style={{ color: 'var(--red)' }}>Errore: {error}</div>
    </div>
  );

  const homeShort = lineup?.home?.short_name ?? lineup?.home?.team_name?.slice(0, 3).toUpperCase() ?? 'HOM';
  const awayShort = lineup?.away?.short_name ?? lineup?.away?.team_name?.slice(0, 3).toUpperCase() ?? 'AWY';

  return (
    <div className="tl-root">

      {/* ── TOP BAR ───────────────────────────────────────────── */}
      <div className="tl-topbar">
        <button className="tl-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>

        {/* Scoreboard centrato */}
        <div className="tl-scoreboard">
          <div className="tl-team-block a" style={{ padding: '0 12px' }}>
            <span className="tl-team-name a">{homeShort}</span>
            <div className="tl-set-pips">
              {sets.map((s, i) => (
                <div key={i} className={`tl-set-pip ${s.winner_team_id === matchData?.home_team_id ? 'won-a' : ''}`}>
                  {s.home_score}
                </div>
              ))}
            </div>
          </div>

          <div className="tl-pts a">{totalScoreA}</div>
          <div className="tl-pts-div">:</div>
          <div className="tl-pts b">{totalScoreB}</div>

          <div className="tl-team-block b" style={{ padding: '0 12px' }}>
            <span className="tl-team-name b">{awayShort}</span>
            <div className="tl-set-pips">
              {sets.map((s, i) => (
                <div key={i} className={`tl-set-pip ${s.winner_team_id === matchData?.away_team_id ? 'won-b' : ''}`}>
                  {s.away_score}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SET SELECTOR BAR ──────────────────────────────────── */}
      <div className="tl-set-bar">
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px',
                       textTransform: 'uppercase', color: 'var(--subtle)', marginRight: 4 }}>
          Set
        </span>
        {sets.map((s, i) => (
          <button key={i}
                  className={`tl-set-btn ${selSetIdx === i ? 'active' : ''}`}
                  onClick={() => handleSetSelect(i)}>
            {s.set_number}
          </button>
        ))}
      </div>

      {/* ── MAIN 3-COLUMN ─────────────────────────────────────── */}
      <div className="tl-main">

        {/* ── COLONNA SX: lista eventi ──────────────────────── */}
        <div className="tl-event-list">
          {(currentSet?.events ?? []).length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: '12px', padding: '12px 4px', textAlign: 'center' }}>
              Nessun evento
            </div>
          )}
          {(currentSet?.events ?? []).map((evt, i) => {
            const meta = getEventMeta(evt.event_type);
            const side = resolveTeamSide(evt.point_won_by_team ?? evt.team_side);
            return (
              <div key={evt.id ?? i}
                   className={`tl-event-item ${selEvtIdx === i ? 'active' : ''}`}
                   onClick={() => { setSelEvtIdx(i); setPopupPlayer(null); }}>
                <div className="tl-event-score">
                  {evt.score_home ?? '?'}–{evt.score_away ?? '?'}
                </div>
                <div className="tl-event-icon">{meta.icon}</div>
                {side && <div className={`tl-event-dot ${side}`} />}
              </div>
            );
          })}
        </div>

        {/* ── COLONNA CENTRO: campo ─────────────────────────── */}
        <div className="tl-court-area">
          <div className="tl-court-wrap">
            <div className={`tl-court ${winSide ? `win-${winSide}` : ''}`}>
              <div className="tl-net" />

              {/* Giocatori home (lato A — sinistra) */}
              {homeStarters.map((p, idx) => {
                const pos = COURT_POS_A[idx + 1];
                if (!pos) return null;
                const isTouched  = touchedIds.has(p.player_id);
                const isServer   = p.player_id === serverPlayerId;
                const touchOrder = touchOrderMap.get(p.player_id);
                return (
                  <div key={p.player_id}
                       className={[
                         'tl-player a',
                         p.is_libero ? 'libero' : '',
                         isTouched   ? 'touched' : '',
                         isServer    ? 'server'  : '',
                       ].join(' ')}
                       style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
                       onClick={() => handlePlayerClick(p, 'a')}
                       title={`#${p.shirt_number} ${p.name ?? ''} ${p.surname ?? ''}`}>
                    {p.shirt_number}
                    {isServer && !isTouched && (
                      <span className="tl-serve-badge">⚡</span>
                    )}
                    {isTouched && (
                      <span className="tl-touch-badge">{touchOrder}</span>
                    )}
                  </div>
                );
              })}

              {/* Giocatori away (lato B — destra) */}
              {awayStarters.map((p, idx) => {
                const pos = COURT_POS_B[idx + 1];
                if (!pos) return null;
                const isTouched  = touchedIds.has(p.player_id);
                const isServer   = p.player_id === serverPlayerId;
                const touchOrder = touchOrderMap.get(p.player_id);
                return (
                  <div key={p.player_id}
                       className={[
                         'tl-player b',
                         p.is_libero ? 'libero' : '',
                         isTouched   ? 'touched' : '',
                         isServer    ? 'server'  : '',
                       ].join(' ')}
                       style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
                       onClick={() => handlePlayerClick(p, 'b')}
                       title={`#${p.shirt_number} ${p.name ?? ''} ${p.surname ?? ''}`}>
                    {p.shirt_number}
                    {isServer && !isTouched && (
                      <span className="tl-serve-badge">⚡</span>
                    )}
                    {isTouched && (
                      <span className="tl-touch-badge">{touchOrder}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nota rotazioni */}
            <div style={{ fontSize: '10px', color: 'var(--subtle)', textAlign: 'center',
                          marginTop: 6, letterSpacing: '.5px' }}>
              Le posizioni mostrate sono quelle iniziali · i numeri indicano l'ordine dei tocchi
            </div>
          </div>
        </div>

        {/* ── COLONNA DX: dettaglio evento ──────────────────── */}
        <div className="tl-detail">
          {!currentEvent ? (
            <div className="tl-detail-empty">
              Seleziona un evento dalla lista
            </div>
          ) : (() => {
            const meta   = getEventMeta(currentEvent.event_type);
            const side   = resolveTeamSide(currentEvent.point_won_by_team ?? currentEvent.team_side);
            const server = serverPlayerId ? playerMap.get(serverPlayerId) : null;
            const touches = (currentEvent.event_order ?? [])
              .map(pid => playerMap.get(pid))
              .filter(Boolean);

            return (
              <>
                {/* Score */}
                <div className="tl-detail-section">
                  <div className="tl-detail-label">Punteggio</div>
                  <div className="tl-detail-score">
                    <span className="a">{currentEvent.score_home ?? '?'}</span>
                    <span className="sep">:</span>
                    <span className="b">{currentEvent.score_away ?? '?'}</span>
                  </div>
                </div>

                {/* Tipo evento */}
                <div className="tl-detail-section">
                  <div className="tl-detail-label">Tipo evento</div>
                  <div className={`tl-event-type-badge ${meta.cls}`}>
                    {meta.icon} {meta.label}
                  </div>
                  {currentEvent.is_ace && (
                    <div className={`tl-event-type-badge ace`} style={{ marginTop: 4 }}>
                      ⚡ ACE
                    </div>
                  )}
                </div>

                {/* Punto vinto da */}
                {side && (
                  <div className="tl-detail-section">
                    <div className="tl-detail-label">Punto a</div>
                    <div className="tl-detail-value" style={{ color: side === 'a' ? 'var(--a)' : 'var(--b)' }}>
                      {side === 'a' ? (lineup?.home?.team_name ?? 'Home') : (lineup?.away?.team_name ?? 'Away')}
                    </div>
                  </div>
                )}

                {/* Battitore */}
                {server && (
                  <div className="tl-detail-section">
                    <div className="tl-detail-label">Battitore</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div className={`tl-touch-num ${server.side}`}>
                        {server.shirt_number}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {server.name} {server.surname}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sequenza tocchi */}
                {touches.length > 0 && (
                  <div className="tl-detail-section">
                    <div className="tl-detail-label">Tocchi ({touches.length})</div>
                    <div className="tl-touch-list">
                      {touches.map((p, i) => {
                        const isServe = i === 0 && currentEvent.event_order[0] === serverPlayerId;
                        return (
                          <div key={p.player_id ?? i} className="tl-touch-row"
                               onClick={() => handlePlayerClick(p, p.side)}
                               style={{ cursor: 'pointer' }}>
                            <div className={`tl-touch-order ${isServe ? 'serve' : ''}`}>
                              {isServe ? '⚡' : i + 1}
                            </div>
                            <div className={`tl-touch-num ${p.side}`}>
                              {p.shirt_number}
                            </div>
                            <div className="tl-touch-name">
                              {p.surname ?? p.name ?? `#${p.shirt_number}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cartellino (se card event) */}
                {currentEvent.card_type && (
                  <div className="tl-detail-section">
                    <div className="tl-detail-label">Cartellino</div>
                    <div className="tl-detail-value">
                      {currentEvent.card_type === 'yellow' ? '🟨 Giallo' : '🟥 Rosso'}
                      {currentEvent.card_player_id && (() => {
                        const cp = playerMap.get(currentEvent.card_player_id);
                        return cp ? ` — #${cp.shirt_number} ${cp.surname ?? ''}` : '';
                      })()}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

      </div>

      {/* ── PLAYER DETAIL POPUP ───────────────────────────────── */}
      {popupPlayer && (
        <div className="tl-player-popup">
          <div className="tl-player-popup-bg" onClick={() => setPopupPlayer(null)} />
          <div className="tl-player-popup-card">
            <button className="tl-popup-close" onClick={() => setPopupPlayer(null)}>✕</button>
            <div className={`tl-popup-num ${popupPlayer.side}`}>
              {popupPlayer.player.shirt_number}
            </div>
            <div className="tl-popup-name">
              {popupPlayer.player.name} {popupPlayer.player.surname}
            </div>
            <div className="tl-popup-role">
              {ROLE_MAP[popupPlayer.player.role] ?? popupPlayer.player.role ?? '—'}
              {popupPlayer.player.is_libero ? ' · Libero' : ''}
            </div>
            <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />
            {popupPlayer.isServer && (
              <div className="tl-popup-touch">
                <strong>⚡ Battitore</strong> di questo punto
              </div>
            )}
            {popupPlayer.touchIdx !== null ? (
              <div className="tl-popup-touch">
                Tocco n° <strong>{popupPlayer.touchIdx}</strong> in questo punto
              </div>
            ) : (
              <div className="tl-popup-touch" style={{ color: 'var(--subtle)' }}>
                Non coinvolto in questo punto
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
