import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';
import { Match, Squad, Player } from '@/lib/match-engine';
import { STAT } from '@/lib/enums';
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

const ROLE_MAP = {
  setter: 'Palleggiatore', outside_hitter: 'Schiacciatore', opposite: 'Opposto',
  middle_blocker: 'Centrale', libero: 'Libero', defensive_specialist: 'Difensore',
};

// ── Stats config ──────────────────────────────────────────────────
const STAT_CATS = {
  Generali:  [STAT.TOUCHES, STAT.POINTS_PLAYED],
  Attacco:   [STAT.ATTACK_WIN, STAT.ATTACK_OUT, STAT.ATTACK_NOT_SUCCESSFUL, STAT.TOTAL_ATTACK],
  Battuta:   [STAT.ACE, STAT.SERVES, STAT.SERVES_ERR, STAT.TOTAL_SERVES],
  Muro:      [STAT.BLOCK_SUCCESSFUL, STAT.BLOCK_NOT_SUCCESSFUL, STAT.TOTAL_BLOCK],
  Falli:     [STAT.FOUL_DOUBLE, STAT.FOUL_FOUR_TOUCHES, STAT.FOUL_RAISED, STAT.FOUL_POSITION, STAT.FOUL_INVASION, STAT.TOTAL_FOUL],
  Cartellini:[STAT.CARD_YELLOW, STAT.CARD_RED, STAT.TOTAL_CARD],
};
const STAT_SHORT = {
  [STAT.TOUCHES]: 'Tocc', [STAT.POINTS_PLAYED]: 'PP',
  [STAT.ATTACK_WIN]: 'ATT', [STAT.ATTACK_OUT]: 'Out', [STAT.ATTACK_NOT_SUCCESSFUL]: 'Nv', [STAT.TOTAL_ATTACK]: 'Tot',
  [STAT.ACE]: 'Ace', [STAT.SERVES]: 'Ok', [STAT.SERVES_ERR]: 'Err', [STAT.TOTAL_SERVES]: 'Tot',
  [STAT.BLOCK_SUCCESSFUL]: 'Vin', [STAT.BLOCK_NOT_SUCCESSFUL]: 'Nv', [STAT.TOTAL_BLOCK]: 'Tot',
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
  [STAT.BLOCK_SUCCESSFUL]: 'Muri vincenti', [STAT.BLOCK_NOT_SUCCESSFUL]: 'Muri non vincenti', [STAT.TOTAL_BLOCK]: 'Totale muri',
  [STAT.FOUL_DOUBLE]: 'Doppio fallo', [STAT.FOUL_FOUR_TOUCHES]: '4 tocchi',
  [STAT.FOUL_RAISED]: 'Alzata irregolare', [STAT.FOUL_POSITION]: 'Fallo posizione',
  [STAT.FOUL_INVASION]: 'Invasione', [STAT.TOTAL_FOUL]: 'Totale falli',
  [STAT.CARD_YELLOW]: 'Cartellini gialli', [STAT.CARD_RED]: 'Cartellini rossi', [STAT.TOTAL_CARD]: 'Totale cartellini',
};

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
const ACTION_LABELS = {
  POINT: '✦ Point!', ACE: '⚡ Ace!', OUT: '✕ Out', LOST_BALL: '○ Lost Ball',
  SERVE_ERROR: '✗ Serve Error', BLOCKED: '▣ Blocked', DOUBLE: 'Double',
  '4TOUCHES': '4 Touches', RAISED: 'Raised', POSITION: 'Position', INVASION: 'Invasion',
};
const ACTION_COLORS = {
  POINT: '#22d47a', ACE: '#22d47a', SERVE_ERROR: '#f04e4e', OUT: '#f04e4e',
  BLOCKED: '#64748b', DOUBLE: '#f5c542', '4TOUCHES': '#f5c542',
  RAISED: '#f5c542', POSITION: '#f5c542', INVASION: '#f5c542', LOST_BALL: '#64748b',
};

