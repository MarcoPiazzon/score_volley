// ================================================================
//  match-engine.js  —  Classi Match/Squad/Player/Sset
//  Versione React: nessun coupling con il DOM.
//  Produce/consuma JSON puro; la UI è responsabilità di React.
// ================================================================

import { STAT } from "./enums.js";

// ──────────────────────────────────────────────────────────────────
//  Player
// ──────────────────────────────────────────────────────────────────
export class Player {
  constructor({ id, shirtNumber, name, surname, role, team, libero = false }) {
    this.id = id;
    this.shirtNumber = shirtNumber;
    this.name = name;
    this.surname = surname;
    this.fullName = `${name} ${surname}`;
    this.displayName = surname;
    this.role = role;
    this.team = team; // 'a' | 'b'
    this.libero = libero;
    this.onCourt = false;

    //this.stats = Object.fromEntries(Object.values(STAT).map((k) => [k, 0]));
    this.stats = {
      [STAT.TOUCHES]: 0, //palloni toccati durante la partita intera

      // ── Attacco ─────────────────────────────────────────────────
      // Attacco vincente (kill): ha prodotto direttamente il punto
      [STAT.ATTACK_WIN]: 0,
      // Attacco positivo: correttamente eseguito ma l'avversario ha difeso e poi ha segnato
      [STAT.ATTACK_SUCCESSFUL]: 0,
      // Attacco errato: palla fuori o a rete
      [STAT.ATTACK_OUT]: 0,
      // Non usato — mantenuto per compatibilità DB
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0,
      // Totale attacchi (win + successful + out + blocked)
      [STAT.TOTAL_ATTACK]: 0,

      // ── Battuta ─────────────────────────────────────────────────
      // Ace: battuta che produce direttamente il punto
      [STAT.ACE]: 0,
      // Battuta in campo, non ace, non errore
      [STAT.SERVES]: 0,
      // Errore in battuta: palla fuori o a rete
      [STAT.SERVES_ERR]: 0,
      // Errore sulla linea di fondo in battuta (tipo specifico di SERVES_ERR)
      [STAT.SERVES_ERR_LINE]: 0,
      // Totale battute effettuate (ace + ok + errori)
      [STAT.TOTAL_SERVES]: 0,

      // ── Ricezione da battuta ────────────────────────────────────
      // Ricezione riuscita: un compagno tocca dopo il ricevitore, OPPURE il pallone
      // torna nel campo avversario direttamente dal ricevitore (1-touch return)
      [STAT.RECEIVE_SUCCESSFUL]: 0,
      // Ricezione non riuscita: nessun compagno tocca E il pallone non torna dall'altra parte
      [STAT.RECEIVE_NOT_SUCCESSFUL]: 0,
      // Totale ricezioni da battuta (successful + not_successful)
      [STAT.TOTAL_RECEIVE]: 0,

      // ── Difesa da attacco (NON dalla battuta) ───────────────────
      // Difesa positiva: il pallone viene controllato e rimane in gioco
      [STAT.DEF_POS]: 0,
      // Difesa negativa: il pallone non viene controllato (punto per l'attaccante)
      [STAT.DEF_NEG]: 0,
      // Totale difese da attacco (def_pos + def_neg)
      [STAT.TOTAL_DEF]: 0,

      // Palla persa: errore generico di gioco (passaggio sbagliato, palla non controllata)
      [STAT.BALL_LOST]: 0,

      // ── Muro ────────────────────────────────────────────────────
      // Muro vincente: ha prodotto direttamente il punto (non ancora gestito — futuro)
      [STAT.BLOCK_SUCCESSFUL]: 0,
      // Muro non vincente: l'attaccante è stato murato ma la palla è rimasta in gioco
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0,
      // Totale muri tentati
      [STAT.TOTAL_BLOCK]: 0,

      // ── Falli con palla ─────────────────────────────────────────
      [STAT.FOUL_DOUBLE]: 0,       // Doppio fallo (doppio tocco)
      [STAT.FOUL_FOUR_TOUCHES]: 0, // Quattro tocchi consecutivi
      [STAT.FOUL_RAISED]: 0,       // Alzata irregolare

      // ── Falli senza palla ────────────────────────────────────────
      [STAT.FOUL_POSITION]: 0, // Fallo di posizione
      [STAT.FOUL_INVASION]: 0, // Invasione sotto rete

      // Totale falli commessi
      [STAT.TOTAL_FOUL]: 0,

      // ── Cartellini ──────────────────────────────────────────────
      [STAT.CARD_YELLOW]: 0, // Cartellini gialli ricevuti
      [STAT.CARD_RED]: 0,    // Cartellini rossi ricevuti
      [STAT.TOTAL_CARD]: 0,  // Totale cartellini

      // ── Set Point ───────────────────────────────────────────────
      // Palloni giocati durante un set point (proprio o avversario)
      [STAT.TOTAL_SET_POINTS]: 0,
      // Set point convertito: realizzato il punto che chiude il set
      [STAT.SET_POINTS_WIN]: 0,
      // Set point sbagliato: errore sul set point avversario (regalo il set)
      [STAT.SET_POINTS_ERR]: 0,
      // Set point annullato: vinto il punto sul set point avversario
      [STAT.SET_POINTS_CANCELLED]: 0,

      // ── Match Point ─────────────────────────────────────────────
      // Palloni giocati durante un match point (proprio o avversario)
      [STAT.TOTAL_MATCH_POINTS]: 0,
      [STAT.MATCH_POINTS_WIN]: 0,       // Match point convertito
      [STAT.MATCH_POINTS_ERR]: 0,       // Match point sbagliato
      [STAT.MATCH_POINTS_CANCELLED]: 0, // Match point annullato

      // Timeout chiamati (per il giocatore rimane sempre 0, gestito solo a livello squadra)
      [STAT.TOTAL_TIMEOUT]: 0,

      // Sostituzioni: conta sia l'entrata che l'uscita
      [STAT.TOTAL_CHANGE]: 0,

      // Punti giocati: numero di punti in cui il giocatore era in campo
      [STAT.POINTS_PLAYED]: 0,
      // Punti realizzati: punti portati direttamente (attacco vincente, ace, errore avversario)
      [STAT.TOTAL_POINTS]: 0,
    };
  }

  addStat(type) {
    if (type in this.stats) this.stats[type]++;
  }

  toJSON() {
    return {
      id: this.id,
      shirtNumber: this.shirtNumber,
      name: this.name,
      surname: this.surname,
      role: this.role,
      team: this.team,
      libero: this.libero,
      onCourt: this.onCourt,
      stats: { ...this.stats },
    };
  }
}

