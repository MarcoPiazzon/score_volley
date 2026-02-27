import Squad from "./squad.js";

import Sset from "./set.js"; // ❌ se il file è Squad.js
import { STAT, STAT_EVENT } from "../enums.js";

import {
  onCourtClickHandler,
  onSubClickHandler,
  updateCourtDOM,
  updateBenchDOM,
  assignStats,
} from "../utils.js";

export default class Match {
  constructor(squadA, squadB, isFromJSON) {
    //squadA == match_json
    /*if (Array.isArray(JSON)) {
      alert("squadA is Json");
    } else alert("suad is not json");
*/
    this.squadA = squadA;
    this.squadB = squadB;
    this.inizialBallSide = "left";
    this.currentSetNumber = 1;

    if (isFromJSON) {
      this.domByPlayer = new Map();
    }

    if (!isFromJSON) {
      this.sets = [];
      this.currentSet = null; //lo faccio nello script
    }
    this.players_map = new Map();
    this.selectedPlayer = null;
    this.selectedOutPlayer = null;
    this.changeMode = false;

    //for stats
    this.lastPlayer = null;
    this.isOnBlock = false;

    //rules
    this.maxSet = 5;
    this.setsToWin = 3;
    this.setPoints = 25;
    this.tieBreakPoints = 15;
    this.changeFieldMaxSet = true; //se true ancora da fare, se false già fatto

    this.servingSquad = null;
    this.currentSelectedPlayers = new Array(); //array di Player

    this.history = []; // questo segna tutto come events (punti,card,sub,timeout)
    this.undoHistory = []; //per ora SOLO con i punti
    this.cardMode = null; //per modalità cartellino
  }

  static fromJSON(json) {
    console.log(json.squadA);
    const squadA = Squad.fromJSON(json.squadA);
    const squadB = Squad.fromJSON(json.squadB);

    const match = new Match(squadA, squadB, true);

    match.currentSetNumber = 1;

    //DA FARE
    let newSets = [];

    json.sets.forEach((s) => {
      newSets.push(Sset.fromJSON(s));
    });
    match.sets = newSets;

    //match.currentSet = json.startNewSet();
    console.log(json.players_map);
    match.players_map = new Map();
    match.selectedPlayer = null;
    //match.selectedOutPlayer = match.selectedOutPlayer;
    //match.changeMode = json.changeMode;

    //rules
    match.maxSet = json.maxSet;
    match.setsToWin = json.setsToWin;
    match.setPoints = json.setPoints;
    match.tieBreakPoints = json.tieBreakPoints;
    match.changeFieldMaxSet = json.changeFieldMaxSet; //se true ancora da fare, se false già fatto

    match.servingSquad = null;
    match.currentSelectedPlayers = new Array(); //array di Player

    match.history = { ...json.history }; // questo segna tutto come events (punti,card,sub,timeout)
    match.undoHistory = { ...json.undoHistory }; //per ora SOLO con i punti
    match.cardMode = match.cardMode; //per modalità cartellino

    return match;
  }

  checkIfIsMatchPoint() {
    const target = this.setPoints - 1;

    if (
      this.squadA.score >= target &&
      this.squadA.score - this.squadB.score >= 1
    )
      this.assignMatchPointStat(this.squadA, player, value);

    if (
      this.squadB.score >= target &&
      this.squadB.score - this.squadA.score >= 1
    ) {
      this.assignMatchPointStat(this.squadA, player, value);
    }
  }

  checkIfIsSetOrMatchPoint(player, value) {
    const target = this.setPoints - 1;

    if (
      this.squadA.score >= target &&
      this.squadA.score - this.squadB.score >= 1 &&
      this.squadA.setsWon === this.setsToWin - 1
    )
      this.assignMatchPointStat(this.squadA, player, value);
    else this.assignSetPointStat(this.squadA, player, value);

    if (
      this.squadB.score >= target &&
      this.squadB.score - this.squadA.score >= 1 &&
      this.squadB.setsWon === this.setsToWin - 1
    )
      this.assignMatchPointStat(this.squadB, player, value);
    else this.assignSetPointStat(this.squadB, player, value);
  }

