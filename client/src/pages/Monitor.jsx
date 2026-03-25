import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';
import { Match, Squad, Player } from '@/lib/match-engine';
import { STAT } from '@/lib/enums';
import SetLineupModal from '@/components/SetLineupModal';
import './Monitor.css';

// ── Court position maps ───────────────────────────────────────────
const COURT_POS_A = {
  1: [14, 80], 2: [37, 80], 3: [37, 50],
  4: [37, 20], 5: [14, 20], 6: [14, 50],
};
const COURT_POS_B = {
  1: [86, 20], 2: [63, 20], 3: [63, 50],
  4: [63, 80], 5: [86, 80], 6: [86, 50],
};

// ── Zone map: ogni posizione occupa 1/6 della metà campo ──────────
// Formato: { left%, top%, width%, height% } — coordinate assolute sul campo
const ZONE_MAP_A = {
  1: { left:  0, top: 67, width: 25, height: 33 }, // back-right
  2: { left: 25, top: 67, width: 25, height: 33 }, // back-center
  3: { left: 25, top: 33, width: 25, height: 34 }, // mid-center
  4: { left: 25, top:  0, width: 25, height: 33 }, // front-center
  5: { left:  0, top:  0, width: 25, height: 33 }, // front-right
  6: { left:  0, top: 33, width: 25, height: 34 }, // mid-right
};
const ZONE_MAP_B = {
  1: { left: 75, top:  0, width: 25, height: 33 }, // back-left (mirror)
  2: { left: 50, top:  0, width: 25, height: 33 },
  3: { left: 50, top: 33, width: 25, height: 34 },
  4: { left: 50, top: 67, width: 25, height: 33 },
  5: { left: 75, top: 67, width: 25, height: 33 },
  6: { left: 75, top: 33, width: 25, height: 34 },
};

const ROLE_MAP = {
  setter: 'Palleggiatore', outside_hitter: 'Schiacciatore', opposite: 'Opposto',
  middle_blocker: 'Centrale', libero: 'Libero', defensive_specialist: 'Difensore',
};

// ── Stats config ──────────────────────────────────────────────────
const STAT_CATS = {
  Generali:  [STAT.TOUCHES, STAT.POINTS_PLAYED, STAT.TOTAL_POINTS],
  Attacco:   [STAT.ATTACK_WIN, STAT.ATTACK_SUCCESSFUL, STAT.ATTACK_OUT, STAT.TOTAL_ATTACK],
  Battuta:   [STAT.ACE, STAT.SERVES, STAT.SERVES_ERR, STAT.SERVES_ERR_LINE, STAT.TOTAL_SERVES],
  Ricezione: [STAT.RECEIVE_SUCCESSFUL, STAT.RECEIVE_NOT_SUCCESSFUL, STAT.TOTAL_RECEIVE],
  Difesa:    [STAT.DEF_POS, STAT.DEF_NEG, STAT.TOTAL_DEF],
  Muro:      [STAT.BLOCK_SUCCESSFUL, STAT.BLOCK_NOT_SUCCESSFUL, STAT.TOTAL_BLOCK],
  Falli:     [STAT.FOUL_DOUBLE, STAT.FOUL_FOUR_TOUCHES, STAT.FOUL_RAISED, STAT.FOUL_POSITION, STAT.FOUL_INVASION, STAT.TOTAL_FOUL],
  Cartellini: [STAT.CARD_YELLOW, STAT.CARD_RED, STAT.TOTAL_CARD],
  Timeout:    [STAT.TOTAL_TIMEOUT],
  'Set Point':   [STAT.TOTAL_SET_POINTS, STAT.SET_POINTS_WIN, STAT.SET_POINTS_ERR, STAT.SET_POINTS_CANCELLED],
  'Match Point': [STAT.TOTAL_MATCH_POINTS, STAT.MATCH_POINTS_WIN, STAT.MATCH_POINTS_ERR, STAT.MATCH_POINTS_CANCELLED],
};
const STAT_SHORT = {
  [STAT.TOUCHES]: 'Tocc', [STAT.POINTS_PLAYED]: 'PP', [STAT.TOTAL_POINTS]: 'TP',
  [STAT.ATTACK_WIN]: 'Kill', [STAT.ATTACK_SUCCESSFUL]: 'Pos', [STAT.ATTACK_OUT]: 'Err', [STAT.TOTAL_ATTACK]: 'Tot',
  [STAT.ACE]: 'Ace', [STAT.SERVES]: 'Ok', [STAT.SERVES_ERR]: 'Err', [STAT.SERVES_ERR_LINE]: 'Lin', [STAT.TOTAL_SERVES]: 'Tot',
  [STAT.RECEIVE_SUCCESSFUL]: 'Ok', [STAT.RECEIVE_NOT_SUCCESSFUL]: 'Err', [STAT.TOTAL_RECEIVE]: 'Tot',
  [STAT.DEF_POS]: 'Pos', [STAT.DEF_NEG]: 'Neg', [STAT.TOTAL_DEF]: 'Tot',
  [STAT.BLOCK_SUCCESSFUL]: 'Vin', [STAT.BLOCK_NOT_SUCCESSFUL]: 'Nv', [STAT.TOTAL_BLOCK]: 'Tot',
  [STAT.FOUL_DOUBLE]: 'Dop', [STAT.FOUL_FOUR_TOUCHES]: '4T', [STAT.FOUL_RAISED]: 'Alz',
  [STAT.FOUL_POSITION]: 'Pos', [STAT.FOUL_INVASION]: 'Inv', [STAT.TOTAL_FOUL]: 'Tot',
  [STAT.CARD_YELLOW]: 'Gial', [STAT.CARD_RED]: 'Ros', [STAT.TOTAL_CARD]: 'Tot',
  [STAT.TOTAL_TIMEOUT]: 'T/O',
  [STAT.TOTAL_SET_POINTS]: 'Tot', [STAT.SET_POINTS_WIN]: 'Vin', [STAT.SET_POINTS_ERR]: 'Err', [STAT.SET_POINTS_CANCELLED]: 'Ann',
  [STAT.TOTAL_MATCH_POINTS]: 'Tot', [STAT.MATCH_POINTS_WIN]: 'Vin', [STAT.MATCH_POINTS_ERR]: 'Err', [STAT.MATCH_POINTS_CANCELLED]: 'Ann',
};
const STAT_FULL = {
  [STAT.TOUCHES]: 'Tocchi', [STAT.POINTS_PLAYED]: 'Punti giocati', [STAT.TOTAL_POINTS]: 'Punti realizzati',
  [STAT.ATTACK_WIN]: 'Kill (punto diretto)', [STAT.ATTACK_SUCCESSFUL]: 'Attacco positivo (difeso)',
  [STAT.ATTACK_OUT]: 'Attacchi errati', [STAT.TOTAL_ATTACK]: 'Totale attacchi',
  [STAT.ACE]: 'Ace', [STAT.SERVES]: 'Battute OK', [STAT.SERVES_ERR]: 'Errori battuta',
  [STAT.SERVES_ERR_LINE]: 'Errori linea', [STAT.TOTAL_SERVES]: 'Totale battute',
  [STAT.RECEIVE_SUCCESSFUL]: 'Ricezione riuscita', [STAT.RECEIVE_NOT_SUCCESSFUL]: 'Ricezione non riuscita', [STAT.TOTAL_RECEIVE]: 'Totale ricezioni',
  [STAT.DEF_POS]: 'Difesa positiva', [STAT.DEF_NEG]: 'Difesa negativa', [STAT.TOTAL_DEF]: 'Totale difese',
  [STAT.BLOCK_SUCCESSFUL]: 'Muri vincenti', [STAT.BLOCK_NOT_SUCCESSFUL]: 'Muri non vincenti', [STAT.TOTAL_BLOCK]: 'Totale muri',
  [STAT.FOUL_DOUBLE]: 'Doppio fallo', [STAT.FOUL_FOUR_TOUCHES]: '4 tocchi',
  [STAT.FOUL_RAISED]: 'Alzata irregolare', [STAT.FOUL_POSITION]: 'Fallo posizione',
  [STAT.FOUL_INVASION]: 'Invasione', [STAT.TOTAL_FOUL]: 'Totale falli',
  [STAT.CARD_YELLOW]: 'Cartellini gialli', [STAT.CARD_RED]: 'Cartellini rossi', [STAT.TOTAL_CARD]: 'Totale cartellini',
  [STAT.TOTAL_TIMEOUT]: 'Timeout chiamati',
  [STAT.TOTAL_SET_POINTS]: 'Tot set point', [STAT.SET_POINTS_WIN]: 'Set point vinti', [STAT.SET_POINTS_ERR]: 'Set point errati', [STAT.SET_POINTS_CANCELLED]: 'Set point annullati',
  [STAT.TOTAL_MATCH_POINTS]: 'Tot match point', [STAT.MATCH_POINTS_WIN]: 'Match point vinti', [STAT.MATCH_POINTS_ERR]: 'Match point errati', [STAT.MATCH_POINTS_CANCELLED]: 'Match point annullati',
};