// ──────────────────────────────────────────────────────────────────
//  Squad
// ──────────────────────────────────────────────────────────────────
export class Squad {
  constructor({ teamId, name, shortName, side }) {
    this.teamId = teamId;
    this.name = name;
    this.shortName = shortName;
    this.side = side; // 'a' | 'b'
    this.players = []; // 6 titolari in ordine di rotazione
    this.bench = []; // panchina
    this.score = 0;
    this.setsWon = 0;
    this.timeout = 0;
    this.servingPlayer = null;
    this.stats = {
      [STAT.TOUCHES]: 0, //palloni toccati durante la partita intera

      // ── Attacco ─────────────────────────────────────────────────
      [STAT.ATTACK_WIN]: 0,        // Kill: attacco che produce direttamente il punto
      [STAT.ATTACK_SUCCESSFUL]: 0, // Attacco positivo: correttamente eseguito ma difeso dall'avversario (che poi ha segnato)
      [STAT.ATTACK_OUT]: 0,        // Attacco errato: fuori o a rete
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0, // Non usato — mantenuto per compatibilità DB
      [STAT.TOTAL_ATTACK]: 0,      // Totale attacchi (win + successful + out + blocked)

      // ── Battuta ─────────────────────────────────────────────────
      [STAT.ACE]: 0,           // Ace: punto diretto in battuta
      [STAT.SERVES]: 0,        // Battuta in campo, non ace, non errore
      [STAT.SERVES_ERR]: 0,    // Errore in battuta: fuori o a rete
      [STAT.SERVES_ERR_LINE]: 0, // Errore sulla linea di fondo (tipo specifico di SERVES_ERR)
      [STAT.TOTAL_SERVES]: 0,  // Totale battute (ace + ok + errori)

      // ── Ricezione da battuta ────────────────────────────────────
      [STAT.RECEIVE_SUCCESSFUL]: 0,     // Ricezione riuscita: un compagno tocca OPPURE palla torna dall'altra parte
      [STAT.RECEIVE_NOT_SUCCESSFUL]: 0, // Ricezione non riuscita: nessun compagno tocca E palla non torna
      [STAT.TOTAL_RECEIVE]: 0,          // Totale ricezioni da battuta

      // ── Difesa da attacco (NON dalla battuta) ───────────────────
      [STAT.DEF_POS]: 0,   // Difesa positiva: pallone controllato
      [STAT.DEF_NEG]: 0,   // Difesa negativa: pallone non controllato (punto all'attaccante)
      [STAT.TOTAL_DEF]: 0, // Totale difese da attacco (def_pos + def_neg)

      // Palla persa: errore generico (passaggio sbagliato, palla non controllata)
      [STAT.BALL_LOST]: 0,

      // ── Muro ────────────────────────────────────────────────────
      [STAT.BLOCK_SUCCESSFUL]: 0,     // Muro vincente: produce il punto (futuro)
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0, // Attaccante murato ma palla rimasta in gioco
      [STAT.TOTAL_BLOCK]: 0,          // Totale muri tentati

      // ── Falli con palla ─────────────────────────────────────────
      [STAT.FOUL_DOUBLE]: 0,       // Doppio fallo
      [STAT.FOUL_FOUR_TOUCHES]: 0, // Quattro tocchi
      [STAT.FOUL_RAISED]: 0,       // Alzata irregolare

      // ── Falli senza palla ────────────────────────────────────────
      [STAT.FOUL_POSITION]: 0, // Fallo di posizione
      [STAT.FOUL_INVASION]: 0, // Invasione

      [STAT.TOTAL_FOUL]: 0, // Totale falli

      // ── Cartellini ──────────────────────────────────────────────
      [STAT.CARD_YELLOW]: 0,
      [STAT.CARD_RED]: 0,
      [STAT.TOTAL_CARD]: 0,

      // ── Set Point ───────────────────────────────────────────────
      [STAT.TOTAL_SET_POINTS]: 0,    // Palloni giocati in set point (proprio o avversario)
      [STAT.SET_POINTS_WIN]: 0,       // Set point convertito
      [STAT.SET_POINTS_ERR]: 0,       // Set point sbagliato
      [STAT.SET_POINTS_CANCELLED]: 0, // Set point avversario annullato

      // ── Match Point ─────────────────────────────────────────────
      [STAT.TOTAL_MATCH_POINTS]: 0,    // Palloni giocati in match point (proprio o avversario)
      [STAT.MATCH_POINTS_WIN]: 0,       // Match point convertito
      [STAT.MATCH_POINTS_ERR]: 0,       // Match point sbagliato
      [STAT.MATCH_POINTS_CANCELLED]: 0, // Match point avversario annullato

      [STAT.TOTAL_TIMEOUT]: 0, // Timeout chiamati dalla squadra
      [STAT.TOTAL_CHANGE]: 0,  // Sostituzioni (entrate + uscite)
    };
  }

  /** Imposta il battitore: sempre players[0] */
  setServingPlayer() {
    this.servingPlayer = this.players[0] ?? null;
  }

  /** Rotazione pallavolo standard: scorrimento ciclico a sinistra (pos2→pos1, pos3→pos2 … pos1→pos6) */
  rotate() {
    if (this.players.length < 6) return;
    this.players = [...this.players.slice(1), this.players[0]];
    this.setServingPlayer();
  }

  /** Cambio giocatore */
  substitute(outPlayer, inPlayer) {
    const idx = this.players.findIndex((p) => p.id === outPlayer.id);
    if (idx === -1)
      throw new Error(`Giocatore ${outPlayer.shirtNumber} non in campo`);
    this.players[idx].onCourt = false;
    inPlayer.onCourt = true;
    this.players[idx] = inPlayer;
    const benchIdx = this.bench.indexOf(inPlayer);
    if (benchIdx !== -1) this.bench.splice(benchIdx, 1, outPlayer);
  }

  addStat(type) {
    //console.log(type);
    if (type in this.stats) {
      this.stats[type]++;
      console.log("aggiunto in squad");
      //console.log(this.stats);
    }
  }

  takeTimeout() {
    if (this.timeout >= 2) return false;
    this.timeout++;
    return true;
  }

  toJSON() {
    return {
      name: this.name,
      shortName: this.shortName,
      side: this.side,
      players: this.players.map((p) => p.toJSON()),
      bench: this.bench.map((p) => p.toJSON()),
      score: this.score,
      setsWon: this.setsWon,
      timeout: this.timeout,
    };
  }
}

// ──────────────────────────────────────────────────────────────────
//  Sset
// ──────────────────────────────────────────────────────────────────
export class Sset {
  constructor(number) {
    this.number = number;
    this.scoreA = 0;
    this.scoreB = 0;
    this.winner = null; // 'a' | 'b' | null
    this.startingLineup = { a: [], b: [] };
    this.stats = {
      players: {}, // playerId → stats snapshot
      squads: { a: this.emptySquadStats(), b: this.emptySquadStats() },
    };
    this.events = [];
  }