  /**
   *
   * @param {*} squad la squadra che è a 24
   */
  assignSetPointStat(squad, player, value) {
    const opponent = squad === this.squadA ? this.squadB : this.squadA;

    //Se il player che ha fatto punto è lo stesso della squadra al set point
    if (squad.players.includes(player)) {
      if (value) {
        assignStats(this, player, squad, STAT.SET_POINTS_WIN);
        assignStats(this, player, squad, STAT.TOTAL_SET_POINTS);
      } else //ha sbagliato il punto
      {
        assignStats(this, player, squad, STAT.SET_POINTS_ERR);
        assignStats(this, player, squad, STAT.TOTAL_SET_POINTS);
      }
    } else //il giocatore appartiene alla squadra avversaria
    {
      if (value) {
        assignStats(this, player, squad, STAT.SET_POINTS_CANCELLED);
        assignStats(this, player, opponent, STAT.TOTAL_SET_POINTS);
      } else {
        assignStats(this, player, opponent, STAT.SET_POINTS_WIN);
        assignStats(this, player, opponent, STAT.TOTAL_SET_POINTS);
      }
    }
  }

  assignMatchPointStat(squad, player, value) {
    const opponent = squad === this.squadA ? this.squadB : this.squadA;

    //Se il player che ha fatto punto è lo stesso della squadra al set point
    if (squad.players.includes(player)) {
      if (value) {
        assignStats(this, player, squad, STAT.MATCH_POINTS_WIN);
        assignStats(this, player, squad, STAT.TOTAL_MATCH_POINTS);
      } else //ha sbagliato il punto
      {
        assignStats(this, player, squad, STAT.MATCH_POINTS_ERR);
        assignStats(this, player, squad, STAT.TOTAL_MATCH_POINTS);
      }
    } else //il giocatore appartiene alla squadra avversaria
    {
      if (value) {
        assignStats(this, player, squad, STAT.MATCH_POINTS_CANCELLED);
        assignStats(this, player, opponent, STAT.TOTAL_MATCH_POINTS);
      } else {
        assignStats(this, player, opponent, STAT.MATCH_POINTS_WIN);
        assignStats(this, player, opponent, STAT.TOTAL_MATCH_POINTS);
      }
    }
  }

  /**
   * Aggiunge una stats di un dato player
   * @param {*} player
   * @param {*} type
   */
  addStatPlayer(player, type) {
    player.addStat(type);
  }

  /**
   * Aggiunge una stats di un dato player
   * @param {*} player
   * @param {*} type
   */
  addStatSquad(squad, type) {
    squad.addStat(type);
  }

  /**
   * Aggiunge una stats di un dato player
   * @param {*} player
   * @param {*} type
   */
  addStatSet(player, type) {
    this.currentSet._updateSetPlayerStats(player, type);
    this.currentSet._updateSetSquadStats(player.team, type);
  }

  /**
   * Inizializzo un nuovo set
   * @returns set
   */
  startNewSet() {
    const set = new Sset(this.currentSetNumber);

    set.startingLineup.A = this.squadA.players.map((p) => p);
    set.startingLineup.B = this.squadB.players.map((p) => p);

    //console.log(set.startingLineup.A);

    this.currentSet = set;
    this.sets.push(set);

    this.squadA.score = 0;
    this.squadB.score = 0;
    this.squadA.timeout = 0;
    this.squadB.timeout = 0;

    return set;
  }

  /**
   * Reset selectedOutplayer alla fine di ogni punto
   */
  resetSelectedOutPlayer() {
    this.selectedOutPlayer = null;
  }

  /**
   * Inserisco il winnerteam dentro a set con incremento setsWon in squad
   * @param {*} winnerTeam oggetto squad
   */
  endSet(winnerTeam) {
    this.currentSet.winner = winnerTeam;

    if (winnerTeam === "A") this.squadA.setsWon++;
    else this.squadB.setsWon++;

    this.currentSetNumber++;
    this.currentSet = null;
  }

