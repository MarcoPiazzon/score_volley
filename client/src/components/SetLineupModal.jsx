import { useState, useRef } from 'react';

const ROLE_IT = {
  setter:               'Palleggiatore',
  outside_hitter:       'Schiacciatore',
  opposite:             'Opposto',
  middle_blocker:       'Centrale',
  libero:               'Libero',
  defensive_specialist: 'Difensore Spec.',
};

const COURT_ROWS = [
  [4, 3, 2],
  [5, 6, 1],
];

// ── PositionSlot ─────────────────────────────────────────────────
function PositionSlot({ position, player, onDragStart, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`relative rounded-xl border-2 aspect-[9/16] transition-colors overflow-hidden
        ${isDragOver
          ? 'border-teamA bg-teamA/15'
          : player
            ? 'border-white/15'
            : 'border-white/20 border-dashed bg-black/20'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, position); }}
    >
      <span className="absolute top-1 left-1.5 z-10 text-white/50 font-condensed font-bold text-[11px] leading-none">
        {position}
      </span>

      {player ? (
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'court', player, position)}
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          style={player.photoUrl
            ? { backgroundImage: `url(${player.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
            : { background: 'linear-gradient(135deg, rgba(80,140,200,0.25), rgba(20,30,50,0.8))' }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-1 right-1.5 z-10 bg-black/60 rounded px-1 py-0.5">
            <span className="text-white font-condensed font-bold text-[10px]">#{player.shirtNumber}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-1.5 z-10">
            <p className="text-white font-condensed font-semibold text-[11px] leading-tight truncate">
              {player.name} {player.surname}
            </p>
            <p className="text-white/55 text-[10px] font-condensed">
              {ROLE_IT[player.role] ?? player.role}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          {isDragOver
            ? <span className="text-teamA font-condensed text-xs">↓</span>
            : <span className="text-white/15 font-condensed text-xs">—</span>
          }
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
// Props:
//   match     – Match object from match-engine (matchRef.current)
//   side      – 'a' | 'b'
//   setNumber – upcoming set number (e.g. 2, 3, 4, 5)
//   onClose   – called after confirm or dismiss (should call rerender())
export default function SetLineupModal({ match, side, setNumber, onClose }) {
  const squad = side === 'a' ? match.squadA : match.squadB;

  // Previous set = second-to-last in match.sets (last is the new empty set)
  const prevSet      = match.sets[match.sets.length - 2];
  const prevIds      = prevSet?.startingLineup?.[side] ?? [];
  const allPlayers   = [...squad.players, ...squad.bench];

  // Default court: restore previous set's starting lineup by player ID → position index
  const [court, setCourt] = useState(() => {
    const c = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    prevIds.forEach((id, idx) => {
      const pl = allPlayers.find(p => p.id === id);
      if (pl) c[idx + 1] = pl;
    });
    return c;
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const dragSource = useRef(null);

  const courtIds  = new Set(Object.values(court).filter(Boolean).map(p => p.id));
  const benchPool = allPlayers.filter(p => !courtIds.has(p.id));

  // ── Drag handlers ────────────────────────────────────────────────
  const handleDragStart = (e, source, player, position = null) => {
    dragSource.current = { source, player, position };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnPosition = (e, targetPos) => {
    e.preventDefault();
    const drag = dragSource.current;
    if (!drag) return;
    setCourt(prev => {
      const next       = { ...prev };
      const displaced  = next[targetPos];
      if (drag.source === 'bench') {
        next[targetPos] = drag.player;
      } else if (drag.source === 'court') {
        next[targetPos]     = drag.player;
        next[drag.position] = displaced;
      }
      return next;
    });
    dragSource.current = null;
  };

  const handleDropOnBench = (e) => {
    e.preventDefault();
    const drag = dragSource.current;
    if (!drag || drag.source !== 'court') return;
    setCourt(prev => ({ ...prev, [drag.position]: null }));
    dragSource.current = null;
  };

  // ── Confirm: update Squad in-memory ─────────────────────────────
  const handleConfirm = () => {
    const newPlayers = [1, 2, 3, 4, 5, 6].map(pos => court[pos]).filter(Boolean);
    if (newPlayers.length < 6) return;

    const newCourtIds = new Set(newPlayers.map(p => p.id));
    const newBench    = allPlayers.filter(p => !newCourtIds.has(p.id));

    squad.players = newPlayers;
    squad.players.forEach(p => { p.onCourt = true; });
    newBench.forEach(p => { p.onCourt = false; });
    squad.bench = newBench;

    // Aggiorna il startingLineup del set corrente
    match.currentSet.startingLineup[side] = newPlayers.map(p => p.id);

    // Se questa squad batte all'inizio del set, aggiorna il servingPlayer
    if (match.servingSquad === squad && typeof squad.setServingPlayer === 'function') {
      squad.setServingPlayer();
    }

    onClose();
  };

  const startersCount = Object.values(court).filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 bg-surf1 border border-white/10 rounded-2xl
                   w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/7 flex-shrink-0">
          <div>
            <h2 className="font-condensed font-bold text-xl text-text">
              Formazione Set {setNumber}
            </h2>
            <p className="text-muted text-xs mt-0.5 font-condensed">
              {squad.name} · default dal set precedente
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-condensed px-2 py-0.5 rounded-full
              ${startersCount === 6 ? 'bg-green/15 text-green' : 'bg-amber/15 text-amber'}`}>
              {startersCount}/6 titolari
            </span>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={startersCount < 6}
              className="px-4 py-2 bg-teamA/20 border border-teamA/30 rounded-xl
                         text-sm font-condensed font-semibold text-teamA
                         hover:bg-teamA/30 transition-colors disabled:opacity-40"
            >
              Conferma formazione
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-muted hover:text-text hover:bg-surf2 transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Left: bench pool */}
          <div
            className="w-52 flex-shrink-0 border-r border-white/7 overflow-y-auto min-h-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnBench}
          >
            <div className="p-3 space-y-1.5">
              <p className="text-muted text-[11px] font-condensed uppercase tracking-wide mb-2">
                Rosa ({benchPool.length})
              </p>

              {benchPool.map(player => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'bench', player)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surf2
                             border border-white/7 cursor-grab active:cursor-grabbing
                             hover:border-teamA/30 transition-colors select-none"
                >
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-teamA/20
                                  border border-teamA/30 overflow-hidden flex items-center justify-center">
                    {player.photoUrl
                      ? <img src={player.photoUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-teamA font-condensed font-bold text-xs">{player.shirtNumber}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-text font-condensed text-xs font-semibold truncate leading-tight">
                      {player.name} {player.surname}
                    </p>
                    <p className="text-muted text-[10px] font-condensed">
                      #{player.shirtNumber} · {ROLE_IT[player.role] ?? player.role}
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

          {/* Right: court */}
          <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
            <div className="w-full max-w-xl">
              <p className="text-muted text-[11px] font-condensed uppercase tracking-wide text-center mb-3">
                Rotazione iniziale
              </p>

              <div
                className="rounded-2xl overflow-hidden border border-white/10"
                style={{ background: 'linear-gradient(180deg, #0d2b1a 0%, #0d2b1a 100%)' }}
              >
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-[10px] font-condensed tracking-wider">↑ RETE</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="w-full h-0.5 rounded-full bg-white/25 mb-2" />

                  {COURT_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-3 gap-2">
                      {row.map(pos => (
                        <PositionSlot
                          key={pos}
                          position={pos}
                          player={court[pos]}
                          onDragStart={handleDragStart}
                          onDrop={handleDropOnPosition}
                        />
                      ))}
                    </div>
                  ))}

                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-white/15 text-[10px] font-condensed">fondocampo</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                </div>
              </div>

              <p className="text-subtle text-[10px] font-condensed text-center mt-3">
                Trascina i giocatori dalla rosa alle posizioni · Rilascia sul campo per rimuovere
              </p>
            </div>
          </div>
        </div>

        {/* Popup conferma */}
        {showConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
            <div
              className="bg-surf2 border border-white/10 rounded-2xl p-6 mx-6 shadow-2xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-condensed font-bold text-lg text-text mb-1">
                Confermi la formazione?
              </h3>
              <p className="text-muted text-sm font-condensed mb-5">
                La formazione per il Set {setNumber} verrà applicata e non sarà più modificabile.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-condensed font-semibold
                             text-muted hover:text-text hover:bg-surf3 border border-white/10 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 rounded-xl text-sm font-condensed font-semibold
                             bg-teamA/20 border border-teamA/30 text-teamA hover:bg-teamA/30 transition-colors"
                >
                  Sì, conferma
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