  emptySquadStats() {
    return {
      [STAT.TOUCHES]: 0, //palloni toccati durante la partita intera

      // ── Attacco ─────────────────────────────────────────────────
      [STAT.ATTACK_WIN]: 0,        // Kill: attacco che produce direttamente il punto
      [STAT.ATTACK_SUCCESSFUL]: 0, // Attacco positivo: correttamente eseguito ma difeso dall'avversario (che poi ha segnato)
      [STAT.ATTACK_OUT]: 0,        // Attacco errato: fuori o a rete
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0, // Non usato — mantenuto per compatibilità DB
      [STAT.TOTAL_ATTACK]: 0,      // Totale attacchi (win + successful + out + blocked)

      // ── Battuta ─────────────────────────────────────────────────
      [STAT.ACE]: 0,           // Ace: punto diretto in battuta
      [STAT.SERVES]: 0,        // Battuta in campo, non ace, non errore
      [STAT.SERVES_ERR]: 0,    // Errore in battuta: fuori o a rete
      [STAT.SERVES_ERR_LINE]: 0, // Errore sulla linea di fondo (tipo specifico di SERVES_ERR)
      [STAT.TOTAL_SERVES]: 0,  // Totale battute (ace + ok + errori)

      // ── Ricezione da battuta ────────────────────────────────────
      [STAT.RECEIVE_SUCCESSFUL]: 0,     // Ricezione riuscita: un compagno tocca OPPURE palla torna dall'altra parte
      [STAT.RECEIVE_NOT_SUCCESSFUL]: 0, // Ricezione non riuscita: nessun compagno tocca E palla non torna
      [STAT.TOTAL_RECEIVE]: 0,          // Totale ricezioni da battuta

      // ── Difesa da attacco (NON dalla battuta) ───────────────────
      [STAT.DEF_POS]: 0,   // Difesa positiva: pallone controllato
      [STAT.DEF_NEG]: 0,   // Difesa negativa: pallone non controllato (punto all'attaccante)
      [STAT.TOTAL_DEF]: 0, // Totale difese da attacco (def_pos + def_neg)

      // Palla persa: errore generico (passaggio sbagliato, palla non controllata)
      [STAT.BALL_LOST]: 0,

      // ── Muro ────────────────────────────────────────────────────
      [STAT.BLOCK_SUCCESSFUL]: 0,     // Muro vincente: produce il punto (futuro)
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0, // Attaccante murato ma palla rimasta in gioco
      [STAT.TOTAL_BLOCK]: 0,          // Totale muri tentati

      // ── Falli con palla ─────────────────────────────────────────
      [STAT.FOUL_DOUBLE]: 0,       // Doppio fallo
      [STAT.FOUL_FOUR_TOUCHES]: 0, // Quattro tocchi
      [STAT.FOUL_RAISED]: 0,       // Alzata irregolare

      // ── Falli senza palla ────────────────────────────────────────
      [STAT.FOUL_POSITION]: 0, // Fallo di posizione
      [STAT.FOUL_INVASION]: 0, // Invasione

      [STAT.TOTAL_FOUL]: 0, // Totale falli

      // ── Cartellini ──────────────────────────────────────────────
      [STAT.CARD_YELLOW]: 0,
      [STAT.CARD_RED]: 0,
      [STAT.TOTAL_CARD]: 0,

      // ── Set Point ───────────────────────────────────────────────
      [STAT.TOTAL_SET_POINTS]: 0,    // Palloni giocati in set point (proprio o avversario)
      [STAT.SET_POINTS_WIN]: 0,       // Set point convertito
      [STAT.SET_POINTS_ERR]: 0,       // Set point sbagliato
      [STAT.SET_POINTS_CANCELLED]: 0, // Set point avversario annullato

      // ── Match Point ─────────────────────────────────────────────
      [STAT.TOTAL_MATCH_POINTS]: 0,    // Palloni giocati in match point (proprio o avversario)
      [STAT.MATCH_POINTS_WIN]: 0,       // Match point convertito
      [STAT.MATCH_POINTS_ERR]: 0,       // Match point sbagliato
      [STAT.MATCH_POINTS_CANCELLED]: 0, // Match point avversario annullato

      [STAT.TOTAL_TIMEOUT]: 0, // Timeout chiamati dalla squadra
      [STAT.TOTAL_CHANGE]: 0,  // Sostituzioni
    };
  }

  recordPlayerStat(player, key) {
    console.log(player.id);
    console.log(key);
    if (!this.stats.players[player.id]) {
      this.stats.players[player.id] = Object.fromEntries(
        Object.values(STAT).map((k) => [k, 0]),
      );
    }
    this.stats.players[player.id][key] =
      (this.stats.players[player.id][key] ?? 0) + 1;
  }

  recordSquadStat(squad, key) {
    if (key in this.stats.squads[squad.side]) {
      this.stats.squads[squad.side][key]++;
    }
  }

  addStat(type) {
    if (type in this.stats) this.stats[type]++;
  }

  toJSON() {
    return {
      number: this.number,
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      winner: this.winner,
      startingLineup: this.startingLineup,
      stats: this.stats,
      events: this.events,
    };
  }
}

// ──────────────────────────────────────────────────────────────────
//  Match
// ──────────────────────────────────────────────────────────────────
export class Match {
  /**
   * @param {Squad} squadA
   * @param {Squad} squadB
   * @param {object} [format]  - parametri caricati dal DB
   * @param {number} [format.maxSet=5]         - max set della partita (es. 3 o 5)
   * @param {number} [format.setsToWin=3]      - set necessari per vincere
   * @param {number} [format.setPoints=25]     - punti set normale
   * @param {number} [format.tieBreakPoints=15]- punti tiebreak (ultimo set)
   */
  constructor(squadA, squadB, format = {}) {
    this.squadA = squadA;
    this.squadB = squadB;

    this.sets = [];
    this.currentSet = null;
    this.currentSetNumber = 1;
    this.servingSquad = null;

    // Parametri formato partita — caricati dal DB, con fallback ai default FIVB
    this.maxSet = format.maxSet ?? 5;
    this.setsToWin = format.setsToWin ?? 3;
    this.setPoints = format.setPoints ?? 25;
    this.tieBreakPoints = format.tieBreakPoints ?? 15;
    this.changeFieldDone = false;

    this._snapshots = []; // per undo

    /**
     * Stato cross-net per rilevamento automatico attacchi/ricezioni.
     * Resettato alla fine di ogni punto in scorePoint().
     * _lastCrossAttacker : Player | null  — ultimo player che ha mandato il pallone dall'altra parte (non serve)
     * _lastCrossReceiver  : Player | null  — primo player della squadra ricevente dopo l'ultimo cross
     * _touchesOnCurrentSide : number       — tocchi della squadra ricevente dall'ultimo cross (parte da 1)
     */
    this._lastCrossAttacker = null;
    this._lastCrossReceiver  = null;
    this._touchesOnCurrentSide = 0;

    /**
     * Stato per il tracciamento della ricezione da battuta.
     * _serveReceiver       : Player | null  — chi ha ricevuto la battuta
     * _serveReceiveConsumed: boolean        — se receive_successful/not_successful è già stato assegnato
     */
    this._serveReceiver        = null;
    this._serveReceiveConsumed = false;

    /**
     * Stato per il tracciamento del muro.
     * _blockAttacker     : Player | null  — chi ha attaccato (il tocco prima di 'blocked')
     * _blockHandler      : Player | null  — primo player della squadra murante che tocca dopo il blocco
     * _touchesAfterBlock : number         — tocchi della squadra murante dall'ultimo 'blocked'
     * _lastTouchUndo     : Function|null  — funzione che annulla le stat del pushTouch precedente
     */
    this._blockAttacker     = null;
    this._blockHandler      = null;
    this._touchesAfterBlock = 0;
    this._lastTouchUndo     = null;

    /**
     * currentSelectedPlayers — sequenza di tocchi del punto in corso.
     * Formato: [{ playerId, team, type }]
     *   type: 'serve' | 'touch' | 'blocked'
     * Viene resettato a ogni nuovo punto, pre-popolato col battitore,
     * e salvato in history/currentSet.events come touchOfPlayers.
     */
    this.currentSelectedPlayers = [];

    // Callbacks (set da React)
    this._onSetEnd = null;
    this._onMatchEnd = null;
    this._onFieldChange = null;
  }