  /**
   * Metodo principale per la gestione dell'undo
   */
  undoLastEvent() {
    if (this.undoHistory.length == 1) {
      throw new Error("inizio partita, non puoi farlo");
    } else if (this.undoHistory.length > 0) {
      const snapshot = this.undoHistory.pop();
      console.log(snapshot);

      if (snapshot.type === "sub") {
        const squad = this.squadA.players.includes(snapshot.inPlayer)
          ? this.squadA
          : this.squadB; //se il player appartiene alla squadA
        const pos = squad.players.findIndex(
          (p) => p.id === snapshot.inPlayer.id,
        );

        console.log(pos);

        snapshot.outPlayer.dom.classList.remove("selected-out");
        snapshot.outPlayer.dom.classList.add("player");
        squad.players[pos] = snapshot.outPlayer;

        snapshot.outPlayer.onCourt = true;

        console.log(squad.players);
        //perchè senno non funziona il player in campo
        snapshot.outPlayer.dom.removeEventListener("click", onSubClickHandler);
        snapshot.outPlayer.dom.addEventListener("click", onCourtClickHandler);

        snapshot.inPlayer.dom.classList.remove("player");
        snapshot.inPlayer.dom.classList.add("selected-out");

        snapshot.inPlayer.onCourt = false;

        //perché senno non funziona la sostituzione del playerOut
        snapshot.inPlayer.dom.removeEventListener("click", onCourtClickHandler);
        snapshot.inPlayer.dom.addEventListener("click", onSubClickHandler);

        squad.bench = squad.bench.filter((p) => p !== snapshot.outPlayer);
        squad.bench.push(snapshot.inPlayer);

        updateCourtDOM(squad);
        updateBenchDOM(squad);
      } else if (snapshot.type === "point")
        this.restoreFromSnapshot(
          this.undoHistory.at(this.undoHistory.length - 1),
        );
      else {
        //sub
        snapshot.calledBy.timeout--;
      }
    } else throw new Error("non posso farlo");
  }

  /**
   *
   * @param {*} snapshot istanza contenuta in undoHistory
   */
  restoreFromSnapshot(snapshot) {
    console.log(snapshot);

    //console.log(this.servingSquad);
    this.servingSquad = snapshot.servingSquad;

    this._restoreSquad(this.squadA, snapshot.squads.A);
    this._restoreSquad(this.squadB, snapshot.squads.B);

    this.renderAll();

    this.highlightPlayer(snapshot.playerWhoServed);
  }

  /**
   * Metodo di supporto
   * @param {*} squad squadra contenuta in match (this)
   * @param {*} snap squadra salvata nell'instanza di snapshot
   */
  _restoreSquad(squad, snap) {
    squad.score = snap.score;
    squad.setsWon = snap.setsWon;
    squad.timeout = snap.timeout;

    this._restorePlayers(squad, snap);
  }

  /**
   * Metodo di supporto
   * @param {*} squad squadra contenuta in match (this)
   * @param {*} snap squadra salvata nell'instanza di snapshot
   */
  _restorePlayers(squad, snap) {
    const allPlayers = [...squad.players, ...squad.bench];

    squad.players = snap.players.map((sp) => {
      const p = allPlayers.find((pl) => pl.id === sp.id);

      this._restorePlayerData(p, sp);
      return p;
    });

    squad.bench = snap.bench
      .map((sp) => {
        // cerco il Player vivo nella mappa
        const p = [...this.players_map.values()].find(
          (player) => player.id === sp.id,
        );

        if (!p) {
          console.warn("Player non trovato nella players_map:", sp.id);
          return null;
        }

        console.log(p);

        this._restorePlayerData(p, sp);
        return p;
      })
      .filter(Boolean);

    console.log(this.players_map);
  }

  /**
   * Metodo di supporto
   * @param {*} squad squadra contenuta in match (this)
   * @param {*} snap squadra salvata nell'instanza di snapshot
   */
  _restorePlayerData(player, snap) {
    //player.role = snap.role;
    player.stats = { ...snap.stats };
  }

  addToSnapshotPoint(team) {
    const snapshot = this.toSnapshotPoint(
      team,
      this.squadA.score + this.squadB.score,
    );
    this.undoHistory.push(snapshot);
    console.log("snapshot");
    //console.log(this.undoHistory);
  }

