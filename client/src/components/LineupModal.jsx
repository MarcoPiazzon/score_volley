import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

// ── Constants ────────────────────────────────────────────────────
const ROLE_IT = {
  setter:               'Palleggiatore',
  outside_hitter:       'Schiacciatore',
  opposite:             'Opposto',
  middle_blocker:       'Centrale',
  libero:               'Libero',
  defensive_specialist: 'Difensore Spec.',
};

// Rotazione in campo: riga alta = sotto rete (4,3,2), riga bassa (5,6,1)
const COURT_ROWS = [
  [4, 3, 2],
  [5, 6, 1],
];

// ── PositionSlot ─────────────────────────────────────────────────
function PositionSlot({ position, player, onPointerDown, isDropTarget }) {
  return (
    <div
      data-slot-pos={position}
      className={`relative rounded-xl border-2 h-full transition-colors overflow-hidden
        ${isDropTarget
          ? 'border-teamA bg-teamA/15'
          : player
            ? 'border-white/15'
            : 'border-white/20 border-dashed bg-black/20'}`}
    >
      {/* Position number */}
      <span className="absolute top-1 left-1.5 z-10 text-white/50 font-condensed font-bold text-[11px] leading-none pointer-events-none">
        {position}
      </span>

      {player ? (
        <div
          onPointerDown={(e) => onPointerDown(e, 'court', player, position)}
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          style={{
            touchAction: 'none',
            ...(player.photo_url
              ? { backgroundImage: `url(${player.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
              : { background: 'linear-gradient(135deg, rgba(80,140,200,0.25), rgba(20,30,50,0.8))' })
          }}
        >
          {/* Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* Shirt number badge */}
          <div className="absolute top-1 right-1.5 z-10 bg-black/60 rounded px-1 py-0.5 pointer-events-none">
            <span className="text-white font-condensed font-bold text-[10px]">#{player.shirt_number}</span>
          </div>

          {/* Info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 z-10 pointer-events-none">
            <p className="text-white font-condensed font-semibold text-[11px] leading-tight truncate">
              {player.name} {player.surname}
            </p>
            <p className="text-white/55 text-[10px] font-condensed">
              {ROLE_IT[player.role] ?? '?'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full pointer-events-none">
          {isDropTarget
            ? <span className="text-teamA font-condensed text-xs">↓</span>
            : <span className="text-white/15 font-condensed text-xs">—</span>
          }
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function LineupModal({ match, teamId, onClose }) {
  const navigate = useNavigate();

  const [allPlayers, setAllPlayers] = useState([]);
  const [court, setCourt]           = useState({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null });
  const [loading,  setLoading]      = useState(true);
  const [saving,   setSaving]       = useState(false);
  const [starting, setStarting]     = useState(false);
  const [error,    setError]        = useState('');

  // ── Drag state ──────────────────────────────────────────────────
  const dragRef      = useRef(null);          // current drag payload
  const ghostDomRef  = useRef(null);          // ghost DOM node (imperative position update)
  const [isDragging, setIsDragging]  = useState(false);
  const [ghostLabel, setGhostLabel]  = useState('');
  const [dropTarget, setDropTarget]  = useState(null); // number | 'bench' | null

  // ── Load players + existing lineup ──────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [players, lineup] = await Promise.all([
          apiGet(`/teams/${teamId}/players`),
          apiGet(`/matches/${match.id}/lineup`),
        ]);

        setAllPlayers(players ?? []);

        const side     = match.home_team_id === teamId ? 'home' : 'away';
        const starters = lineup?.[side]?.starters ?? [];

        const newCourt = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
        for (const s of starters) {
          const pos = parseInt(s.position_number);
          if (pos >= 1 && pos <= 6) {
            newCourt[pos] = {
              id:           s.player_id,
              name:         s.name,
              surname:      s.surname,
              shirt_number: s.shirt_number,
              role:         s.role,
              photo_url:    s.photo_url ?? null,
            };
          }
        }
        setCourt(newCourt);
      } catch {
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [match.id, teamId]);

  // ── Derived: players NOT on court ────────────────────────────────
  const courtIds  = new Set(Object.values(court).filter(Boolean).map(p => p.id));
  const benchPool = allPlayers.filter(p => !courtIds.has(p.id));

  // ── Pointer drag handlers ─────────────────────────────────────
  const findDropTarget = useCallback((x, y) => {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (el.dataset.slotPos !== undefined) return parseInt(el.dataset.slotPos);
      if (el.dataset.bench  !== undefined) return 'bench';
    }
    return null;
  }, []);

  const startDrag = useCallback((e, source, player, position = null) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      source, player, position,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setGhostLabel(`#${player.shirt_number} ${player.surname ?? player.name}`);
    setIsDragging(true);
    // Position ghost immediately (DOM ref set after render via callback ref)
    // We store initial coords so the ghost can be placed on first paint
    dragRef.current.initX = e.clientX;
    dragRef.current.initY = e.clientY;
  }, []);

  // Register global pointer listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      // Update ghost position imperatively (no state = no re-render per frame)
      if (ghostDomRef.current) {
        ghostDomRef.current.style.left = `${e.clientX - drag.offsetX}px`;
        ghostDomRef.current.style.top  = `${e.clientY - drag.offsetY}px`;
      }
      setDropTarget(findDropTarget(e.clientX, e.clientY));
    };

    const onUp = (e) => {
      const drag   = dragRef.current;
      const target = findDropTarget(e.clientX, e.clientY);

      if (drag) {
        if (target === 'bench' && drag.source === 'court') {
          setCourt(prev => ({ ...prev, [drag.position]: null }));
        } else if (typeof target === 'number') {
          setCourt(prev => {
            const next      = { ...prev };
            const displaced = next[target];
            next[target] = drag.player;
            if (drag.source === 'court') next[drag.position] = displaced;
            return next;
          });
        }
      }

      dragRef.current = null;
      setIsDragging(false);
      setDropTarget(null);
    };

    window.addEventListener('pointermove',   onMove,  { passive: false });
    window.addEventListener('pointerup',     onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove',   onMove);
      window.removeEventListener('pointerup',     onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, findDropTarget]);

  // ── Save lineup ──────────────────────────────────────────────────
  const buildPayload = () => {
    const starters = Object.entries(court)
      .filter(([, p]) => p !== null)
      .map(([pos, p]) => ({
        player_id:       p.id,
        position_number: parseInt(pos),
        is_starter:      true,
        is_libero:       false,
      }));

    const bench = benchPool.map(p => ({
      player_id:       p.id,
      position_number: null,
      is_starter:      false,
      is_libero:       false,
    }));

    return [...starters, ...bench];
  };

  const persistLineup = async () => {
    const players = buildPayload();
    if (players.length === 0) return;
    await apiPost(`/matches/${match.id}/lineup`, { team_id: teamId, players });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await persistLineup();
      onClose();
    } catch {
      setError('Errore nel salvataggio della formazione');
    } finally {
      setSaving(false);
    }
  };

  const handleStartMatch = async () => {
    setStarting(true);
    setError('');
    try {
      await persistLineup();
      await apiPost(`/matches/${match.id}/start`, {});
      localStorage.setItem('openMatch', JSON.stringify(match));
      navigate(`/monitor/${match.id}`);
    } catch {
      setError('Errore durante l\'avvio della partita');
      setStarting(false);
    }
  };

  const startersCount = Object.values(court).filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 bg-surf1 border border-white/10 rounded-2xl
                   w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/7 flex-shrink-0">
          <div>
            <h2 className="font-condensed font-bold text-xl text-text">Formazione</h2>
            <p className="text-muted text-xs mt-0.5 font-condensed">
              {match.home_team} vs {match.away_team}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Starters counter */}
            <span className={`text-xs font-condensed px-2 py-0.5 rounded-full
              ${startersCount === 6
                ? 'bg-green/15 text-green'
                : 'bg-amber/15 text-amber'}`}
            >
              {startersCount}/6 titolari
            </span>

            {/* Salva */}
            <button
              onClick={handleSave}
              disabled={saving || starting}
              className="px-4 py-2 bg-surf2 border border-white/10 rounded-xl
                         text-sm font-condensed font-semibold text-text
                         hover:bg-surf3 transition-colors disabled:opacity-40"
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>

            {/* Avvia partita */}
            <button
              onClick={handleStartMatch}
              disabled={saving || starting || startersCount < 6}
              title={startersCount < 6 ? 'Devi schierare 6 titolari' : ''}
              className="px-4 py-2 bg-teamA/20 border border-teamA/30 rounded-xl
                         text-sm font-condensed font-semibold text-teamA
                         hover:bg-teamA/30 transition-colors disabled:opacity-40"
            >
              {starting ? 'Avvio…' : 'Avvia partita →'}
            </button>

            {/* Chiudi */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-muted hover:text-text hover:bg-surf2 transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-2 bg-red/10 border border-red/30 rounded-xl
                          text-red text-sm font-condensed flex-shrink-0">
            {error}
          </div>
        )}

        {/* ── Body ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted font-condensed">
            Caricamento…
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex min-h-0">

            {/* ── Left: player pool ── */}
            <div
              data-bench="1"
              className="w-52 flex-shrink-0 border-r border-white/7 overflow-y-auto min-h-0"
            >
              <div className="p-3 space-y-1.5">
                <p className="text-muted text-[11px] font-condensed uppercase tracking-wide mb-2">
                  Rosa ({benchPool.length})
                </p>

                {benchPool.map(player => (
                  <div
                    key={player.id}
                    onPointerDown={(e) => startDrag(e, 'bench', player)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surf2
                               border border-white/7 cursor-grab active:cursor-grabbing
                               hover:border-teamA/30 transition-colors select-none"
                    style={{ touchAction: 'none' }}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-teamA/20
                                    border border-teamA/30 overflow-hidden flex items-center justify-center pointer-events-none">
                      {player.photo_url
                        ? <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-teamA font-condensed font-bold text-xs">{player.shirt_number}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="min-w-0 pointer-events-none">
                      <p className="text-text font-condensed text-xs font-semibold truncate leading-tight">
                        {player.name} {player.surname}
                      </p>
                      <p className="text-muted text-[10px] font-condensed">
                        #{player.shirt_number} · {ROLE_IT[player.role] ?? player.role}
                      </p>
                    </div>
                  </div>
                ))}

                {benchPool.length === 0 && (
                  <p className="text-subtle text-xs font-condensed text-center py-6">
                    Tutti in campo
                  </p>
                )}
              </div>
            </div>

            {/* ── Right: court ── */}
            <div className="flex-1 min-h-0 p-4 flex flex-col">
              <div className="flex-1 min-h-0 flex flex-col w-full max-w-xl mx-auto">
                <p className="flex-shrink-0 text-muted text-[11px] font-condensed uppercase tracking-wide text-center mb-2">
                  Rotazione iniziale
                </p>

                {/* Court wrapper — occupa tutta l'altezza disponibile */}
                <div
                  className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/10 flex flex-col"
                  style={{ background: 'linear-gradient(180deg, #0d2b1a 0%, #0d2b1a 100%)' }}
                >
                  <div className="flex-1 min-h-0 p-3 flex flex-col gap-1.5">

                    {/* Net indicator */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/30 text-[10px] font-condensed tracking-wider">↑ RETE</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <div className="flex-shrink-0 w-full h-0.5 rounded-full bg-white/25" />

                    {/* Rows — si dividono l'altezza rimanente */}
                    {COURT_ROWS.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex-1 min-h-0 grid grid-cols-3 gap-2">
                        {row.map(pos => (
                          <PositionSlot
                            key={pos}
                            position={pos}
                            player={court[pos]}
                            onPointerDown={startDrag}
                            isDropTarget={dropTarget === pos}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Bottom label */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-white/15 text-[10px] font-condensed">fondocampo</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                  </div>
                </div>

                {/* Hint */}
                <p className="flex-shrink-0 text-subtle text-[10px] font-condensed text-center mt-2">
                  Trascina i giocatori dalla rosa alle posizioni · Rilascia sul campo per rimuovere
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Drag ghost (portal) ── */}
      {isDragging && createPortal(
        <div
          ref={ghostDomRef}
          style={{
            position:      'fixed',
            left:          dragRef.current ? dragRef.current.initX - dragRef.current.offsetX : 0,
            top:           dragRef.current ? dragRef.current.initY - dragRef.current.offsetY : 0,
            pointerEvents: 'none',
            zIndex:        9999,
            background:    'rgba(74, 154, 255, 0.35)',
            border:        '2px solid rgba(74, 154, 255, 0.9)',
            borderRadius:  10,
            padding:       '6px 12px',
            color:         '#fff',
            fontSize:      12,
            fontWeight:    700,
            whiteSpace:    'nowrap',
            userSelect:    'none',
            backdropFilter:'blur(4px)',
            boxShadow:     '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {ghostLabel}
        </div>,
        document.body
      )}
    </div>
  );
}