  /**
   * Aggiunge un tocco all'array del punto in corso.
   * Chiamato da Monitor ogni volta che l'utente seleziona un giocatore.
   * @param {Player} player
   * @param {string} [type='touch']  — 'serve' | 'touch' | 'blocked'
   */
  pushTouch(player, type = "touch") {
    const touches = this.currentSelectedPlayers;
    const ops = []; // accumula le stat applicate, per poterle annullare in _lastTouchUndo

    // Helper: applica stat su tutti e 4 i livelli e registra l'operazione per l'undo
    const apply = (target, stat) => {
      this.addStatPlayer(target, stat);
      this.addStatSquad(target, stat);
      this.addStatSetPlayer(target, stat);
      this.addStatSetSquad(target, stat);
      ops.push({ target, stat });
    };

    // Snapshot dello stato PRIMA delle modifiche — usato da _lastTouchUndo
    const prevState = {
      lastCrossAttacker:    this._lastCrossAttacker,
      lastCrossReceiver:    this._lastCrossReceiver,
      touchesOnCurrentSide: this._touchesOnCurrentSide,
      serveReceiver:        this._serveReceiver,
      serveReceiveConsumed: this._serveReceiveConsumed,
      blockAttacker:        this._blockAttacker,
      blockHandler:         this._blockHandler,
      touchesAfterBlock:    this._touchesAfterBlock,
    };

    if (touches.length > 0) {
      const prev = touches[touches.length - 1];

      if (type === "blocked") {
        // ── MURO ────────────────────────────────────────────────────
        // Il muro è eseguito dalla squadra opposta all'attaccante.
        // Identifichiamo l'attaccante dal tocco precedente e resettiamo
        // lo stato del muro (il block handler sarà il primo tocco successivo).
        // Nessuna stat viene assegnata qui: le stat verranno decise nei casi
        // successivi (scenario 1/2/3) a seconda di come va il punto.
        this._blockAttacker     = this._findPlayerById(prev.playerId);
        this._blockHandler      = null;
        this._touchesAfterBlock = 0;
        this._touchesOnCurrentSide = 1; // il muratore è il primo tocco su questo lato

      } else if (this._blockAttacker != null) {
        // ── BLOCK MODE: tocchi dopo il muro ─────────────────────────
        if (prev.team !== player.team) {
          // Cross-net in block mode (scenario 2): il pallone è tornato nel campo
          // dell'attaccante senza che un secondo giocatore della squadra murante lo toccasse.
          if (this._blockHandler != null) {
            // Muro riuscito: assegna BLOCK_SUCCESSFUL all'handler e ATTACK_NOT_SUCCESSFUL all'attaccante
            apply(this._blockHandler, STAT.BLOCK_SUCCESSFUL);
            apply(this._blockHandler, STAT.TOTAL_BLOCK);
            apply(this._blockAttacker, STAT.ATTACK_NOT_SUCCESSFUL);
            apply(this._blockAttacker, STAT.TOTAL_ATTACK);
            // DEF_POS per il primo ricevitore sull'altro lato
            apply(player, STAT.DEF_POS);
            apply(player, STAT.TOTAL_DEF);
            // Imposta lo stato cross per il gioco successivo (nessun "attaccante" dal muro)
            this._lastCrossAttacker    = null;
            this._lastCrossReceiver    = player;
            this._touchesOnCurrentSide = 1;
          }
          // Pulisci lo stato del muro
          this._blockAttacker     = null;
          this._blockHandler      = null;
          this._touchesAfterBlock = 0;

        } else {
          // Stesso team in block mode
          if (this._blockHandler == null) {
            // Primo tocco dopo il muro → questo è il block handler (chi raccoglie il pallone)
            this._blockHandler      = player;
            this._touchesAfterBlock = 1;
          } else {
            // Secondo tocco stesso team (scenario 3): il muro è riuscito
            apply(this._blockHandler, STAT.BLOCK_SUCCESSFUL);
            apply(this._blockHandler, STAT.TOTAL_BLOCK);
            apply(this._blockAttacker, STAT.ATTACK_NOT_SUCCESSFUL);
            apply(this._blockAttacker, STAT.TOTAL_ATTACK);
            // Pulisci lo stato del muro
            this._blockAttacker     = null;
            this._blockHandler      = null;
            this._touchesAfterBlock = 0;
          }
          this._touchesOnCurrentSide++;
        }

      } else if (prev.team !== player.team) {
        // ── Cross-net normale ────────────────────────────────────────
        // Il cross della battuta (primo cross, da chi serve) non conta come attacco.
        const isServeCross =
          touches[0]?.type === "serve" &&
          touches.every((t) => t.team === prev.team);

        if (!isServeCross) {
          // Se il serve receiver non ha ancora avuto un compagno e il pallone
          // torna dall'altra parte direttamente → receive_successful
          if (this._serveReceiver != null && !this._serveReceiveConsumed) {
            apply(this._serveReceiver, STAT.RECEIVE_SUCCESSFUL);
            apply(this._serveReceiver, STAT.TOTAL_RECEIVE);
            this._serveReceiveConsumed = true;
          }

          // ATTACK_SUCCESSFUL + TOTAL_ATTACK per chi ha mandato il pallone dall'altra parte
          const attacker = this._findPlayerById(prev.playerId);
          if (attacker) {
            apply(attacker, STAT.ATTACK_SUCCESSFUL);
            apply(attacker, STAT.TOTAL_ATTACK);
          }

          // DEF_POS + TOTAL_DEF per il primo player ricevente
          apply(player, STAT.DEF_POS);
          apply(player, STAT.TOTAL_DEF);

          this._lastCrossAttacker    = attacker;
          this._lastCrossReceiver    = player;
          this._touchesOnCurrentSide = 1;
        } else {
          // Cross battuta: registra il ricevitore
          this._lastCrossAttacker    = null;
          this._lastCrossReceiver    = null;
          this._touchesOnCurrentSide = 1;
          this._serveReceiver        = player;
          this._serveReceiveConsumed = false;
        }

      } else {
        // ── Stesso team ─────────────────────────────────────────────
        // Se il serve receiver non ha ancora avuto un compagno e questo è il
        // secondo tocco da parte di un ALTRO giocatore → receive_successful
        if (
          this._serveReceiver != null &&
          !this._serveReceiveConsumed &&
          this._touchesOnCurrentSide === 1 &&
          player.id !== this._serveReceiver.id
        ) {
          apply(this._serveReceiver, STAT.RECEIVE_SUCCESSFUL);
          apply(this._serveReceiver, STAT.TOTAL_RECEIVE);
          this._serveReceiveConsumed = true;
        }
        this._touchesOnCurrentSide++;
      }
    }
    // ── TOUCHES (sempre) ─────────────────────────────────────────────
    apply(player, STAT.TOUCHES);

    // ── Registra la funzione di undo per removeLastTouch ─────────────
    this._lastTouchUndo = () => {
      // Annulla le stat in ordine inverso
      for (let i = ops.length - 1; i >= 0; i--) {
        const { target, stat } = ops[i];
        this.subtractStatPlayer(target, stat);
        this.subtractStatSquad(target, stat);
        this.subtractStatSetPlayer(target, stat);
        this.subtractStatSetSquad(target, stat);
      }
      // Ripristina lo stato
      this._lastCrossAttacker    = prevState.lastCrossAttacker;
      this._lastCrossReceiver    = prevState.lastCrossReceiver;
      this._touchesOnCurrentSide = prevState.touchesOnCurrentSide;
      this._serveReceiver        = prevState.serveReceiver;
      this._serveReceiveConsumed = prevState.serveReceiveConsumed;
      this._blockAttacker        = prevState.blockAttacker;
      this._blockHandler         = prevState.blockHandler;
      this._touchesAfterBlock    = prevState.touchesAfterBlock;
    };

    // ── Push touch ───────────────────────────────────────────────────
    this.currentSelectedPlayers.push({
      playerId: player.id,
      team: player.team,
      type,
    });
  }

  /**
   * Rimuove l'ultimo tocco dall'array del punto in corso e annulla
   * le stat che pushTouch aveva applicato per quel tocco.
   */
  removeLastTouch() {
    this.currentSelectedPlayers.pop();
    if (this._lastTouchUndo) {
      this._lastTouchUndo();
      this._lastTouchUndo = null;
    }
  }

  // ── Init ────────────────────────────────────────────────────────
  startMatch(servingSquad) {
    this.servingSquad = servingSquad;
    this._startNewSet();
    this.assignServe();
    this._snapshot();
  }

  _startNewSet() {
    const set = new Sset(this.currentSetNumber);
    set.startingLineup.a = this.squadA.players.map((p) => p.id);
    set.startingLineup.b = this.squadB.players.map((p) => p.id);
    this.currentSet = set;
    this.sets.push(set);
    this.squadA.score = 0;
    this.squadB.score = 0;
    this.squadA.timeout = 0;
    this.squadB.timeout = 0;
  }

  assignServe() {
    this.squadA.setServingPlayer();
    this.squadB.setServingPlayer();
    // Pre-push del battitore come primo "tocco" del prossimo punto.
    // L'array è già stato resettato in scorePoint(), quindi questo è sempre il primo elemento.
    const server = this.servingSquad?.servingPlayer ?? null;
    if (server) {
      this.currentSelectedPlayers = [
        {
          playerId: server.id,
          team: server.team,
          type: "serve",
        },
      ];

      /*
      //Match
      this.addStatPlayer(server, STAT.TOTAL_SERVES);
      this.addStatSquad(server, STAT.TOTAL_SERVES);

      //Set
      this.addStatSetPlayer(server, STAT.TOTAL_SERVES);
      this.addStatSetSquad(server, STAT.TOTAL_SERVES);
      */
    }
  }