  toSnapshotPoint(scoringTeam, pointNumber) {
    return {
      type: "point",
      pointNumber: pointNumber,
      scoringTeam: scoringTeam,
      playerWhoServed: this.servingSquad.servingPlayer,
      servingSquad: this.servingSquad,
      score: {
        A: this.squadA.score,
        B: this.squadB.score,
      },
      squads: {
        A: this.squadA.toJSON(),
        B: this.squadB.toJSON(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  addToSnapshotSub(squad, outPlayer, inPlayer) {
    const snapshot = this.toSnapshotSub(squad, outPlayer, inPlayer);
    this.undoHistory.push(snapshot);
    console.log("snapshot");
    console.log(this.undoHistory);
  }

  toSnapshotSub(squad, outPlayer, inPlayer) {
    return {
      type: "sub",
      squad: squad,
      outPlayer: outPlayer,
      inPlayer: inPlayer,
      timestamp: new Date().toISOString(),
    };
  }

  addToSnapshotTimeout(calledBy) {
    const snapshot = this.toSnapshotTimeout(calledBy);
    this.undoHistory.push(snapshot);
    console.log("snapshot");
    console.log(this.undoHistory);
  }

  toSnapshotTimeout(calledBy) {
    return {
      type: "sub",
      calledBy: calledBy,
      timestamp: Date.now(),
    };
  }

  //metodo per esportare json quando premo il pulsante
  exportJson() {
    var data = JSON.stringify(squad_stats, null, 2); // pretty print

    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "squad_staats.json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  swapSides() {
    //swap SquadA
    this.squadA.swapInnerSide();
    this.squadB.swapInnerSide();

    //aggiorna il DOM
    this.renderAll();
  }

  renderAll() {
    updateCourtDOM(this.squadA);
    updateCourtDOM(this.squadB);

    updateBenchDOM(this.squadA);
    updateBenchDOM(this.squadB);

    this.updateScore();
    this.updateScore();

    /* 
    updateTimeoutUI('A');
    updateTimeoutUI('B');
    */
  }

  rotate(squad) {
    // ordine FIVB visto dall’alto
    // indici DOM:   0  1  2  3  4  5
    // posizioni:    1  2  3  4  5  6
    // mapping:     [3, 1, 5, 2, 6, 4]

    // 2️⃣ recupero DOM della metà campo
    const half =
      squad.side === "left"
        ? document.querySelector(".half.left")
        : document.querySelector(".half.right");

    const divs = Array.from(half.querySelectorAll(".player"));

    // 3️⃣ snapshot dei player attuali in DOM order
    const values = divs.map((div) => this.players_map.get(div));

    // 4️⃣ nuovo ordine secondo la tua logica originale
    const newOrder = [];
    newOrder[0] = values[2]; // 3
    newOrder[1] = values[0]; // 1
    newOrder[2] = values[4]; // 5
    newOrder[3] = values[1]; // 2
    newOrder[4] = values[5]; // 6
    newOrder[5] = values[3]; // 4

    // 5️⃣ aggiornamento grafico
    newOrder.forEach((player) => {
      half.appendChild(player.dom);
    });

    squad.players = newOrder;
  }

  enableCardMode(type) {
    this.cardMode = type;
  }

  disableCardMode() {
    this.cardMode = null;
  }

  /**
   * Metodo per iniziare il match
   * @param {*} servingSquad istanza squad, squadra che inizia
   */
  startMatch(servingSquad) {
    this.servingSquad = servingSquad;
    this.inizialBallSide = servingSquad.side;
    this.assignServe();
    console.log(this.currentSelectedPlayers);
    this.addToSnapshotPoint(servingSquad);
    console.log(this.currentSelectedPlayers);
  }

  /**
   * Metodo per assegnare la battuta
   *
   * Viene impostato il player in servingSquad e evidenziato nel cmapo
   */
  assignServe() {
    this.clearServe();
    this.servingSquad.setPlayer();
    //console.log(this.servingSquad.servingPlayer);
    if (this.servingSquad.servingPlayer) {
      this.highlightPlayer(this.servingSquad.servingPlayer, STAT_EVENT.SERVE);
      //console.log("ora batte il");
      //console.log(this.servingSquad.servingPlayer);
      /* this.pushcurrentSelectedPlayers(
        this.servingSquad.servingPlayer.id,
        STAT_EVENT.SERVE,
      );*/
    }
  }

  /*pushcurrentSelectedPlayers(playerId, type) {
    this.currentSelectedPlayers.push({ id: playerId, type: type });
  }*/

  setBlockCurrentSelectedPlayers() {
    const playerWhoBlocked = this.currentSelectedPlayers.at(
      this.currentSelectedPlayers.length - 1,
    );
    playerWhoBlocked.type = STAT_EVENT.BLOCK;

    console.log(
      "player: " +
        this.currentSelectedPlayers.at(this.currentSelectedPlayers.length - 1)
          .player.id +
        " ha fatto muro su attacco del " +
        this.currentSelectedPlayers.at(this.currentSelectedPlayers.length - 2)
          .player.id,
    );

    const playerWhoAttacked = this.currentSelectedPlayers.at(
      this.currentSelectedPlayers.length - 2,
    );

    const squad =
      playerWhoAttacked.player.team === "A" ? this.squadA : this.squadB;

    playerWhoAttacked.type = STAT_EVENT.ATTACK;

    console.log(playerWhoAttacked);

    assignStats(this, playerWhoAttacked.player, squad, STAT.TOTAL_ATTACK);
    assignStats(
      this,
      playerWhoAttacked.player,
      squad,
      STAT.ATTACK_NOT_SUCCESSFUL,
    );
    console.log(this.currentSelectedPlayers);
  }

  /**
   * Rimuove a tutti i player la classe serve
   */
  clearServe() {
    document
      .querySelectorAll(".player")
      .forEach((p) => p.classList.remove("serve"));
  }

  /**
   *
   * @param {*} player prende l'ultimo player evidenziato
   * @param {*} value serve per determinare se il punto va alla squadra del giocatore oppure no
   * @param {*} type
   */
  scorePoint(player, value, type) {
    console.log(this.currentSelectedPlayers);
    //console.log(player);
    const squad = player.team === "A" ? this.squadA : this.squadB;
    const opponent = squad === this.squadA ? this.squadB : this.squadA;

    //Controllo se è stato giocato il punto del set point
    console.log(player);
    if (this.currentSetNumber === this.maxSet) {
      this.checkIfIsMatchPoint();
    } else this.checkIfIsSetOrMatchPoint(player, value);

    if (this.squadA.players.includes(player)) {
      console.log("appartienena A");
      if (value) this.squadA.scorePoint();
      else this.squadB.scorePoint();
    } else {
      console.log("appartienena B");
      if (value) this.squadB.scorePoint();
      else this.squadA.scorePoint();
    }

    console.log(value);
    //player.addStats(type); // per ora lo teniamo così
    //perché il punto l'ha fatto la squadra opposta della squadra dell'ultimo giocatore che ha toccato il pallone
    if (!value) {
      console.log("ha fatto punto " + opponent.name);
    } else console.log("ha fatto punto: " + squad.name);

    //console.log(squad); //squadra che ha fatto punto
    //console.log(this.servingSquad); //squadra che ha battuto il set
    //console.log(value);

    //tutte i giocatori hanno giocato il punto
    this.squadA.players.forEach((p) =>
      this.addStatPlayer(p, STAT.POINTS_PLAYED),
    );

    this.squadB.players.forEach((p) =>
      this.addStatPlayer(p, STAT.POINTS_PLAYED),
    );

    //prima di modificare tutto, salvo lo stato attuale
    this.addToSnapshotPoint(player.team);

    let isAce = type === STAT.ACE ? true : false;

    this.logEvent(player, value, type, isAce);

    this.updateScore();

    //cambio servizio
    console.log(this.currentSelectedPlayers);
    if (this.servingSquad !== squad && value) {
      //console.log("1 cambio battutas, ora tocca a: " + squad.name);
      this.servingSquad = squad;
      this.rotate(squad);
    } else if (this.servingSquad === squad && !value) {
      //questo vuol dire che l'ultimo giocatore che ha toccato palla è della stessa squadra che ha battuto ma hanno perso il punto lo stesso
      //console.log("2 cambio battutas, ora tocca a: " + opponent.name);
      this.servingSquad = opponent;
      this.rotate(opponent);
    }
    this.checkSetEnd();
    this.currentSelectedPlayers = new Array();
    this.assignServe();
    console.log(this.currentSelectedPlayers);

    /*this.currentSelectedPlayers.push({
      player: this.servingSquad.servingPlayer,
      type: STAT_EVENT.SERVE,
    });*/
  }

  /**
   * Metodo per controllare se il match è finito
   * @returns true se il setsWon di una delle due squadre è uguale a tthis.setsToWin
   */
  checkEndMatch() {
    return (
      this.squadA.setsWon === this.setsToWin ||
      this.squadB.setsWon === this.setsToWin
    );
  }

  /**
   * Metodo per aggiornare lo scoreboard SOLO lato UI
   */
  updateScore() {
    //squadA
    let score = document.querySelectorAll(".scorebar." + this.squadA.side)[0];

    console.log(this.squadA);
    score.querySelectorAll(".field-score")[0].innerHTML = this.squadA.score;
    score.querySelectorAll(".set-score")[0].innerHTML = this.squadA.setsWon;

    //squadB
    score = document.querySelectorAll(".scorebar." + this.squadB.side)[0];

    score.querySelectorAll(".field-score")[0].innerHTML = this.squadB.score;
    score.querySelectorAll(".set-score")[0].innerHTML = this.squadB.setsWon;

    console.log(score);
  }

  /**
   * Metodo che controlla se il set è finito
   */
  checkSetEnd() {
    const target =
      this.currentSetNumber === this.maxSet
        ? this.tieBreakPoints
        : this.setPoints;

    if (
      this.squadA.score >= target &&
      this.squadA.score - this.squadB.score >= 2
    )
      this.winSet(this.squadA);

    if (
      this.squadB.score >= target &&
      this.squadB.score - this.squadA.score >= 2
    ) {
      this.winSet(this.squadB);
    }

    //se sono al quinto set controllo se devo fare cambio campo
    if (this.currentSetNumber === this.maxSet && this.changeFieldMaxSet) {
      //console.log("controllo quinto set");
      if (
        this.squadA.score >= this.tieBreakPoints / 2 ||
        this.squadB.score >= this.tieBreakPoints / 2
      ) {
        //console.log("cambio quinto set");
        this.swapSides();
        this.changeFieldMaxSet = false;
      }
    }
  }

  /**
   *
   * @param {*} winner squadra che ha vinto il set
   */
  winSet(winner) {
    winner.setsWon++;
    alert("vince la squadra: " + winner.name);

    //riporto il punteggio a 0-0
    this.squadA.resetScore();
    this.squadB.resetScore();

    //resetto i timeout
    this.squadA.resetTimeouts();
    this.squadB.resetTimeouts();

    console.log(this.servingSquad);
    // fare cambio campo
    if (this.currentSetNumber !== this.maxSet) {
      //cambio campo
      this.swapSides();
    }
    console.log(this.servingSquad);
    console.log(this.currentSet);
    console.log(this.sets);

    console.log("sets: " + this.squadA.setsWon + " - " + this.squadB.setsWon);
    this.currentSetNumber++;
    this.currentSet = this.startNewSet();
    console.log(this.currentSet);

    console.log(this.inizialBallSide);
    console.log(this.servingSquad);

    this.servingSquad =
      this.inizialBallSide === this.squadA.side ? this.squadA : this.squadB;

    this.assignServe();
    console.log(this.servingSquad);
    this.renderAll();
  }

  /**
   *
   * @param {*} p //Vuole il player, non dom
   */
  highlightPlayer(p, type) {
    console.log("HIGHI");
    //console.log(p);
    // rimuovi la palla da tutti
    document
      .querySelectorAll(".player .badges")
      .forEach((b) => (b.innerHTML = ""));

    document
      .querySelectorAll(".player")
      .forEach((b) => b.classList.remove("selected"));

    //console.log(p);

    if (this.lastPlayer === null) this.lastPlayer = p;
    else if (this.lastPlayer.team !== p.team) {
      this.lastPlayer = p;
      this.isOnBlock = false;
    }
    //console.log(this.lastPlayer);

    const badge = document.createElement("div");
    badge.classList.add("ball");
    badge.textContent = "🏐";

    p.dom.querySelector(".badges").appendChild(badge);

    p.dom.classList.add("selected");
    this.selectedPlayer = this.players_map.get(p.dom);

    if (type === undefined) {
      type = STAT_EVENT.TOUCH;
    }
    this.currentSelectedPlayers.push({
      player: this.selectedPlayer,
      type: type,
    });
    console.log(this.currentSelectedPlayers);
  }

  /*
  {
    "typeEvent" : string, //point,
    "squadToSet" : number, //Squadra A --> 1 e Squadra B --> 2
    "playerToSet" : number, //player who makes the serve
    "touchOfPlayers" : [
        6,3,5,11,7 //sequence of the players that touched the ball 
    ],
    "playerId": player.id,
    "squadWhoWinPoint" : number, //Squadra A --> 1 e Squadra B --> 2
    "pointMode" : string, //point or out
    "isAce" : boolean //true or false
},
*/
  logEvent(player, value, typeEvent, isAce) {
    this.history.push({
      typeEvent: typeEvent,
      squadToSet: this.servingSquad,
      playerToSet: this.servingSquad.servingPlayer,
      touchOfPlayers: this.currentSelectedPlayers,
      playerId: player.id,
      squadWhoWinPoint: player.team,
      pointMode: value,
      isAce: isAce,
      timestamp: Date.now(),
    });

    this.currentSet.events.push({
      typeEvent: typeEvent,
      squadToSet: this.servingSquad.toJSON(),
      playerToSet: this.servingSquad.servingPlayer.toJSON(),
      touchOfPlayers: this.currentSelectedPlayers,
      playerId: player.id,
      squadWhoWinPoint: player.team,
      pointMode: value,
      isAce: isAce,
      timestamp: Date.now(),
      squadA: this.squadA.toJSON(),
      squadB: this.squadB.toJSON(),
    });
  }

  /* {
    "typeEvent" : string, //card
    "squadPlayer" : number, //Squadra A --> 1 e Squadra B --> 2
    "player" : number, 
    "typeOfCard" : "Y" //Yellow --> Y e Red --> R 
}
*/
  logEventCard(player, typeEvent, typeOfCard) {
    this.history.push({
      typeEvent: typeEvent,
      squadPlayer: player.team,
      player: player,
      typeOfCard: typeOfCard,
      timestamp: Date.now(),
    });
  }

  /*
  {
    "typeEvent" : string, //timeout
    "calledBy" : number, //Squadra A --> 1 e Squadra B --> 2
},

*/
  logEventTimeout(typeEvent, calledBy) {
    this.history.push({
      typeEvent: typeEvent,
      calledBy: calledBy,
      timestamp: Date.now(),
    });
  }

  /*{
    "typeEvent" : number, //change
    "calledBy" : number,  //Squadra A --> 1 e Squadra B --> 2
    "playersChanged" : {
        "sub1" : {
            "in" : number,
            "out" : number
        },
        "sub2" : {
            "in" : number,
            "out" : number
        }
    }
},*/

  /*
    player1: chi esce
    player2: chi entra
  */
  logEventSubstitute(typeEvent, calledBy, player1, player2) {
    this.history.push({
      typeEvent: typeEvent,
      calledBy: calledBy,
      playersChanged: {
        sub1: {
          out: player1,
          in: player2,
        },
      },
      timestamp: Date.now(),
    });
  }

  /**
   * squadA
   * squadB
   * sets
   * maxSet
   * setsToWin
   * setPoints
   * tieBreakPoints
   * servingSquad
   */
  toJSON() {
    return {
      squadA: this.squadA.toJSON(),
      squadB: this.squadB.toJSON(),
      sets: this.sets.map((set) => set.toJSON()),
      maxSet: this.maxSet,
      setsToWin: this.setsToWin,
      setPoints: this.setPoints,
      tieBreakPoints: this.tieBreakPoints,
      servingSquad: this.servingSquad,
    };
  }
}