const ACTION_MAP = {
  POINT:       { stat: STAT.ATTACK_WIN,          value: true  },
  ACE:         { stat: STAT.ACE,                 value: true  },
  OUT:         { stat: STAT.ATTACK_OUT,           value: false },
  LOST_BALL:   { stat: STAT.BALL_LOST,            value: false },
  SERVE_ERROR:      { stat: STAT.SERVES_ERR,      value: false },
  SERVES_ERR_LINE:  { stat: STAT.SERVES_ERR_LINE, value: false },
  BLOCKED:     { stat: STAT.BLOCK_NOT_SUCCESSFUL, value: false },
  DOUBLE:      { stat: STAT.FOUL_DOUBLE,          value: false },
  '4TOUCHES':  { stat: STAT.FOUL_FOUR_TOUCHES,    value: false },
  RAISED:      { stat: STAT.FOUL_RAISED,          value: false },
  POSITION:    { stat: STAT.FOUL_POSITION,        value: false },
  INVASION:    { stat: STAT.FOUL_INVASION,        value: false },
};
const ACTION_EXTRA = {
  POINT:       [STAT.TOTAL_ATTACK],
  ACE:         [STAT.SERVES],
  OUT:         [STAT.TOTAL_ATTACK],
  SERVE_ERROR:     [],
  SERVES_ERR_LINE: [],
  BLOCKED:     [STAT.TOTAL_BLOCK],
  DOUBLE:      [STAT.TOTAL_FOUL],
  '4TOUCHES':  [STAT.TOTAL_FOUL],
  RAISED:      [STAT.TOTAL_FOUL],
  POSITION:    [STAT.TOTAL_FOUL],
  INVASION:    [STAT.TOTAL_FOUL],
};
const ACTION_LABELS = {
  POINT: '✦ Point!', ACE: '⚡ Ace!', OUT: '✕ Out', LOST_BALL: '○ Lost Ball',
  SERVE_ERROR: '✗ Serve Error', SERVES_ERR_LINE: '✗ Err. Linea', BLOCKED: '▣ Blocked', DOUBLE: 'Double',
  '4TOUCHES': '4 Touches', RAISED: 'Raised', POSITION: 'Position', INVASION: 'Invasion',
};
const ACTION_COLORS = {
  POINT: '#22d47a', ACE: '#22d47a', SERVE_ERROR: '#f04e4e', SERVES_ERR_LINE: '#f04e4e', OUT: '#f04e4e',
  BLOCKED: '#64748b', DOUBLE: '#f5c542', '4TOUCHES': '#f5c542',
  RAISED: '#f5c542', POSITION: '#f5c542', INVASION: '#f5c542', LOST_BALL: '#64748b',
};