  // ── Set/Match ball check ─────────────────────────────────────────
  _isSetBall(squadScore, opponentScore) {
    const isTieBreak = this.currentSetNumber === this.maxSet;
    const target = isTieBreak ? this.tieBreakPoints : this.setPoints;
    return squadScore >= target - 1 && squadScore - opponentScore >= 1;
  }

  _isMatchBall(squadScore, opponentScore, setsWon) {
    return (
      setsWon === this.setsToWin - 1 &&
      this._isSetBall(squadScore, opponentScore)
    );
  }

  // ── Score a point ───────────────────────────────────────────────
  scorePoint(player, isWin, statType, isAce) {
    const scoringSquad = player.team === "a" ? this.squadA : this.squadB;
    const otherSquad = player.team === "a" ? this.squadB : this.squadA;

    // Salva il server attuale PRIMA di modificare lo stato (serve per il log)
    const serverAtPointStart = this.servingSquad?.servingPlayer ?? null;

    // Punteggi e set vinti PRIMA dell'aggiornamento — per calcolare set/match ball
    const preScoreScoring =
      scoringSquad === this.squadA
        ? (this.currentSet?.scoreA ?? this.squadA.score)
        : (this.currentSet?.scoreB ?? this.squadB.score);
    const preScoreOther =
      otherSquad === this.squadA
        ? (this.currentSet?.scoreA ?? this.squadA.score)
        : (this.currentSet?.scoreB ?? this.squadB.score);
    const preSetsWonScoring = scoringSquad.setsWon;
    const preSetsWonOther = otherSquad.setsWon;

    const setballScoring = this._isSetBall(preScoreScoring, preScoreOther);
    const setballOther = this._isSetBall(preScoreOther, preScoreScoring);
    const matchballScoring = this._isMatchBall(
      preScoreScoring,
      preScoreOther,
      preSetsWonScoring,
    );
    const matchballOther = this._isMatchBall(
      preScoreOther,
      preScoreScoring,
      preSetsWonOther,
    );

    // Posizioni in campo PRIMA di qualsiasi rotazione (= posizioni durante questo punto)
    const courtPositions = {
      a: this.squadA.players.map((p) => p.id),
      b: this.squadB.players.map((p) => p.id),
    };

    const squadWhoWinPoint = isWin ? scoringSquad : otherSquad;

    // Aggiorna stat principale sul giocatore (null = nessuna stat extra, es. scoreDefenseError)
    if (statType != null) {
      this.addStatPlayer(player, statType);
      this.addStatSetPlayer(player, statType);
      this.addStatSquad(player, statType);
      this.addStatSetSquad(player, statType);
    }

    this.addStatPlayer(player, STAT.TOTAL_POINTS);
    this.addStatSetPlayer(player, STAT.TOTAL_POINTS);

    // ── Set point stats ──────────────────────────────────────────
    if (setballScoring || setballOther) {
      this.addStatPlayer(player, STAT.TOTAL_SET_POINTS);
      this.addStatSetPlayer(player, STAT.TOTAL_SET_POINTS);
      this.addStatSquad(player, STAT.TOTAL_SET_POINTS);
      this.addStatSetSquad(player, STAT.TOTAL_SET_POINTS);

      if (setballScoring) {
        const spStat = isWin ? STAT.SET_POINTS_WIN : STAT.SET_POINTS_ERR;
        this.addStatPlayer(player, spStat);
        this.addStatSetPlayer(player, spStat);
        this.addStatSquad(player, spStat);
        this.addStatSetSquad(player, spStat);
      } else {
        // avversario era in set ball, il player ha vinto il punto → annullato
        this.addStatPlayer(player, STAT.SET_POINTS_CANCELLED);
        this.addStatSetPlayer(player, STAT.SET_POINTS_CANCELLED);
        this.addStatSquad(player, STAT.SET_POINTS_CANCELLED);
        this.addStatSetSquad(player, STAT.SET_POINTS_CANCELLED);
      }
    }

    // ── Match point stats ────────────────────────────────────────
    if (matchballScoring || matchballOther) {
      this.addStatPlayer(player, STAT.TOTAL_MATCH_POINTS);
      this.addStatSetPlayer(player, STAT.TOTAL_MATCH_POINTS);
      this.addStatSquad(player, STAT.TOTAL_MATCH_POINTS);
      this.addStatSetSquad(player, STAT.TOTAL_MATCH_POINTS);

      if (matchballScoring) {
        const mpStat = isWin ? STAT.MATCH_POINTS_WIN : STAT.MATCH_POINTS_ERR;
        this.addStatPlayer(player, mpStat);
        this.addStatSetPlayer(player, mpStat);
        this.addStatSquad(player, mpStat);
        this.addStatSetSquad(player, mpStat);
      } else {
        this.addStatPlayer(player, STAT.MATCH_POINTS_CANCELLED);
        this.addStatSetPlayer(player, STAT.MATCH_POINTS_CANCELLED);
        this.addStatSquad(player, STAT.MATCH_POINTS_CANCELLED);
        this.addStatSetSquad(player, STAT.MATCH_POINTS_CANCELLED);
      }
    }

    // ── Ricezione da battuta non riuscita ────────────────────────
    // Se il punto finisce senza che il serve receiver abbia ricevuto aiuto da un
    // compagno né il pallone sia tornato dall'altra parte → receive_not_successful
    if (this._serveReceiver != null && !this._serveReceiveConsumed) {
      this.addStatPlayer(this._serveReceiver, STAT.RECEIVE_NOT_SUCCESSFUL);
      this.addStatSquad(this._serveReceiver, STAT.RECEIVE_NOT_SUCCESSFUL);
      this.addStatSetPlayer(this._serveReceiver, STAT.RECEIVE_NOT_SUCCESSFUL);
      this.addStatSetSquad(this._serveReceiver, STAT.RECEIVE_NOT_SUCCESSFUL);
      this.addStatPlayer(this._serveReceiver, STAT.TOTAL_RECEIVE);
      this.addStatSquad(this._serveReceiver, STAT.TOTAL_RECEIVE);
      this.addStatSetPlayer(this._serveReceiver, STAT.TOTAL_RECEIVE);
      this.addStatSetSquad(this._serveReceiver, STAT.TOTAL_RECEIVE);
    }

    // Reset stato cross-net, ricezione e muro: il punto è finito, il prossimo rally riparte da zero
    this._lastCrossAttacker    = null;
    this._lastCrossReceiver    = null;
    this._touchesOnCurrentSide = 0;
    this._serveReceiver        = null;
    this._serveReceiveConsumed = false;
    this._blockAttacker        = null;
    this._blockHandler         = null;
    this._touchesAfterBlock    = 0;
    this._lastTouchUndo        = null;

    // Cattura i tocchi del punto PRIMA di qualsiasi rotazione/assignServe
    const touchOfPlayers = [...this.currentSelectedPlayers];
    this.currentSelectedPlayers = [];

    if (serverAtPointStart) {
      // TOTAL_SERVES: ogni punto è preceduto da una battuta
      this.addStatPlayer(serverAtPointStart, STAT.TOTAL_SERVES);
      this.addStatSquad(serverAtPointStart, STAT.TOTAL_SERVES);
      this.addStatSetPlayer(serverAtPointStart, STAT.TOTAL_SERVES);
      this.addStatSetSquad(serverAtPointStart, STAT.TOTAL_SERVES);

      // SERVES: battuta non-errore e non-ace (l'ace aggiunge SERVES via ACTION_EXTRA in Monitor)
      if (
        !isAce &&
        statType !== STAT.SERVES_ERR &&
        statType !== STAT.SERVES_ERR_LINE
      ) {
        this.addStatPlayer(serverAtPointStart, STAT.SERVES);
        this.addStatSquad(serverAtPointStart, STAT.SERVES);
        this.addStatSetPlayer(serverAtPointStart, STAT.SERVES);
        this.addStatSetSquad(serverAtPointStart, STAT.SERVES);
      }
    }

    if (isWin) {
      scoringSquad.score++;
      this.currentSet[scoringSquad === this.squadA ? "scoreA" : "scoreB"]++;

      // Cambio battuta se chi ha vinto il punto non stava battendo
      if (this.servingSquad !== scoringSquad) {
        this.servingSquad = scoringSquad;
        scoringSquad.rotate();
      }
    } else {
      // Errore → punto avversario
      otherSquad.score++;
      this.currentSet[otherSquad === this.squadA ? "scoreA" : "scoreB"]++;

      if (this.servingSquad !== otherSquad) {
        this.servingSquad = otherSquad;
        otherSquad.rotate();
      }
    }

    // Pre-popola sempre il battitore del prossimo punto (con o senza rotazione)
    this.assignServe();

    this.squadA.players.forEach((p) => {
      this.addStatPlayer(p, STAT.POINTS_PLAYED);
      this.addStatSetPlayer(p, STAT.POINTS_PLAYED);
    });

    this.squadB.players.forEach((p) => {
      this.addStatPlayer(p, STAT.POINTS_PLAYED);
      this.addStatSetPlayer(p, STAT.POINTS_PLAYED);
    });

    this._pushToEvents({
      type: "point",
      playerId: player.id,
      team: player.team,
      squadWhoWinPoint: squadWhoWinPoint.teamId,
      statType,
      serverPlayerId: serverAtPointStart?.id ?? null,
      serverTeam: serverAtPointStart?.team ?? null,
      isAce: isAce,
      teamA: this.squadA.toJSON(),
      teamB: this.squadB.toJSON(),
      scoreA: this.currentSet?.scoreA ?? this.squadA.score,
      scoreB: this.currentSet?.scoreB ?? this.squadB.score,
      touchOfPlayers,
      courtPositions,
    });
    this._snapshot();
    this._checkSetEnd();
  }