// ════════════════════════════════════════════════════════════════════
//  SaveDialog — popup di conferma fine / salvataggio
// ════════════════════════════════════════════════════════════════════
function SaveDialog({ match, matchMeta, onConfirm, onCancel, saving, isMatchEnd = false }) {
  if (!match || !matchMeta) return null;
  const { squadA, squadB } = match;
  const loser = squadA.setsWon > squadB.setsWon ? squadB : squadA;
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
//  Monitor
// ════════════════════════════════════════════════════════════════════
export default function Monitor() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();

  const matchRef   = useRef(null);
  const matchMeta  = useRef(null);  // dati raw dal DB (inclusi format params)
  const flashRef   = useRef(null);
  const [tick, setTick]           = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [showSave,     setShowSave]     = useState(false);   // popup manuale
  const [isMatchEnd,   setIsMatchEnd]   = useState(false);   // popup da fine partita
  const [statsOpen,    setStatsOpen]    = useState(false);
  const [statsCat,     setStatsCat]     = useState('Generali');
  const [statsSet,     setStatsSet]     = useState('match');

  // Cambio campo visivo:
  // - between sets: courtSwapped = (totalSetsPlayed % 2 === 1) — derivato dallo stato, undo-safe
  // - tiebreak midpoint: tiebreakSwapped togglato UNA volta da _onFieldChange
  const [tiebreakSwapped, setTiebreakSwapped] = useState(false);

  // UI interaction state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [subMode,   setSubMode]   = useState(false);
  const [outPlayer, setOutPlayer] = useState(null);
  const [cardMode,  setCardMode]  = useState(null);

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

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchData, lineupData] = await Promise.all([
          apiGet(`/matches/${matchId}`),
          apiGet(`/matches/${matchId}/lineup`),
        ]);
        matchMeta.current = matchData;

        // Parametri formato partita dal DB (con fallback ai default FIVB)
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
            pl.onCourt = true;
            return pl;
          });
          squad.bench = teamData.bench.map(p => new Player({
            id: p.player_id, shirtNumber: p.shirt_number,
            name: p.name ?? '', surname: p.surname ?? '',
            role: p.role, team: side, libero: !!p.is_libero,
          }));
          return squad;
        };

        const squadA = makeSquad(lineupData.home, 'a');
        const squadB = makeSquad(lineupData.away, 'b');
        const match  = new Match(squadA, squadB, format);

        match._onSetEnd = (winner, sA, sB) => {
          const n = match.currentSetNumber - 1;
          flashMsg(`Set ${n} → ${winner.shortName}! (${sA}-${sB})`,
                   winner.side === 'a' ? '#3b8bff' : '#ff6b35');
          // Reset il toggle tiebreak: ogni nuovo set inizia "pulito"
          setTiebreakSwapped(false);
          autoSelectServer();
          rerender();
        };

        // Alla fine del match: mostra automaticamente il popup di salvataggio
        match._onMatchEnd = (winner) => {
          const other = winner === match.squadA ? match.squadB : match.squadA;
          flashMsg(`🏆 Vittoria ${winner.shortName}! (${winner.setsWon}-${other.setsWon})`, '#f5c542');
          rerender();
          // Piccolo delay per far vedere il flash prima del dialog
          setTimeout(() => {
            setIsMatchEnd(true);
            setShowSave(true);
          }, 600);
        };

        match._onFieldChange = () => {
          // Cambio campo tiebreak: toggle UNA volta (match-engine garantisce max 1 call per set)
          setTiebreakSwapped(s => !s);
          flashMsg(`↕ Cambio campo (set ${match.currentSetNumber})`, '#f5c542');
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
    // Selezione normale: aggiunge il tocco all'array del punto in corso
    if (m) m.pushTouch(player);
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
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
    // Selezione normale: aggiunge il tocco all'array del punto in corso
    if (m) m.pushTouch(player);
    setSelectedPlayer(sp => sp?.id === player.id ? null : player);
  }, [cardMode, subMode, outPlayer, flashMsg, autoSelectServer, rerender]);

  const registerEvent = useCallback((type) => {
    const m = matchRef.current; if (!m) return;

    console.log(type);
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
      if (!m.undoLastPoint()) { flashMsg('Nulla da annullare', '#64748b'); return; }
      flashMsg('↩ Punto annullato', '#f5c542');
      autoSelectServer(); rerender(); return;
    }
    if (type === 'SWAP_SERVE') {
      m.servingSquad = m.servingSquad === m.squadA ? m.squadB : m.squadA;
      m.assignServe(); autoSelectServer(); rerender();
      flashMsg('⇄ Battuta cambiata', '#a78bfa'); return;
    }
    if(type === 'BLOCKED'){
      match.removeLastTouch();
      match.pushTouch(selectedPlayer, 'blocked');
      flashMsg('Muro', '#a78bfa'); return;
    }

    const action = ACTION_MAP[type];
    if (!action) return;
    if (!selectedPlayer) { flashMsg('Seleziona prima un giocatore!', '#f04e4e'); return; }

    const extras = ACTION_EXTRA[type] ?? [];
    extras.forEach(s => { m.addStatPlayer(selectedPlayer, s); m.addStatSet(selectedPlayer, s); m.addStatSquad(selectedPlayer, s)});
    
    if (type === 'ACE') { m.addStatPlayer(selectedPlayer, STAT.TOUCHES); m.addStatSet(selectedPlayer, STAT.TOUCHES); m.addStatSquad(selectedPlayer, STAT.ACE), m.addStatSquad(selectedPlayer, STAT.TOUCHES)}
    
    const isAce = type === 'ACE' ? true : false;
    m.scorePoint(selectedPlayer, action.value, action.stat, isAce);

    console.log(m);
    flashMsg(ACTION_LABELS[type] ?? type, ACTION_COLORS[type] ?? '#e8eaf2');
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
  const servingSide  = match.servingSquad?.side;
  const maxSet       = match.maxSet;

  // Cambio campo visivo:
  // ogni set completato inverte i lati (pari2192normale, dispari2192invertito)
  // il tiebreak aggiunge un toggle extra a meta set (una sola volta)
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
    <div style={{ height:'100dvh', background:'var(--bg)', color:'var(--text)',
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

        {/* Tasti destra */}
        <div className="mon-topbar-right">
          <button className="mon-ctrl-sm undo" onClick={() => registerEvent('UNDO')}>↩ Undo</button>
          <button className="mon-ctrl-sm" onClick={() => registerEvent('SWAP_SERVE')}>⇄ Battuta</button>
          <button className="mon-ctrl-sm save"
                  onClick={() => { setIsMatchEnd(false); setShowSave(true); }}
                  disabled={saving}>
            ↑ Salva
          </button>
        </div>
      </div>

      {/* Set label */}
      <div className="mon-set-label">Set {match.currentSetNumber}</div>

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
                 className={['bench-player',
                   selectedPlayer?.id === p.id ? 'selected-a' : '',
                   outPlayer?.id === p.id ? 'out-target' : '',
                 ].join(' ')}
                 onClick={() => handleBenchClick(p)}>
              <div className="bp-num a">{p.shirtNumber}</div>
              <div className="bp-name">
                {p.displayName}<br />
                <span style={{ fontSize:'9px', color:'var(--subtle)', textTransform:'capitalize' }}>
                  {ROLE_MAP[p.role] ?? p.role}{p.libero ? ' · L' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Court + Actions */}
        <div className="mon-court-area">

          {/* Campo */}
          <div className="mon-court-wrap">
            <div className="mon-court">
              <div className="mon-net" />

              {/*
                Serve dot — elemento standalone, NON figlio di nessun cerchio giocatore.
                Posizione fissa: sempre su COURT_POS_A[1] (lato sinistro, inizio partita),
                indipendentemente dal cambio campo e dalla squadra che batte.
              */}
              <span style={{
                position: 'absolute',
                width: '9px', height: '9px',
                background: 'var(--amber)',
                borderRadius: '50%',
                border: '1.5px solid #fff',
                animation: 'pulse-dot 1.5s infinite',
                zIndex: 20,
                pointerEvents: 'none',
                left:  `calc(${COURT_POS_A[1][0]}% + 11px)`,
                top:   `calc(${COURT_POS_A[1][1]}% - 20px)`,
              }} />

              {/* Giocatori A */}
              {squadA.players.map((p, idx) => {
                const pos = posMapA[idx + 1]; if (!pos) return null;
                return (
                  <div key={p.id}
                       className={['court-player a',
                         p.libero ? 'libero' : '',
                         selectedPlayer?.id === p.id ? 'selected' : '',
                         outPlayer?.id === p.id ? 'out-selected' : '',
                       ].join(' ')}
                       style={{ left:`${pos[0]}%`, top:`${pos[1]}%` }}
                       onClick={() => handleCourtClick(p)}
                       title={`#${p.shirtNumber} ${p.fullName} · ${ROLE_MAP[p.role] ?? p.role}`}>
                    {p.shirtNumber}
                  </div>
                );
              })}

              {/* Giocatori B */}
              {squadB.players.map((p, idx) => {
                const pos = posMapB[idx + 1]; if (!pos) return null;
                return (
                  <div key={p.id}
                       className={['court-player b',
                         p.libero ? 'libero' : '',
                         selectedPlayer?.id === p.id ? 'selected' : '',
                         outPlayer?.id === p.id ? 'out-selected' : '',
                       ].join(' ')}
                       style={{ left:`${pos[0]}%`, top:`${pos[1]}%` }}
                       onClick={() => handleCourtClick(p)}
                       title={`#${p.shirtNumber} ${p.fullName} · ${ROLE_MAP[p.role] ?? p.role}`}>
                    {p.shirtNumber}
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
              <button className="ctrl-btn" onClick={() => { setIsMatchEnd(false); setShowSave(true); }} disabled={saving}>
                ↑ Salva
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
                 className={['bench-player',
                   selectedPlayer?.id === p.id ? 'selected-b' : '',
                   outPlayer?.id === p.id ? 'out-target' : '',
                 ].join(' ')}
                 onClick={() => handleBenchClick(p)}>
              <div className="bp-num b">{p.shirtNumber}</div>
              <div className="bp-name">
                {p.displayName}<br />
                <span style={{ fontSize:'9px', color:'var(--subtle)', textTransform:'capitalize' }}>
                  {ROLE_MAP[p.role] ?? p.role}{p.libero ? ' · L' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
              const squadTotal = (key) => allPlayers.reduce((s, p) => s + (p.stats[key] ?? 0), 0);
              return (
                <div key={squad.side}>
                  <div className="stats-col-title" style={{ color:`var(--${squad.side})` }}>{squad.name}</div>
                  <div className="stats-col-meta">
                    Set vinti: <b>{squad.setsWon}</b> · Punteggio: <b>{squad.score}</b> · Timeout: <b>{squad.timeout}/2</b>
                  </div>
                  <div className="stats-squad-bar">
                    {[
                      { key: STAT.ATTACK_WIN,       lbl:'Att',  color:'var(--green)' },
                      { key: STAT.ACE,              lbl:'Ace',  color:'var(--green)' },
                      { key: STAT.BLOCK_SUCCESSFUL, lbl:'Muro', color:'var(--green)' },
                      { key: STAT.TOTAL_FOUL,       lbl:'Falli',color:'var(--red)'   },
                      { key: STAT.TOTAL_CARD,       lbl:'Card', color:'var(--amber)' },
                    ].map((item, i, arr) => (
                      <div key={item.key} style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                        <div className="ssb-item">
                          <div className="ssb-val" style={{ color:item.color }}>{squadTotal(item.key)}</div>
                          <div className="ssb-lbl">{item.lbl}</div>
                        </div>
                        {i < arr.length - 1 && <div className="ssb-sep" />}
                      </div>
                    ))}
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
        </div>
      </div>
    </div>
  );
}