// ════════════════════════════════════════════════════════════════════
//  SaveDialog — popup di conferma fine / salvataggio
// ════════════════════════════════════════════════════════════════════
function SaveDialog({ match, matchMeta, onConfirm, onCancel, saving, isMatchEnd = false }) {
  if (!match || !matchMeta) return null;
  const { squadA, squadB } = match;
  const winner = squadA.setsWon > squadB.setsWon ? squadA : squadB;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 800,
      background: 'rgba(0,0,0,.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surf-2)', border: '1px solid var(--border-m)',
        borderRadius: '12px', padding: '28px 32px', minWidth: '320px', maxWidth: '420px',
        boxShadow: '0 24px 64px rgba(0,0,0,.8)',
      }}>
        {isMatchEnd && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏆</div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '22px', fontWeight: 800,
              color: `var(--${winner.side})`, letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              {winner.name} vince!
            </div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '32px', fontWeight: 800,
              color: 'var(--text)', marginTop: '6px',
            }}>
              {squadA.setsWon} — {squadB.setsWon}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              {squadA.name} vs {squadB.name}
            </div>
          </div>
        )}

        {!isMatchEnd && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px', fontWeight: 800,
              letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '4px',
            }}>
              ↑ Salva partita
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Confermi il salvataggio dello stato attuale?
            </div>
          </div>
        )}

        {/* Riepilogo set */}
        <div style={{
          background: 'var(--surf-3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
        }}>
          {match.sets.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 0', borderBottom: i < match.sets.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px',
                             fontWeight: 700, color: 'var(--muted)', width: '36px' }}>
                Set {s.number}
              </span>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px', fontWeight: 800,
                color: s.winner === 'a' ? 'var(--a)' : s.winner === 'b' ? 'var(--b)' : 'var(--text)',
                flex: 1,
              }}>
                {s.scoreA} — {s.scoreB}
              </span>
              {s.winner && (
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700,
                  color: `var(--${s.winner})`, letterSpacing: '1px',
                }}>
                  {s.winner === 'a' ? squadA.shortName : squadB.shortName}
                </span>
              )}
            </div>
          ))}
          {/* Set corrente se non concluso */}
          {match.currentSet && match.currentSet.winner === null &&
           (squadA.score > 0 || squadB.score > 0) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 0', borderTop: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px',
                             fontWeight: 700, color: 'var(--muted)', width: '36px' }}>
                Set {match.currentSet.number}
              </span>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px', fontWeight: 800,
                color: 'var(--text)', flex: 1,
              }}>
                {squadA.score} — {squadB.score}
              </span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px',
                             fontWeight: 700, color: 'var(--amber)', letterSpacing: '1px' }}>
                in corso
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1, padding: '10px', borderRadius: '6px',
              border: '1px solid var(--border-m)', background: 'var(--surf-3)',
              color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700,
              letterSpacing: '.8px', textTransform: 'uppercase',
            }}>
            {isMatchEnd ? 'Ignora' : 'Annulla'}
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              flex: 2, padding: '10px', borderRadius: '6px',
              border: '1px solid var(--green)', background: 'var(--green-dim)',
              color: 'var(--green)', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700,
              letterSpacing: '.8px', textTransform: 'uppercase', opacity: saving ? .6 : 1,
            }}>
            {saving ? '⏳ Salvataggio…' : '✓ Salva partita'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FineTurnoModal — selettore tipo punto (sale dal basso)
// ════════════════════════════════════════════════════════════════════
const FINE_TURNO_SERVE = [
  { type: 'ACE',            icon: '⚡', label: 'Ace',         cls: 'green' },
  { type: 'SERVE_ERROR',    icon: '✗',  label: 'Serve Error', cls: 'red'   },
  { type: 'SERVES_ERR_LINE', icon: '—', label: 'Err. Linea',  cls: 'red'   },
];
const FINE_TURNO_POINT = [
  { type: 'POINT',     icon: '✦', label: 'Point',     cls: 'green' },
  { type: 'OUT',       icon: '↗', label: 'Out',       cls: 'red'   },
  { type: 'LOST_BALL', icon: '○', label: 'Lost Ball', cls: 'slate' },
];
const FINE_TURNO_FALLI = [
  { type: 'DOUBLE',   icon: '!', label: 'Double',    cls: 'amber' },
  { type: '4TOUCHES', icon: '!', label: '4 Touches', cls: 'amber' },
  { type: 'RAISED',   icon: '!', label: 'Raised',    cls: 'amber' },
  { type: 'POSITION', icon: '!', label: 'Position',  cls: 'amber' },
  { type: 'INVASION', icon: '!', label: 'Invasion',  cls: 'amber' },
];

function FineTurnoModal({ servePhase, onSelect, onClose }) {
  //console.log(servePhase);
  const pointBtns = servePhase ? FINE_TURNO_SERVE : FINE_TURNO_POINT;
  return (
    <div className="ft-overlay" onClick={onClose}>
      <div className="ft-card" onClick={e => e.stopPropagation()}>
        <div className="ft-title">
          {servePhase ? '⚡ Esito Battuta' : '🏐 Fine Turno'}
        </div>

        <div className="ft-section-label">
          {servePhase ? 'Battuta' : 'Punto'}
        </div>
        <div className="ft-group">
          {pointBtns.map(b => (
            <button key={b.type}
                    className={`ft-btn ${b.cls} lg`}
                    onClick={() => onSelect(b.type)}>
              <span className="ft-icon">{b.icon}</span>
              {b.label}
            </button>
          ))}
        </div>

        <div className="ft-section-label">Fallo</div>
        <div className="ft-group wrap">
          {FINE_TURNO_FALLI.map(b => (
            <button key={b.type}
                    className={`ft-btn ${b.cls}`}
                    onClick={() => onSelect(b.type)}>
              {b.label}
            </button>
          ))}
        </div>

        <button className="ft-cancel" onClick={onClose}>Annulla</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  Monitor
// ════════════════════════════════════════════════════════════════════
export default function Monitor() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();

  const matchRef   = useRef(null);
  const matchMeta  = useRef(null);
  const flashRef   = useRef(null);
  const [tick, setTick]           = useState(0);

  const storageKey = `match_${matchId}`;

  const rerender = useCallback(() => {
    setTick(t => t + 1);
    const m = matchRef.current;
    if (m) {
      try { localStorage.setItem(storageKey, JSON.stringify(m.serialize())); } catch (_) {}
    }
  }, [storageKey]);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [showSave,     setShowSave]     = useState(false);
  const [isMatchEnd,   setIsMatchEnd]   = useState(false);
  const [statsOpen,    setStatsOpen]    = useState(false);
  const [statsCat,     setStatsCat]     = useState('Generali');
  const [statsSet,     setStatsSet]     = useState('match');
  const [statsView,    setStatsView]    = useState('players'); // 'players' | 'teams'

  const [tiebreakSwapped, setTiebreakSwapped] = useState(false);

  // UI interaction state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [subMode,   setSubMode]   = useState(false);
  const [outPlayer, setOutPlayer] = useState(null);
  const [cardMode,  setCardMode]  = useState(null);

  // servePhase: true = inizio punto, solo battuta disponibile
  //             false = battuta registrata, altre azioni disponibili
  const [servePhase,  setServePhase]  = useState(true);

  // Modalità arbitro: fullscreen, no zoom, no distrazioni
  const [refMode,     setRefMode]     = useState(false);

  // Modal fine turno
  const [showEndTurn, setShowEndTurn] = useState(false);

  // Modal formazione inizio set (set 2+)
  const [setLineupTarget, setSetLineupTarget] = useState(null); // { side, setNumber }

  // ── Flash ──────────────────────────────────────────────────────
  const flashMsg = useCallback((msg, color = '#e8eaf2') => {
    const el = flashRef.current;
    if (!el) return;
    el.textContent = msg;
    el.style.color = color;
    el.style.borderColor = color + '44';
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 1600);
  }, []);

  const autoSelectServer = useCallback(() => {
    const m = matchRef.current;
    if (m?.servingSquad?.players?.[0]) {
      setSelectedPlayer(m.servingSquad.players[0]);
    }
  }, []);

  // ── Toggle modalità arbitro ────────────────────────────────────
  const toggleRefMode = useCallback(() => {
    setRefMode(on => {
      const next = !on;
      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        let vp = document.querySelector('meta[name="viewport"]');
        if (!vp) {
          vp = document.createElement('meta');
          vp.name = 'viewport';
          document.head.appendChild(vp);
        }
        vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      } else {
        document.exitFullscreen?.().catch(() => {});
        const vp = document.querySelector('meta[name="viewport"]');
        if (vp) vp.content = 'width=device-width, initial-scale=1';
      }
      return next;
    });
  }, []);

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const attachCallbacks = (match) => {
          match._onSetEnd = (winner, sA, sB) => {
            const n = match.currentSetNumber - 1;
            flashMsg(`Set ${n} → ${winner.shortName}! (${sA}-${sB})`,
                     winner.side === 'a' ? '#3b8bff' : '#ff6b35');
            setTiebreakSwapped(false);
            autoSelectServer();
            rerender();
            // Mostra il modal formazione per il prossimo set (solo se la partita non è finita)
            const matchOver = match.squadA.setsWon >= match.setsToWin
                           || match.squadB.setsWon >= match.setsToWin;
            if (!matchOver) {
              setSetLineupTarget({ side: 'a', setNumber: match.currentSetNumber });
            }
          };
          match._onMatchEnd = (winner) => {
            const other = winner === match.squadA ? match.squadB : match.squadA;
            flashMsg(`🏆 Vittoria ${winner.shortName}! (${winner.setsWon}-${other.setsWon})`, '#f5c542');
            rerender();
            setTimeout(() => {
              setIsMatchEnd(true);
              setShowSave(true);
            }, 600);
          };
          match._onFieldChange = () => {
            setTiebreakSwapped(s => !s);
            flashMsg(`↕ Cambio campo (set ${match.currentSetNumber})`, '#f5c542');
          };
        };

        // Prova a ripristinare da localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const match = Match.deserialize(parsed);
            const matchData = await apiGet(`/matches/${matchId}`);
            matchMeta.current = matchData;
            attachCallbacks(match);
            match.assignServe();
            matchRef.current = match;
            autoSelectServer();
            rerender();
            return;
          } catch (e) {
            console.warn('Ripristino localStorage fallito, carico da zero', e);
            localStorage.removeItem(storageKey);
          }
        }

        const [matchData, lineupData] = await Promise.all([
          apiGet(`/matches/${matchId}`),
          apiGet(`/matches/${matchId}/lineup`),
        ]);
        matchMeta.current = matchData;

        const format = {
          maxSet:         matchData.max_set          ?? 5,
          setsToWin:      matchData.sets_to_win      ?? 3,
          setPoints:      matchData.set_points       ?? 25,
          tieBreakPoints: matchData.tiebreak_points  ?? 15,
        };

        const makeSquad = (teamData, side) => {
          const squad = new Squad({
            teamId:    teamData.team_id,
            name:      teamData.team_name,
            shortName: teamData.short_name ?? teamData.team_name?.slice(0, 3).toUpperCase(),
            side,
          });
          const starters = [...teamData.starters].sort((a, b) => (a.position_number ?? 99) - (b.position_number ?? 99));
          squad.players = starters.map(p => {
            const pl = new Player({ id: p.player_id, shirtNumber: p.shirt_number,
              name: p.name ?? '', surname: p.surname ?? '',
              role: p.role, team: side, libero: !!p.is_libero });
            pl.onCourt  = true;
            pl.photoUrl = p.photo_url ?? null;
            return pl;
          });
          squad.bench = teamData.bench.map(p => {
            const pl = new Player({
              id: p.player_id, shirtNumber: p.shirt_number,
              name: p.name ?? '', surname: p.surname ?? '',
              role: p.role, team: side, libero: !!p.is_libero,
            });
            pl.photoUrl = p.photo_url ?? null;
            return pl;
          });
          return squad;
        };

        const squadA = makeSquad(lineupData.home, 'a');
        const squadB = makeSquad(lineupData.away, 'b');
        const match  = new Match(squadA, squadB, format);

        attachCallbacks(match);
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

  // ── Keepalive: ping ogni 2 minuti per evitare standby del server ─
  useEffect(() => {
    const id = setInterval(() => {
      apiGet('/health').catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const match = matchRef.current;

  // ── Handlers ───────────────────────────────────────────────────
  const handleCourtClick = useCallback((player) => {
    const m = matchRef.current; if (!m) return;
    if (cardMode) {
      m.assignCard(player, cardMode);
      flashMsg(cardMode === 'red' ? '🟥 Cartellino rosso' : '🟨 Cartellino giallo',
               cardMode === 'red' ? '#f04e4e' : '#f5c542');
      setCardMode(null); autoSelectServer(); rerender(); return;
    }
    if (subMode) { setOutPlayer(player); return; }
    if (m) m.pushTouch(player);
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
    setServePhase(false);
    //console.log(m);
  }, [cardMode, subMode, flashMsg, autoSelectServer, rerender]);

  const handleBenchClick = useCallback((player) => {
    const m = matchRef.current; if (!m) return;
    if (cardMode) {
      m.assignCard(player, cardMode);
      flashMsg(cardMode === 'red' ? '🟥 Cartellino rosso' : '🟨 Cartellino giallo',
               cardMode === 'red' ? '#f04e4e' : '#f5c542');
      setCardMode(null); autoSelectServer(); rerender(); return;
    }
    if (subMode && outPlayer) {
      if (player.team !== outPlayer.team) { flashMsg('Giocatori di squadre diverse!', '#f04e4e'); return; }
      try {
        const squad = outPlayer.team === 'a' ? m.squadA : m.squadB;
        m.makeSubstitute(squad, outPlayer, player);
        flashMsg(`⇄ #${outPlayer.shirtNumber} → #${player.shirtNumber}`, '#a78bfa');
        setSubMode(false); setOutPlayer(null); autoSelectServer(); rerender();
      } catch (err) { flashMsg(err.message, '#f04e4e'); }
      return;
    }
    if (subMode && !outPlayer) {
      flashMsg('Prima seleziona il giocatore in campo che esce!', '#f04e4e'); return;
    }
    if (m) m.pushTouch(player);
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
  }, [cardMode, subMode, outPlayer, flashMsg, autoSelectServer, rerender]);

  const registerEvent = useCallback((type) => {
    const m = matchRef.current; if (!m) return;

    //console.log(type);
    //console.log(m);
    if (type === 'CHANGE') {
      if (subMode) { setSubMode(false); setOutPlayer(null); return; }
      setSubMode(true); setOutPlayer(null);
      flashMsg('Cambio: seleziona chi ESCE dal campo', '#a78bfa'); return;
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
      const undone = m.undoLastEvent();
      if (!undone) { flashMsg('Nulla da annullare', '#64748b'); return; }
      const undoLabels = { point: '↩ Punto annullato', card: '↩ Cartellino annullato', timeout: '↩ Timeout annullato', substitution: '↩ Cambio annullato' };
      flashMsg(undoLabels[undone] ?? '↩ Annullato', '#f5c542');
      autoSelectServer(); rerender(); return;
    }
    if (type === 'SWAP_SERVE') {
      m.servingSquad = m.servingSquad === m.squadA ? m.squadB : m.squadA;
      m.assignServe(); autoSelectServer(); rerender();
      flashMsg('⇄ Battuta cambiata', '#a78bfa'); return;
    }
    if (type === 'BLOCKED') {
      match.removeLastTouch();
      match.pushTouch(selectedPlayer, 'blocked');
      flashMsg('Muro', '#a78bfa'); return;
    }

    // ── ACE esteso ────────────────────────────────────────────────────
// Se LOST_BALL e la palla non è mai tornata nel campo di chi ha battuto
// (tutti i tocchi dopo la battuta sono della squadra ricevente)
// → registra ACE anche al battitore
if (type === 'LOST_BALL' && !servePhase) {
  const serverSide   = m.servingSquad?.side;
  const receiverSide = serverSide === 'a' ? 'b' : 'a';

  // Il giocatore che perde la palla deve essere il ricevente
  if (selectedPlayer.team === receiverSide) {
    // Salta il primo tocco (che è la battuta, type:'serve')
    const touchesAfterServe = m.currentSelectedPlayers.slice(1);
    const ballNeverReturned = touchesAfterServe.every(t => t.team === receiverSide);

    if (ballNeverReturned) {
      const server = m.servingSquad?.servingPlayer;
      if (server) {
        m.addStatPlayer(server, STAT.ACE);        
        m.addStatSquad(server, STAT.ACE);

        m.addStatSetPlayer(server, STAT.ACE);
        m.addStatSetSquad(server, STAT.ACE);
        //console.log("ACEEEEEEEEEEEEE");
        flashMsg('⚡ Ace esteso!', '#22d47a');
      }
    }
  }
}

    // ── Scenario 2 muro (punto diretto): il muro rimanda la palla nel campo
    // avversario senza che altri tocchi avvengano, e la squadra murante fa punto.
    // L'utente preme POINT mentre il block handler è ancora selezionato.
    if (
      type === 'POINT' &&
      m._blockHandler != null &&
      m._blockHandler.id === selectedPlayer?.id &&
      m._touchesAfterBlock === 1
    ) {
      m.addStatPlayer(m._blockHandler, STAT.BLOCK_SUCCESSFUL);
      m.addStatSquad(m._blockHandler, STAT.BLOCK_SUCCESSFUL);
      m.addStatSetPlayer(m._blockHandler, STAT.BLOCK_SUCCESSFUL);
      m.addStatSetSquad(m._blockHandler, STAT.BLOCK_SUCCESSFUL);
      m.addStatPlayer(m._blockHandler, STAT.TOTAL_BLOCK);
      m.addStatSquad(m._blockHandler, STAT.TOTAL_BLOCK);
      m.addStatSetPlayer(m._blockHandler, STAT.TOTAL_BLOCK);
      m.addStatSetSquad(m._blockHandler, STAT.TOTAL_BLOCK);
      if (m._blockAttacker) {
        m.addStatPlayer(m._blockAttacker, STAT.ATTACK_NOT_SUCCESSFUL);
        m.addStatSquad(m._blockAttacker, STAT.ATTACK_NOT_SUCCESSFUL);
        m.addStatSetPlayer(m._blockAttacker, STAT.ATTACK_NOT_SUCCESSFUL);
        m.addStatSetSquad(m._blockAttacker, STAT.ATTACK_NOT_SUCCESSFUL);
        m.addStatPlayer(m._blockAttacker, STAT.TOTAL_ATTACK);
        m.addStatSquad(m._blockAttacker, STAT.TOTAL_ATTACK);
        m.addStatSetPlayer(m._blockAttacker, STAT.TOTAL_ATTACK);
        m.addStatSetSquad(m._blockAttacker, STAT.TOTAL_ATTACK);
      }
      m.scorePoint(selectedPlayer, true, null, false);
      flashMsg('▣ Muro vincente!', '#22d47a');
      setServePhase(true);
      autoSelectServer(); rerender(); return;
    }

    // ── Scenario 1 muro: il block handler raccoglie ma poi perde il pallone ──
    // LOST_BALL premuto sul primo giocatore che ha toccato dopo il muro,
    // senza che nessun compagno abbia toccato il pallone.
    // Assegna: blockHandler → BLOCK_NOT_SUCCESSFUL + TOTAL_BLOCK
    //          blockAttacker → ATTACK_WIN + TOTAL_ATTACK
    // Nessuna BALL_LOST viene aggiunta; il punto va alla squadra dell'attaccante.
    if (
      type === 'LOST_BALL' &&
      m._blockHandler != null &&
      m._blockHandler.id === selectedPlayer?.id &&
      m._touchesAfterBlock === 1
    ) {
      m.scoreBlockFail(selectedPlayer);
      flashMsg('Muro fallito', '#f04e4e');
      setServePhase(true);
      autoSelectServer(); rerender(); return;
    }

    // ── Scenario 1: difesa fallita dal primo ricevitore ───────────────
    // Il LOST_BALL è premuto sul giocatore che ha ricevuto per primo dopo un
    // cross non-battuta, senza che nessun compagno abbia toccato il pallone.
    // In questo caso l'engine converte le stats provvisorie in:
    //   attacker: ATTACK_SUCCESSFUL → ATTACK_WIN
    //   receiver: DEF_POS → DEF_NEG
    // Nessuna BALL_LOST viene aggiunta; il punto va alla squadra dell'attaccante.
    if (
      type === 'LOST_BALL' &&
      m._lastCrossReceiver != null &&
      m._lastCrossAttacker != null &&
      m._lastCrossReceiver.id === selectedPlayer?.id &&
      m._touchesOnCurrentSide === 1
    ) {
      m.scoreDefenseError(selectedPlayer, m._lastCrossAttacker);
      flashMsg('Difesa fallita', '#f04e4e');
      setServePhase(true);
      autoSelectServer(); rerender(); return;
    }

    const action = ACTION_MAP[type];
    if (!action) return;
    if (!selectedPlayer) { flashMsg('Seleziona prima un giocatore!', '#f04e4e'); return; }

    // ACE, SERVE_ERROR e SERVES_ERR_LINE consumano la fase battuta
    if (type === 'ACE' || type === 'SERVE_ERROR' || type === 'SERVES_ERR_LINE') setServePhase(false);

    const extras = ACTION_EXTRA[type] ?? [];
    extras.forEach(s => { 
      //Match

      m.addStatPlayer(selectedPlayer, s);  
      m.addStatSquad(selectedPlayer, s); 
    
      //Set
      m.addStatSetPlayer(selectedPlayer, s);
      m.addStatSetSquad(selectedPlayer, s);
    });

    const isAce = type === 'ACE';
    m.scorePoint(selectedPlayer, action.value, action.stat, isAce);

    console.log(m);
    flashMsg(ACTION_LABELS[type] ?? type, ACTION_COLORS[type] ?? '#e8eaf2');
    setServePhase(true);
    autoSelectServer(); rerender();
  }, [subMode, selectedPlayer, flashMsg, autoSelectServer, rerender]);

  // ── Save ───────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    const m = matchRef.current;
    const meta = matchMeta.current;
    if (!m || !meta?.id) { flashMsg('Dati partita mancanti', '#f04e4e'); return; }
    setSaving(true);
    try {
      const payload = m.toSavePayload(meta);
      const res = await apiPost(`/matches/${meta.id}/save`, payload);
      localStorage.removeItem(storageKey);
      flashMsg(`✓ Salvata (${res.sets ?? '?'} set)`, '#22d47a');
      setShowSave(false);
      setIsMatchEnd(false);
    } catch (err) {
      flashMsg(`Errore: ${err.message}`, '#f04e4e');
    } finally {
      setSaving(false);
    }
  }, [flashMsg]);

  // ── Loading / Error ────────────────────────────────────────────
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
  const maxSet = match.maxSet;

  const totalSetsPlayed = squadA.setsWon + squadB.setsWon;
  const courtSwapped = (totalSetsPlayed % 2 === 1) !== tiebreakSwapped;
  const posMapA = courtSwapped ? COURT_POS_B : COURT_POS_A;
  const posMapB = courtSwapped ? COURT_POS_A : COURT_POS_B;

  // Mode banner
  let modeBannerClass = '';
  let modeBannerText  = '';
  if (subMode && !outPlayer) { modeBannerClass = 'sub';         modeBannerText = 'Cambio — seleziona chi ESCE'; }
  if (subMode && outPlayer)  { modeBannerClass = 'sub';         modeBannerText = `Fuori: #${outPlayer.shirtNumber} — seleziona chi ENTRA`; }
  if (cardMode === 'yellow') { modeBannerClass = 'card-yellow'; modeBannerText = '🟨 Clicca un giocatore'; }
  if (cardMode === 'red')    { modeBannerClass = 'card-red';    modeBannerText = '🟥 Clicca un giocatore'; }

  // Selected bar
  let selBarClass = 'mon-selected-bar';
  if (!selectedPlayer && !subMode && !cardMode) selBarClass += ' none';
  if (subMode)  selBarClass += ' sub-mode';
  if (cardMode) selBarClass += ' card-mode';

  return (
    <div className={refMode ? 'ref-mode' : ''}
         style={{ height:'100dvh', background:'var(--bg)', color:'var(--text)',
                  fontFamily:'Barlow,sans-serif', display:'flex', flexDirection:'column',
                  overflow:'hidden', userSelect:'none' }}>

      {/* FLASH */}
      <div className="mon-flash" ref={flashRef} />

      {/* SAVE DIALOG */}
      {showSave && (
        <SaveDialog
          match={match}
          matchMeta={matchMeta.current}
          onConfirm={doSave}
          onCancel={() => { setShowSave(false); setIsMatchEnd(false); }}
          saving={saving}
          isMatchEnd={isMatchEnd}
        />
      )}

      {/* FORMAZIONE INIZIO SET */}
      {setLineupTarget && matchRef.current && (
        <SetLineupModal
          match={matchRef.current}
          side={setLineupTarget.side}
          setNumber={setLineupTarget.setNumber}
          onClose={() => { setSetLineupTarget(null); autoSelectServer(); rerender(); }}
        />
      )}

      {/* FINE TURNO MODAL */}
      {showEndTurn && (
        <FineTurnoModal
          servePhase={servePhase}
          onSelect={(type) => {
            setShowEndTurn(false);
            if (type === 'ACE' || type === 'SERVE_ERROR') setServePhase(false);
            registerEvent(type);
          }}
          onClose={() => setShowEndTurn(false)}
        />
      )}

      {/* ═══ TOP BAR ═══════════════════════════════════════════ */}
      <div className="mon-topbar">

        {/* Team A — nome + pip dinamici */}
        <div className="mon-team-block a">
          <span className="mon-team-name a">{squadA.shortName ?? squadA.name}</span>
          <div className="mon-score-sets">
            {Array.from({ length: maxSet }, (_, i) => {
              const setData = match.sets[i];
              const wonByA = setData?.winner === 'a';
              return (
                <div key={i} className={`mon-set-pip ${wonByA ? 'won-a' : ''}`}>
                  {setData?.scoreA ?? 0}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scoreboard centrato */}
        <div className="mon-scoreboard">
          <div className="mon-pts a">{squadA.score}</div>
          <div className="mon-pts-div">:</div>
          <div className="mon-pts b">{squadB.score}</div>
        </div>

        {/* Team B — nome + pip dinamici */}
        <div className="mon-team-block b">
          <span className="mon-team-name b">{squadB.shortName ?? squadB.name}</span>
          <div className="mon-score-sets">
            {Array.from({ length: maxSet }, (_, i) => {
              const setData = match.sets[i];
              const wonByB = setData?.winner === 'b';
              return (
                <div key={i} className={`mon-set-pip ${wonByB ? 'won-b' : ''}`}>
                  {setData?.scoreB ?? 0}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mon-topbar-right" />
      </div>

      {/* Set label */}
      <div className="mon-set-label">Set {match.currentSetNumber}</div>

      {/* ═══ MAIN ══════════════════════════════════════════════ */}
      <div className="mon-main">

        {/* Bench A */}
        <div className={`bench-panel a${courtSwapped ? ' bench-from-right' : ''}${subMode || cardMode ? ' bench-visible' : ''}`}
             style={{ order: courtSwapped ? 3 : 1 }}>
          <div className="bench-header">
            <div className="bench-title a">{squadA.name}</div>
            <div className={`bench-timeout ${squadA.timeout > 0 ? 'has-to' : ''}`}>
              Timeout: {squadA.timeout} / 2
            </div>
          </div>
          {squadA.bench.map(p => (
            <div key={p.id}
                 className={['bench-player',
                   selectedPlayer?.id === p.id ? 'selected-a' : '',
                   outPlayer?.id === p.id ? 'out-target' : '',
                 ].join(' ')}
                 onClick={() => handleBenchClick(p)}>
              <div className="bp-num a">{p.shirtNumber}</div>
              <div className="bp-name">
                {p.displayName}
                {(p.stats[STAT.CARD_YELLOW] > 0 || p.stats[STAT.CARD_RED] > 0) && (
                  <span className="bp-cards">
                    {'🟨'.repeat(p.stats[STAT.CARD_YELLOW])}
                    {'🟥'.repeat(p.stats[STAT.CARD_RED])}
                  </span>
                )}
                <br />
                <span style={{ fontSize:'9px', color:'var(--subtle)', textTransform:'capitalize' }}>
                  {ROLE_MAP[p.role] ?? p.role}{p.libero ? ' · L' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Court + Actions */}
        <div className="mon-court-area" style={{ order: 2 }}>

          {/* Campo */}
          <div className="mon-court-wrap">
            <div className="mon-court">
              <div className="mon-net" />
{/* Zone invisibili — coprono l'intera metà campo per ogni giocatore */}
{squadA.players.map((p, idx) => {
  const zone = (courtSwapped ? ZONE_MAP_B : ZONE_MAP_A)[idx + 1];
  if (!zone) return null;
  return (
    <div key={`zone-a-${p.id}`}
         style={{
           position: 'absolute',
           left: `${zone.left}%`, top: `${zone.top}%`,
           width: `${zone.width}%`, height: `${zone.height}%`,
           zIndex: 8,
           cursor: 'pointer',
         }}
         onPointerDown={(e) => { e.preventDefault(); handleCourtClick(p); }} />
  );
})}
{squadB.players.map((p, idx) => {
  const zone = (courtSwapped ? ZONE_MAP_A : ZONE_MAP_B)[idx + 1];
  if (!zone) return null;
  return (
    <div key={`zone-b-${p.id}`}
         style={{
           position: 'absolute',
           left: `${zone.left}%`, top: `${zone.top}%`,
           width: `${zone.width}%`, height: `${zone.height}%`,
           zIndex: 8,
           cursor: 'pointer',
         }}
         onPointerDown={(e) => { e.preventDefault(); handleCourtClick(p); }} />
  );
})}
              {/*
                Serve dot — standalone, NON figlio di nessun cerchio giocatore.
                Posizione fissa: sempre su COURT_POS_A[1] (lato sinistro, inizio partita).
                
              */
              
              }

              <span style={{
                position: 'absolute',
                width: '9px', height: '9px',
                background: 'var(--amber)',
                borderRadius: '50%',
                border: '1.5px solid #fff',
                animation: refMode ? 'none' : 'pulse-dot 1.5s infinite',
                zIndex: 20,
                pointerEvents: 'none',
                left:  `calc(${COURT_POS_A[1][0]}% + 11px)`,
                top:   `calc(${COURT_POS_A[1][1]}% - 20px)`,
              }} />

              {/* Giocatori A — solo visivi, le zone gestiscono i tocchi */}
{squadA.players.map((p, idx) => {
  const pos = posMapA[idx + 1]; if (!pos) return null;
  return (
    <div key={p.id}
         className="court-player-hit"
         style={{ left:`${pos[0]}%`, top:`${pos[1]}%` }}>
      <div className={[
        'court-player a',
        p.libero ? 'libero' : '',
        selectedPlayer?.id === p.id ? 'selected' : '',
        outPlayer?.id === p.id ? 'out-selected' : '',
        refMode ? 'ref-size' : '',
      ].join(' ')}
           title={`#${p.shirtNumber} ${p.fullName} · ${ROLE_MAP[p.role] ?? p.role}`}>
        {p.shirtNumber}
      </div>
      {(p.stats[STAT.CARD_YELLOW] > 0 || p.stats[STAT.CARD_RED] > 0) && (
        <span className="court-player-cards">
          {'🟨'.repeat(p.stats[STAT.CARD_YELLOW])}
          {'🟥'.repeat(p.stats[STAT.CARD_RED])}
        </span>
      )}
    </div>
  );
})}

{/* Giocatori B — solo visivi */}
{squadB.players.map((p, idx) => {
  const pos = posMapB[idx + 1]; if (!pos) return null;
  return (
    <div key={p.id}
         className="court-player-hit"
         style={{ left:`${pos[0]}%`, top:`${pos[1]}%` }}>
      <div className={[
        'court-player b',
        p.libero ? 'libero' : '',
        selectedPlayer?.id === p.id ? 'selected' : '',
        outPlayer?.id === p.id ? 'out-selected' : '',
        refMode ? 'ref-size' : '',
      ].join(' ')}
           title={`#${p.shirtNumber} ${p.fullName} · ${ROLE_MAP[p.role] ?? p.role}`}>
        {p.shirtNumber}
      </div>
      {(p.stats[STAT.CARD_YELLOW] > 0 || p.stats[STAT.CARD_RED] > 0) && (
        <span className="court-player-cards">
          {'🟨'.repeat(p.stats[STAT.CARD_YELLOW])}
          {'🟥'.repeat(p.stats[STAT.CARD_RED])}
        </span>
      )}
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

          {/* Selected bar */}
          <div className={selBarClass}>
            <div className={`sel-badge ${selectedPlayer ? selectedPlayer.team : 'neutral'}`}>
              {subMode ? '⇄' : cardMode ? (cardMode === 'red' ? '🟥' : '🟨') : selectedPlayer ? selectedPlayer.shirtNumber : '–'}
            </div>
            <div className="sel-info">
              <div className="sel-name">
                {subMode && !outPlayer && 'Cambio — seleziona chi ESCE dal campo'}
                {subMode && outPlayer  && `Fuori: #${outPlayer.shirtNumber} ${outPlayer.fullName}`}
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

            {/* Riga 1: Blocked + Fine Turno */}
            <div className="action-group" style={{ gap: 6 }}>
              <button className="act-btn slate"
                      onClick={() => registerEvent('BLOCKED')}
                      disabled={!selectedPlayer}>
                <span className="act-icon">▣</span> Blocked
              </button>
              <button className={`act-btn fine-turno ${selectedPlayer ? 'ready' : ''}`}
                      onClick={() => { if (selectedPlayer) setShowEndTurn(true); }}
                      disabled={!selectedPlayer}>
                🏐 Fine Turno
              </button>
            </div>

            {/* Gestione */}
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

            {/* Utility */}
            <div className="util-controls">
              <button className="ctrl-btn undo" onClick={() => registerEvent('UNDO')}>↩ Undo</button>
              <button className="ctrl-btn" onClick={() => registerEvent('SWAP_SERVE')}>⇄ Battuta</button>
              <button className="ctrl-btn" onClick={() => setTiebreakSwapped(s => !s)} title="Inverti lati campo">
                ⇆ Lati
              </button>
              <button className="ctrl-btn" onClick={() => { setIsMatchEnd(false); setShowSave(true); }} disabled={saving}>
                ↑ Salva
              </button>
            </div>
          </div>
        </div>

        {/* Bench B */}
        <div className={`bench-panel b${courtSwapped ? ' bench-from-left' : ''}${subMode || cardMode ? ' bench-visible' : ''}`}
             style={{ order: courtSwapped ? 1 : 3 }}>
          <div className="bench-header">
            <div className="bench-title b">{squadB.name}</div>
            <div className={`bench-timeout ${squadB.timeout > 0 ? 'has-to' : ''}`}>
              Timeout: {squadB.timeout} / 2
            </div>
          </div>
          {squadB.bench.map(p => (
            <div key={p.id}
                 className={['bench-player',
                   selectedPlayer?.id === p.id ? 'selected-b' : '',
                   outPlayer?.id === p.id ? 'out-target' : '',
                 ].join(' ')}
                 onClick={() => handleBenchClick(p)}>
              <div className="bp-num b">{p.shirtNumber}</div>
              <div className="bp-name">
                {p.displayName}
                {(p.stats[STAT.CARD_YELLOW] > 0 || p.stats[STAT.CARD_RED] > 0) && (
                  <span className="bp-cards">
                    {'🟨'.repeat(p.stats[STAT.CARD_YELLOW])}
                    {'🟥'.repeat(p.stats[STAT.CARD_RED])}
                  </span>
                )}
                <br />
                <span style={{ fontSize:'9px', color:'var(--subtle)', textTransform:'capitalize' }}>
                  {ROLE_MAP[p.role] ?? p.role}{p.libero ? ' · L' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arbitro fixed button */}
      <button className={`ref-fixed-btn ${refMode ? 'active-ref' : ''}`}
              onClick={toggleRefMode}
              title="Modalità arbitro">
        ⚖ {refMode ? 'Esci' : 'Arbitro'}
      </button>

      {/* Stats fixed button */}
      <button className="stats-fixed-btn" onClick={() => setStatsOpen(o => !o)}>
        ◉ Stats
      </button>

      {/* ═══ STATS PANEL ═══════════════════════════════════════ */}
      <div className={`sp-panel ${statsOpen ? 'open' : ''}`}>
        <div className="sp-header">
          <span className="sp-title">◉ Statistiche</span>
          <div className="sp-pills">
            {Object.keys(STAT_CATS).map(cat => (
              <button key={cat}
                      className={`sp-cat-btn ${statsCat === cat ? 'active' : ''}`}
                      onClick={() => setStatsCat(cat)}>{cat}</button>
            ))}
          </div>
          <button className="sp-close" onClick={() => setStatsOpen(false)}>✕</button>
        </div>

        {/* Riga controlli: set tabs + view toggle */}
        <div className="sp-controls-row">
          <div className="sp-tabs">
            <button className={`sp-tab ${statsSet === 'match' ? 'active' : ''}`}
                    onClick={() => setStatsSet('match')}>Match</button>
            {match.sets.slice(0, match.currentSetNumber - 1).map((_, i) => (
              <button key={i} className={`sp-tab ${statsSet === i ? 'active' : ''}`}
                      onClick={() => setStatsSet(i)}>Set {i+1}</button>
            ))}
            <button className={`sp-tab ${statsSet === 'current' ? 'active' : ''}`}
                    onClick={() => setStatsSet('current')}>
              Set {match.currentSetNumber} ▸
            </button>
          </div>
          <div className="sp-view-toggle">
            <button className={`sp-view-btn ${statsView === 'players' ? 'active' : ''}`}
                    onClick={() => setStatsView('players')}>Giocatori</button>
            <button className={`sp-view-btn ${statsView === 'teams' ? 'active' : ''}`}
                    onClick={() => setStatsView('teams')}>Squadre</button>
          </div>
        </div>

        <div className="sp-body">

          {/* ── VISTA GIOCATORI ── */}
          {statsView === 'players' && (
            <div className="stats-two-col">
              {[squadA, squadB].map(squad => {
                const allPlayers = [...squad.players, ...squad.bench];
                const keys = STAT_CATS[statsCat] ?? [];
                const getStats = (player) => {
                  if (statsSet === 'match') return player.stats;
                  const idx = statsSet === 'current' ? match.currentSetNumber - 1 : statsSet;
                  return match.sets[idx]?.stats?.players?.[player.id] ?? {};
                };
                return (
                  <div key={squad.side}>
                    <div className="stats-col-title" style={{ color:`var(--${squad.side})` }}>{squad.name}</div>
                    <div className="stats-col-meta">
                      Set vinti: <b>{squad.setsWon}</b> · Punteggio: <b>{squad.score}</b> · Timeout: <b>{squad.timeout}/2</b>
                    </div>
                    <table className="stats-tbl">
                      <thead>
                        <tr>
                          <th>#</th><th>Giocatore</th>
                          {keys.map(k => <th key={k} title={STAT_FULL[k]}>{STAT_SHORT[k]}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {allPlayers.map(p => {
                          const ps = getStats(p);
                          return (
                            <tr key={p.id} className={p.onCourt ? '' : 'bench-row'}>
                              <td><span className={`stat-num ${squad.side}`}>{p.shirtNumber}</span></td>
                              <td className="stat-name">
                                {p.displayName}{p.libero && <span className="lib-badge">L</span>}
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
          )}

          {/* ── VISTA SQUADRE ── */}
          {statsView === 'teams' && (() => {
            const getSquadStats = (squad) => {
              if (statsSet === 'match') return squad.stats;
              const idx = statsSet === 'current' ? match.currentSetNumber - 1 : statsSet;
              return match.sets[idx]?.stats?.squads?.[squad.side] ?? squad.stats;
            };
            const sA = getSquadStats(squadA);
            const sB = getSquadStats(squadB);
            return (
              <table className="stats-tbl teams-tbl">
                <thead>
                  <tr>
                    <th>Statistica</th>
                    <th style={{color:'var(--a)'}}>{squadA.shortName}</th>
                    <th style={{color:'var(--b)'}}>{squadB.shortName}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(STAT_CATS).map(([cat, keys]) => (
                    <>
                      <tr key={`cat-${cat}`} className="teams-tbl-cat-row">
                        <td colSpan={3}>{cat}</td>
                      </tr>
                      {keys.map(k => {
                        const vA = sA?.[k] ?? 0;
                        const vB = sB?.[k] ?? 0;
                        return (
                          <tr key={k}>
                            <td className="stat-name">{STAT_FULL[k]}</td>
                            <td className={`stat-val ${vA > 0 ? 'nz' : ''} ${vA > vB ? 'best' : ''}`}>{vA}</td>
                            <td className={`stat-val ${vB > 0 ? 'nz' : ''} ${vB > vA ? 'best' : ''}`}>{vB}</td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            );
          })()}

        </div>
      </div>
    </div>
  );
}