  // ── Card ────────────────────────────────────────────────────────
  assignCard(player, type) {
    this._snapshot();
    const cardStat = type === "red" ? STAT.CARD_RED : STAT.CARD_YELLOW;
    player.addStat(cardStat);
    player.addStat(STAT.TOTAL_CARD);
    this.currentSet.recordPlayerStat(player, cardStat);

    const squad = player.team === "a" ? this.squadA : this.squadB;
    this.currentSet.recordSquadStat(squad, cardStat);

    if (type === "red") {
      // Cartellino rosso → punto avversario + rotazione
      const opponent = player.team === "a" ? this.squadB : this.squadA;
      opponent.score++;
      this.currentSet[opponent === this.squadA ? "scoreA" : "scoreB"]++;
      if (this.servingSquad !== opponent) {
        this.servingSquad = opponent;
        opponent.rotate();
        this.assignServe();
      }
      this._checkSetEnd();
    }
    this._pushToEvents({
      type: "card",
      playerId: player.id,
      team: player.team,
      cardType: type,
      scoreA: this.currentSet?.scoreA ?? this.squadA.score,
      scoreB: this.currentSet?.scoreB ?? this.squadB.score,
    });
  }

  // ── Timeout ─────────────────────────────────────────────────────
  callTimeout(squad) {
    const ok = squad.takeTimeout();
    if (!ok) return false;
    this._snapshot();
    squad.addStat(STAT.TOTAL_TIMEOUT);
    this.currentSet?.recordSquadStat(squad, STAT.TOTAL_TIMEOUT);
    this._pushToEvents({
      type: "timeout",
      team: squad.side,
      timeoutNum: squad.timeout,
      scoreA: this.currentSet?.scoreA ?? this.squadA.score,
      scoreB: this.currentSet?.scoreB ?? this.squadB.score,
    });
    return true;
  }

  // ── Substitute ──────────────────────────────────────────────────
  makeSubstitute(squad, outPlayer, inPlayer) {
    this._snapshot();
    squad.substitute(outPlayer, inPlayer);
    outPlayer.addStat(STAT.TOTAL_CHANGE);
    inPlayer.addStat(STAT.TOTAL_CHANGE);
    this._pushToEvents({
      type: "substitution",
      team: squad.side,
      outId: outPlayer.id,
      inId: inPlayer.id,
      scoreA: this.currentSet?.scoreA ?? this.squadA.score,
      scoreB: this.currentSet?.scoreB ?? this.squadB.score,
    });
  }

  // ── Undo ────────────────────────────────────────────────────────
  undoLastEvent() {
    const events = this.currentSet?.events ?? [];
    if (events.length === 0 || this._snapshots.length < 2) return false;
    this._snapshots.pop();
    this._restoreSnapshot(this._snapshots[this._snapshots.length - 1]);
    const removed = events.pop();
    return removed?.type ?? true;
  }

  // ── Check set end ────────────────────────────────────────────────
  _checkSetEnd() {
    const isTieBreak = this.currentSetNumber === this.maxSet;
    const target = isTieBreak ? this.tieBreakPoints : this.setPoints;

    const sA = this.squadA.score,
      sB = this.squadB.score;
    if (sA >= target && sA - sB >= 2) return this._winSet(this.squadA, sA, sB);
    if (sB >= target && sB - sA >= 2) return this._winSet(this.squadB, sB, sA);

    // 5° set: cambio campo a 8
    if (isTieBreak && !this.changeFieldDone) {
      if (Math.max(sA, sB) >= Math.ceil(this.tieBreakPoints / 2)) {
        this.changeFieldDone = true;
        if (this._onFieldChange) this._onFieldChange();
      }
    }
  }

  _winSet(winner, scoreWinner, scoreLooser) {
    const scoreA = winner === this.squadA ? scoreWinner : scoreLooser;
    const scoreB = winner === this.squadA ? scoreLooser : scoreWinner;

    // Salva punteggio finale del set
    this.currentSet.winner = winner.side;
    this.currentSet.scoreA = scoreA;
    this.currentSet.scoreB = scoreB;

    winner.setsWon++;
    this.currentSetNumber++;
    this.changeFieldDone = false;

    // Notifica UI del set terminato PRIMA di controllare il match
    if (this._onSetEnd) this._onSetEnd(winner, scoreA, scoreB);

    // Controlla fine match
    if (winner.setsWon >= this.setsToWin) {
      if (this._onMatchEnd) this._onMatchEnd(winner);
      return; // non iniziare un nuovo set
    }

    // Il VINCITORE del set batte per primo nel set successivo (regola FIVB)
    this.servingSquad = winner;
    this._startNewSet();
    this.assignServe();
    this._snapshot();
  }

