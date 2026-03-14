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

      //Attack
      [STAT.ATTACK_WIN]: 0, //attacchi vinti
      [STAT.ATTACK_OUT]: 0, //attacchi sbagliati (solo fuori)
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_ATTACK]: 0, // attacchi totali fatti nella partita

      //Serve
      [STAT.ACE]: 0, //ace totali
      [STAT.SERVES]: 0,
      [STAT.SERVES_ERR]: 0, //errori totali in battuta
      [STAT.SERVES_ERR_LINE]: 0, //da capire come fare mai gestita
      [STAT.TOTAL_SERVES]: 0, //battute totali

      //Ricezione
      [STAT.DEF_POS]: 0, //ricezioni corrette mai gestita
      [STAT.DEF_NEG]: 0, //ricezioni sbagliate mai gestita
      [STAT.TOTAL_RECEIVE]: 0,

      //Lost Ball
      [STAT.BALL_LOST]: 0, //palle perse o passaggi sbagliati

      [STAT.BLOCK_SUCCESSFUL]: 0,
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_BLOCK]: 0,

      //Foul WB
      [STAT.FOUL_DOUBLE]: 0, //doppe
      [STAT.FOUL_FOUR_TOUCHES]: 0, //4 tocchi
      [STAT.FOUL_RAISED]: 0, //sollevata

      //Foul WOB
      [STAT.FOUL_POSITION]: 0, //fallo di posizione
      [STAT.FOUL_INVASION]: 0, //fallo di invasione

      [STAT.TOTAL_FOUL]: 0,

      //Card
      [STAT.CARD_YELLOW]: 0, //cartellini gialli
      [STAT.CARD_RED]: 0, //cartelini rossi

      [STAT.TOTAL_CARD]: 0,

      //Set Point
      [STAT.TOTAL_SET_POINTS]: 0,
      [STAT.SET_POINTS_WIN]: 0,
      [STAT.SET_POINTS_ERR]: 0,
      [STAT.SET_POINTS_CANCELLED]: 0,

      //Match Point
      [STAT.TOTAL_MATCH_POINTS]: 0,
      [STAT.MATCH_POINTS_WIN]: 0,
      [STAT.MATCH_POINTS_ERR]: 0,
      [STAT.MATCH_POINTS_CANCELLED]: 0,

      [STAT.TOTAL_TIMEOUT]: 0,

      //Change
      [STAT.TOTAL_CHANGE]: 0,

      [STAT.POINTS_PLAYED]: 0,
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

      //Attack
      [STAT.ATTACK_WIN]: 0, //attacchi vinti
      [STAT.ATTACK_OUT]: 0, //attacchi sbagliati (solo fuori)
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_ATTACK]: 0, // attacchi totali fatti nella partita

      //Serve
      [STAT.ACE]: 0, //ace totali
      [STAT.SERVES]: 0,
      [STAT.SERVES_ERR]: 0, //errori totali in battuta
      [STAT.SERVES_ERR_LINE]: 0, //da capire come fare mai gestita
      [STAT.TOTAL_SERVES]: 0, //battute totali

      //Ricezione
      [STAT.DEF_POS]: 0, //ricezioni corrette mai gestita
      [STAT.DEF_NEG]: 0, //ricezioni sbagliate mai gestita
      [STAT.TOTAL_RECEIVE]: 0,

      //Lost Ball
      [STAT.BALL_LOST]: 0, //palle perse o passaggi sbagliati

      [STAT.BLOCK_SUCCESSFUL]: 0,
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_BLOCK]: 0,

      //Foul WB
      [STAT.FOUL_DOUBLE]: 0, //doppe
      [STAT.FOUL_FOUR_TOUCHES]: 0, //4 tocchi
      [STAT.FOUL_RAISED]: 0, //sollevata

      //Foul WOB
      [STAT.FOUL_POSITION]: 0, //fallo di posizione
      [STAT.FOUL_INVASION]: 0, //fallo di invasione

      [STAT.TOTAL_FOUL]: 0,

      //Card
      [STAT.CARD_YELLOW]: 0, //cartellini gialli
      [STAT.CARD_RED]: 0, //cartelini rossi

      [STAT.TOTAL_CARD]: 0,

      //Set Point
      [STAT.TOTAL_SET_POINTS]: 0,
      [STAT.SET_POINTS_WIN]: 0,
      [STAT.SET_POINTS_ERR]: 0,
      [STAT.SET_POINTS_CANCELLED]: 0,

      //Match Point
      [STAT.TOTAL_MATCH_POINTS]: 0,
      [STAT.MATCH_POINTS_WIN]: 0,
      [STAT.MATCH_POINTS_ERR]: 0,
      [STAT.MATCH_POINTS_CANCELLED]: 0,

      [STAT.TOTAL_TIMEOUT]: 0,

      //Change
      [STAT.TOTAL_CHANGE]: 0,
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
    /* squad-level stats opzionali, reserved */
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

      //Attack
      [STAT.ATTACK_WIN]: 0, //attacchi vinti
      [STAT.ATTACK_OUT]: 0, //attacchi sbagliati (solo fuori)
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_ATTACK]: 0, // attacchi totali fatti nella partita

      //Serve
      [STAT.ACE]: 0, //ace totali
      [STAT.SERVES]: 0,
      [STAT.SERVES_ERR]: 0, //errori totali in battuta
      [STAT.SERVES_ERR_LINE]: 0, //da capire come fare mai gestita
      [STAT.TOTAL_SERVES]: 0, //battute totali

      //Ricezione
      [STAT.DEF_POS]: 0, //ricezioni corrette mai gestita
      [STAT.DEF_NEG]: 0, //ricezioni sbagliate mai gestita
      [STAT.TOTAL_RECEIVE]: 0,

      //Lost Ball
      [STAT.BALL_LOST]: 0, //palle perse o passaggi sbagliati

      //Block
      [STAT.BLOCK_SUCCESSFUL]: 0,
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_BLOCK]: 0,

      //Foul WB
      [STAT.FOUL_DOUBLE]: 0, //doppe
      [STAT.FOUL_FOUR_TOUCHES]: 0, //4 tocchi
      [STAT.FOUL_RAISED]: 0, //sollevata

      //Foul WOB
      [STAT.FOUL_POSITION]: 0, //fallo di posizione
      [STAT.FOUL_INVASION]: 0, //fallo di invasione

      [STAT.TOTAL_FOUL]: 0,

      //Card
      [STAT.CARD_YELLOW]: 0, //cartellini gialli
      [STAT.CARD_RED]: 0, //cartelini rossi

      [STAT.TOTAL_CARD]: 0,

      //Set Point
      [STAT.TOTAL_SET_POINTS]: 0,
      [STAT.SET_POINTS_WIN]: 0,
      [STAT.SET_POINTS_ERR]: 0,
      [STAT.SET_POINTS_CANCELLED]: 0,

      //Match Point
      [STAT.TOTAL_MATCH_POINTS]: 0,
      [STAT.MATCH_POINTS_WIN]: 0,
      [STAT.MATCH_POINTS_ERR]: 0,
      [STAT.MATCH_POINTS_CANCELLED]: 0,

      //Timeout
      [STAT.TOTAL_TIMEOUT]: 0,

      //Change
      [STAT.TOTAL_CHANGE]: 0,
    };
  }

  recordPlayerStat(player, key) {
    if (!this.stats.players[player.id]) {
      this.stats.players[player.id] = Object.fromEntries(
        Object.values(STAT).map((k) => [k, 0]),
      );
    }
    this.stats.players[player.id][key] =
      (this.stats.players[player.id][key] ?? 0) + 1;
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

    this.history = [];
    this._snapshots = []; // per undo

    /**
     * currentSelectedPlayers — sequenza di tocchi del punto in corso.
     * Formato: [{ playerId, team, type }]
     *   type: 'serve' | 'touch'
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
   * @param {string} [type='touch']
   */
  pushTouch(player, type = "touch") {
    this.currentSelectedPlayers.push({
      playerId: player.id,
      team: player.team,
      type,
    });
  }

  /**
   * Rimuove un tocco all'array del punto in corso.
   * Chiamato da Monitor ogni volta che l'utente seleziona un giocatore.
   */
  removeLastTouch() {
    this.currentSelectedPlayers.pop();
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
    }
  }

  // ── Score a point ───────────────────────────────────────────────
  scorePoint(player, isWin, statType, isAce) {
    this._snapshot();

    const scoringSquad = player.team === "a" ? this.squadA : this.squadB;
    const otherSquad = player.team === "a" ? this.squadB : this.squadA;

    // Salva il server attuale PRIMA di modificare lo stato (serve per il log)
    const serverAtPointStart = this.servingSquad?.servingPlayer ?? null;

    const squadWhoWinPoint = isWin ? scoringSquad : otherSquad;
    // Aggiorna stat sul giocatore
    player.addStat(statType);
    player.addStat(STAT.POINTS_PLAYED);
    this.currentSet.recordPlayerStat(player, statType);

    if (isWin) {
      scoringSquad.score++;
      this.currentSet[scoringSquad === this.squadA ? "scoreA" : "scoreB"]++;

      // Cambio battuta se chi ha vinto il punto non stava battendo
      if (this.servingSquad !== scoringSquad) {
        this.servingSquad = scoringSquad;
        scoringSquad.rotate();
        this.assignServe();
      }
    } else {
      // Errore → punto avversario
      otherSquad.score++;
      this.currentSet[otherSquad === this.squadA ? "scoreA" : "scoreB"]++;

      if (this.servingSquad !== otherSquad) {
        this.servingSquad = otherSquad;
        otherSquad.rotate();
        this.assignServe();
      }
    }

    // Snapshot touchOfPlayers per il log, poi reset per il prossimo punto
    console.log(this.currentSelectedPlayers);
    const touchOfPlayers = [...this.currentSelectedPlayers];
    this.currentSelectedPlayers = [];

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
      touchOfPlayers,
    });

    console.log(this.currentSet.events);

    this._logEvent({
      type: "point",
      playerId: player.id,
      team: player.team,
      isWin,
      statType,
      serverPlayerId: serverAtPointStart?.id ?? null,
      serverTeam: serverAtPointStart?.team ?? null,
      teamA: this.squadA.toJSON(),
      teamB: this.squadB.toJSON(),
      touchOfPlayers,
    });
    this._checkSetEnd();
  }

  // ── Card ────────────────────────────────────────────────────────
  assignCard(player, type) {
    this._snapshot();
    const cardStat = type === "red" ? STAT.CARD_RED : STAT.CARD_YELLOW;
    player.addStat(cardStat);
    player.addStat(STAT.TOTAL_CARD);
    this.currentSet.recordPlayerStat(player, cardStat);

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
    this._logEvent({ type: "card", playerId: player.id, cardType: type });
  }

  // ── Timeout ─────────────────────────────────────────────────────
  callTimeout(squad) {
    return squad.takeTimeout();
  }

  // ── Substitute ──────────────────────────────────────────────────
  makeSubstitute(squad, outPlayer, inPlayer) {
    this._snapshot();
    squad.substitute(outPlayer, inPlayer);
    outPlayer.addStat(STAT.TOTAL_CHANGE);
    inPlayer.addStat(STAT.TOTAL_CHANGE);
    this._logEvent({
      type: "sub",
      team: squad.side,
      outId: outPlayer.id,
      inId: inPlayer.id,
    });
  }

  // ── Undo ────────────────────────────────────────────────────────
  undoLastPoint() {
    if (this._snapshots.length < 2) return false;
    this._snapshots.pop();
    this._restoreSnapshot(this._snapshots[this._snapshots.length - 1]);
    this.history.pop();
    return true;
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

    console.log(snap);

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

    if (this.currentSet) {
      this.currentSet.scoreA = snap.setScoreA;
      this.currentSet.scoreB = snap.setScoreB;
    }
  }

  _logEvent(event) {
    this.history.push({ ...event, timestamp: Date.now() });

    //console.log(this.history);
  }

  _pushToEvents(event) {
    this.currentSet.events.push({ ...event, timestamp: Date.now() });
  }

  // ── Stat helpers ─────────────────────────────────────────────────
  addStatPlayer(player, type) {
    player.addStat(type);
  }
  addStatSet(player, type) {
    this.currentSet?.recordPlayerStat(player, type);
  }

  // ── Export per il DB ─────────────────────────────────────────────
  toSavePayload(matchMeta) {
    const homeTeamId = matchMeta?.home_team_id ?? this.squadA.teamId;
    const awayTeamId = matchMeta?.away_team_id ?? this.squadB.teamId;

    const completedSets = this.sets
      .filter((s) => s.winner !== null)
      .map((s) => ({
        number: s.number,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        winnerTeamId: s.winner === "a" ? homeTeamId : awayTeamId,
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