  // ── Snapshot ─────────────────────────────────────────────────────
  _snapshot() {
    const snap = {
      scoreA: this.squadA.score,
      scoreB: this.squadB.score,
      setsWonA: this.squadA.setsWon,
      setsWonB: this.squadB.setsWon,
      timeoutA: this.squadA.timeout,
      timeoutB: this.squadB.timeout,
      setNumber: this.currentSetNumber,
      servingSide: this.servingSquad?.side ?? "a",
      playersA: this.squadA.players.map((p) => p.id),
      playersB: this.squadB.players.map((p) => p.id),
      playersBA: this.squadA.bench.map((p) => p.id),
      playersBB: this.squadB.bench.map((p) => p.id),
      statsA: this.squadA.players.map((p) => ({ ...p.stats })),
      statsB: this.squadB.players.map((p) => ({ ...p.stats })),
      statsBA: this.squadA.bench.map((p) => ({ ...p.stats })),
      statsBB: this.squadB.bench.map((p) => ({ ...p.stats })),
      squadStatsA: { ...this.squadA.stats },
      squadStatsB: { ...this.squadB.stats },
      setPlayerStats: Object.fromEntries(
        Object.entries(this.currentSet?.stats?.players ?? {}).map(([id, s]) => [
          id,
          { ...s },
        ]),
      ),
      setSquadStatsA: { ...(this.currentSet?.stats?.squads?.a ?? {}) },
      setSquadStatsB: { ...(this.currentSet?.stats?.squads?.b ?? {}) },
      setScoreA: this.currentSet?.scoreA ?? 0,
      setScoreB: this.currentSet?.scoreB ?? 0,
    };
    this._snapshots.push(snap);
    // Mantieni massimo 50 snapshot per non consumare troppa memoria
    if (this._snapshots.length > 50) this._snapshots.shift();
  }

  _restoreSnapshot(snap) {
    this.squadA.score = snap.scoreA;
    this.squadB.score = snap.scoreB;
    this.squadA.setsWon = snap.setsWonA;
    this.squadB.setsWon = snap.setsWonB;
    this.squadA.timeout = snap.timeoutA;
    this.squadB.timeout = snap.timeoutB;
    this.currentSetNumber = snap.setNumber;

    //console.log(snap);

    this.servingSquad = snap.servingSide === "a" ? this.squadA : this.squadB;

    // Ripristina ordine rotazione campo E panchina
    const reorderPlayers = (squad, ids, benchIds, snapStats, benchStats) => {
      const allPlayers = [...squad.players, ...squad.bench];
      const map = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

      // Ripristina giocatori in campo con le loro stats
      squad.players = ids
        .map((id, i) => {
          const p = map[id];
          if (p && snapStats[i]) p.stats = { ...snapStats[i] };
          return p;
        })
        .filter(Boolean);

      // Ripristina panchina: ordine dagli ID salvati + stats
      squad.bench = benchIds
        .map((id, i) => {
          const p = map[id];
          if (p && benchStats[i]) p.stats = { ...benchStats[i] };
          return p;
        })
        .filter(Boolean);
    };

    reorderPlayers(
      this.squadA,
      snap.playersA,
      snap.playersBA,
      snap.statsA,
      snap.statsBA,
    );
    reorderPlayers(
      this.squadB,
      snap.playersB,
      snap.playersBB,
      snap.statsB,
      snap.statsBB,
    );

    this.squadA.setServingPlayer();
    this.squadB.setServingPlayer();

    this.squadA.stats = { ...snap.squadStatsA };
    this.squadB.stats = { ...snap.squadStatsB };

    if (this.currentSet) {
      this.currentSet.scoreA = snap.setScoreA;
      this.currentSet.scoreB = snap.setScoreB;
      this.currentSet.stats.players = Object.fromEntries(
        Object.entries(snap.setPlayerStats).map(([id, s]) => [id, { ...s }]),
      );
      this.currentSet.stats.squads.a = { ...snap.setSquadStatsA };
      this.currentSet.stats.squads.b = { ...snap.setSquadStatsB };
    }
  }

  _pushToEvents(event) {
    this.currentSet.events.push({ ...event, timestamp: Date.now() });
  }

  // ── Stat helpers ─────────────────────────────────────────────────
  addStatPlayer(player, type) {
    player.addStat(type);
  }

  addStatSquad(player, type) {
    const squad = player.team === "a" ? this.squadA : this.squadB;
    squad.addStat(type);
  }

  addStatSetPlayer(player, type) {
    this.currentSet?.recordPlayerStat(player, type);
  }

  addStatSetSquad(player, type) {
    const squad = player.team === "a" ? this.squadA : this.squadB;
    this.currentSet?.recordSquadStat(squad, type);
  }

  /** Decrementa una statistica di un player (minimo 0) */
  subtractStatPlayer(player, type) {
    if (type in player.stats && player.stats[type] > 0) player.stats[type]--;
  }

  /** Decrementa una statistica della squadra del player (minimo 0) */
  subtractStatSquad(player, type) {
    const squad = player.team === "a" ? this.squadA : this.squadB;
    if (type in squad.stats && squad.stats[type] > 0) squad.stats[type]--;
  }

  /** Decrementa una statistica di set del player (minimo 0) */
  subtractStatSetPlayer(player, type) {
    const val = this.currentSet?.stats?.players?.[player.id]?.[type];
    if (val > 0) this.currentSet.stats.players[player.id][type]--;
  }

  /** Decrementa una statistica di set della squadra del player (minimo 0) */
  subtractStatSetSquad(player, type) {
    const stats = this.currentSet?.stats?.squads?.[player.team];
    if (stats && stats[type] > 0) stats[type]--;
  }

  /** Trova un Player in campo o in panchina dato il suo id */
  _findPlayerById(id) {
    const all = [
      ...this.squadA.players, ...this.squadA.bench,
      ...this.squadB.players, ...this.squadB.bench,
    ];
    return all.find((p) => p.id === id) ?? null;
  }

  /**
   * Scenario 1 difesa fallita: il primo ricevitore non è riuscito a tenere
   * il pallone in gioco (LOST_BALL sul primo tocco del team ricevente).
   *
   * Conversioni:
   *   attacker: ATTACK_SUCCESSFUL → ATTACK_WIN  (TOTAL_ATTACK rimane)
   *   receiver: DEF_POS → DEF_NEG               (TOTAL_RECEIVE rimane)
   *
   * Il punto viene assegnato alla squadra dell'attaccante; nessuna stat
   * "BALL_LOST" viene aggiunta (è una difesa fallita, non una palla persa).
   */
  scoreDefenseError(receiver, attacker) {
    // Converti attacker: ATTACK_SUCCESSFUL → ATTACK_WIN
    this.subtractStatPlayer(attacker, STAT.ATTACK_SUCCESSFUL);
    this.subtractStatSquad(attacker, STAT.ATTACK_SUCCESSFUL);
    this.subtractStatSetPlayer(attacker, STAT.ATTACK_SUCCESSFUL);
    this.subtractStatSetSquad(attacker, STAT.ATTACK_SUCCESSFUL);

    this.addStatPlayer(attacker, STAT.ATTACK_WIN);
    this.addStatSquad(attacker, STAT.ATTACK_WIN);
    this.addStatSetPlayer(attacker, STAT.ATTACK_WIN);
    this.addStatSetSquad(attacker, STAT.ATTACK_WIN);

    // Converti receiver: DEF_POS → DEF_NEG
    this.subtractStatPlayer(receiver, STAT.DEF_POS);
    this.subtractStatSquad(receiver, STAT.DEF_POS);
    this.subtractStatSetPlayer(receiver, STAT.DEF_POS);
    this.subtractStatSetSquad(receiver, STAT.DEF_POS);

    this.addStatPlayer(receiver, STAT.DEF_NEG);
    this.addStatSquad(receiver, STAT.DEF_NEG);
    this.addStatSetPlayer(receiver, STAT.DEF_NEG);
    this.addStatSetSquad(receiver, STAT.DEF_NEG);

    // Segna il punto per la squadra dell'attaccante.
    // statType = null → scorePoint non aggiunge nessuna stat extra.
    this.scorePoint(receiver, false, null, false);
  }

  /**
   * Scenario 1 muro: il block handler raccoglie il pallone ma non riesce a
   * tenerlo in gioco (LOST_BALL sul primo tocco dopo il muro).
   *
   * Assegnazioni:
   *   _blockHandler  : BLOCK_NOT_SUCCESSFUL + TOTAL_BLOCK  (muro non vincente)
   *   _blockAttacker : ATTACK_WIN + TOTAL_ATTACK           (kill: l'attacco ha prodotto il punto)
   *
   * Il punto va alla squadra dell'attaccante (_blockAttacker).
   * statType = null → scorePoint non aggiunge nessuna stat extra.
   */
  scoreBlockFail(losingPlayer) {
    const handler  = this._blockHandler;
    const attacker = this._blockAttacker;

    if (handler) {
      this.addStatPlayer(handler, STAT.BLOCK_NOT_SUCCESSFUL);
      this.addStatSquad(handler, STAT.BLOCK_NOT_SUCCESSFUL);
      this.addStatSetPlayer(handler, STAT.BLOCK_NOT_SUCCESSFUL);
      this.addStatSetSquad(handler, STAT.BLOCK_NOT_SUCCESSFUL);

      this.addStatPlayer(handler, STAT.TOTAL_BLOCK);
      this.addStatSquad(handler, STAT.TOTAL_BLOCK);
      this.addStatSetPlayer(handler, STAT.TOTAL_BLOCK);
      this.addStatSetSquad(handler, STAT.TOTAL_BLOCK);
    }

    if (attacker) {
      this.addStatPlayer(attacker, STAT.ATTACK_WIN);
      this.addStatSquad(attacker, STAT.ATTACK_WIN);
      this.addStatSetPlayer(attacker, STAT.ATTACK_WIN);
      this.addStatSetSquad(attacker, STAT.ATTACK_WIN);

      this.addStatPlayer(attacker, STAT.TOTAL_ATTACK);
      this.addStatSquad(attacker, STAT.TOTAL_ATTACK);
      this.addStatSetPlayer(attacker, STAT.TOTAL_ATTACK);
      this.addStatSetSquad(attacker, STAT.TOTAL_ATTACK);
    }

    // Segna il punto per la squadra dell'attaccante (losingPlayer perde il punto).
    // statType = null → scorePoint non aggiunge nessuna stat extra.
    this.scorePoint(losingPlayer, false, null, false);
  }

  // ── Serializzazione localStorage ─────────────────────────────────
  serialize() {
    const serializePlayer = (p) => ({
      id: p.id,
      shirtNumber: p.shirtNumber,
      name: p.name,
      surname: p.surname,
      role: p.role,
      team: p.team,
      libero: p.libero,
      onCourt: p.onCourt,
      stats: { ...p.stats },
    });

    const serializeSquad = (sq) => ({
      teamId: sq.teamId,
      name: sq.name,
      shortName: sq.shortName,
      side: sq.side,
      score: sq.score,
      setsWon: sq.setsWon,
      timeout: sq.timeout,
      stats: { ...sq.stats },
      players: sq.players.map(serializePlayer),
      bench: sq.bench.map(serializePlayer),
    });

    return {
      format: {
        maxSet: this.maxSet,
        setsToWin: this.setsToWin,
        setPoints: this.setPoints,
        tieBreakPoints: this.tieBreakPoints,
      },
      squadA: serializeSquad(this.squadA),
      squadB: serializeSquad(this.squadB),
      sets: this.sets.map((s) => ({
        number: s.number,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        winner: s.winner,
        startingLineup: s.startingLineup,
        events: [...s.events],
        stats: {
          players: { ...s.stats.players },
          squads: {
            a: { ...s.stats.squads.a },
            b: { ...s.stats.squads.b },
          },
        },
      })),
      currentSetNumber: this.currentSetNumber,
      servingSide: this.servingSquad?.side ?? "a",
      changeFieldDone: this.changeFieldDone,
      snapshots: this._snapshots,
    };
  }

  static deserialize(data) {
    const makePlayer = (pd) => {
      const p = new Player({
        id: pd.id,
        shirtNumber: pd.shirtNumber,
        name: pd.name,
        surname: pd.surname,
        role: pd.role,
        team: pd.team,
        libero: pd.libero,
      });
      p.onCourt = pd.onCourt;
      // Unisce i default del costruttore con i dati salvati:
      // le chiavi aggiunte in versioni successive vengono inizializzate a 0
      // invece di mancare del tutto (il che farebbe silently skip l'addStat).
      p.stats = { ...p.stats, ...pd.stats };
      return p;
    };

    const makeSquad = (sd) => {
      const sq = new Squad({
        teamId: sd.teamId,
        name: sd.name,
        shortName: sd.shortName,
        side: sd.side,
      });
      sq.score = sd.score;
      sq.setsWon = sd.setsWon;
      sq.timeout = sd.timeout;
      sq.stats = { ...sq.stats, ...sd.stats };
      sq.players = sd.players.map(makePlayer);
      sq.bench = sd.bench.map(makePlayer);
      sq.setServingPlayer();
      return sq;
    };

    const squadA = makeSquad(data.squadA);
    const squadB = makeSquad(data.squadB);
    const match = new Match(squadA, squadB, data.format);

    match.sets = data.sets.map((sd) => {
      const s = new Sset(sd.number);
      s.scoreA = sd.scoreA;
      s.scoreB = sd.scoreB;
      s.winner = sd.winner;
      s.startingLineup = sd.startingLineup ?? { a: [], b: [] };
      s.events = [...sd.events];
      s.stats.players = { ...sd.stats.players };
      const emptySquad = s.emptySquadStats();
      s.stats.squads.a = { ...emptySquad, ...(sd.stats.squads.a ?? {}) };
      s.stats.squads.b = { ...emptySquad, ...(sd.stats.squads.b ?? {}) };
      return s;
    });

    match.currentSetNumber = data.currentSetNumber;
    match.currentSet = match.sets[match.sets.length - 1] ?? null;
    match.servingSquad = data.servingSide === "a" ? squadA : squadB;
    match.changeFieldDone = data.changeFieldDone ?? false;
    match._snapshots = data.snapshots ?? [];

    return match;
  }

  // ── Export per il DB ─────────────────────────────────────────────
  toSavePayload(matchMeta) {
    const homeTeamId = matchMeta?.home_team_id ?? this.squadA.teamId;
    const awayTeamId = matchMeta?.away_team_id ?? this.squadB.teamId;

    console.log(this);

    const completedSets = this.sets
      .filter((s) => s.winner !== null)
      .map((s) => ({
        number: s.number,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        winnerTeamId: s.winner === "a" ? homeTeamId : awayTeamId,
        stats: s.stats,
        events: s.events,
      }));

    // Includi il set corrente se ha punti (salvataggio parziale)
    const cur = this.currentSet;
    if (
      cur &&
      cur.winner === null &&
      (this.squadA.score > 0 || this.squadB.score > 0)
    ) {
      completedSets.push({
        number: cur.number,
        scoreA: this.squadA.score,
        scoreB: this.squadB.score,
        winnerTeamId: null,
        stats: cur.stats,
        events: cur.events,
      });
    }

    const homeTotalPts = completedSets.reduce((s, x) => s + (x.scoreA ?? 0), 0);
    const awayTotalPts = completedSets.reduce((s, x) => s + (x.scoreB ?? 0), 0);

    const players = [
      ...this.squadA.players.map((p) => ({
        playerId: p.id,
        teamId: homeTeamId,
        isHome: true,
        stats: p.stats,
      })),
      ...this.squadA.bench.map((p) => ({
        playerId: p.id,
        teamId: homeTeamId,
        isHome: true,
        stats: p.stats,
      })),
      ...this.squadB.players.map((p) => ({
        playerId: p.id,
        teamId: awayTeamId,
        isHome: false,
        stats: p.stats,
      })),
      ...this.squadB.bench.map((p) => ({
        playerId: p.id,
        teamId: awayTeamId,
        isHome: false,
        stats: p.stats,
      })),
    ].filter((p) => p.playerId != null);

    return {
      homeTeamId,
      awayTeamId,
      setsWonHome: this.squadA.setsWon,
      setsWonAway: this.squadB.setsWon,
      homeTotalPts,
      awayTotalPts,
      sets: completedSets,
      players,
    };
  }
}
