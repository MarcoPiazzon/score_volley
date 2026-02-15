import { STAT } from "../enums.js";
import Player from "../model/player.js";
import {
  onCourtClickHandler,
  onSubClickHandler,
  clickEventListener,
  clickEventSub,
  attachOnCourtHandler,
  detachOnSubHandler,
  detachOnCourtHandler,
  attachOnSubHandler,
} from "../utils.js";

export default class Squad {
  constructor(name, side) {
    ((this.id = 1), //per ora di default
      (this.name = name));
    this.side = side;
    this.players = [];
    this.bench = [];
    this.score = 0;
    this.setsWon = 0;
    this.servingPlayer = null;
    this.timeout = 0;
    this.stats = {
      [STAT.TOUCHES]: 0, //palloni toccati durante la partita intera

      //Attack
      [STAT.ATTACK_WIN]: 0, //attacchi vinti
      [STAT.ATTACK_ERR]: 0, //attacchi sbagliati (solo fuori)
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
      [STAT.BLOCK_WIN]: 0, //da capire come fare mai gestita

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
    };
  }

  static fromJSON(json) {
    const squad = new Squad(json.name, json.side);

    console.log(json.players);
    //this.side = side;
    squad.players = json.players.map((p) => Player.fromJSON(p));
    squad.bench = json.bench.map((p) => Player.fromJSON(p));

    squad.side = json.side;
    squad.score = json.score;
    squad.setsWon = json.setsWon;
    squad.servingPlayer = json.servingPlayer;
    squad.timeout = json.timeout;
    squad.stats = { ...json.stats };

    return squad;
  }

  toJSON() {
    return {
      name: this.name,
      side: this.side,
      score: this.score,
      setsWon: this.setsWon,
      timeout: this.timeout,
      players: this.players.map((p) => p.toJSON()),
      bench: this.bench.map((p) => p.toJSON()),
    };
  }

  swapInnerSide() {
    this.side = this.side === "left" ? "right" : "left";
  }

  takeTimeout() {
    if (this.timeout >= 2) {
      return false; //timeout finiti
    }
    this.timeout++;
    return true;
  }

  resetTimeouts() {
    this.timeout = 0;
  }

  addToCourt(player, position) {
    player.onCourt = true;
    player.position = position;
    this.players[position - 1] = player;
  }

  addToBench(player) {
    player.onCourt = false;
    player.position = null;
    this.bench.push(player);
  }

  /**
   * Funzione che fa lo swap di due player, sia dentro a squad che players_map
   * @param {*} outPlayer player che esce
   * @param {*} inPlayer player che entra
   * @param {*} players_map
   */
  substitute(outPlayer, inPlayer, players_map, match) {
    //console.log(outPlayer);
    //console.log(inPlayer);
    if (!outPlayer.onCourt) {
      throw new Error("Il giocatore da sostituire non è in campo");
    }
    if (inPlayer.onCourt) {
      throw new Error("Il giocatore entrante è già in campo");
    } else if (inPlayer.stats.card_red > 0) {
      throw new Error("Il giocatore non può entrare perché espluso");
    }

    //salvo lo stato

    const pos = this.players.findIndex((p) => p.id === outPlayer.id);

    /* InPlayer */
    const innerInPlayer = inPlayer.dom.querySelector(".selected-out");

    players_map.delete(inPlayer.dom);

    innerInPlayer.classList.remove("selected-out");
    innerInPlayer.classList.add("player");

    inPlayer.onCourt = true;
    inPlayer.dom = innerInPlayer;

    const newBadgesInPlayer = document.createElement("div");
    newBadgesInPlayer.classList.add("badges");
    inPlayer.dom.appendChild(newBadgesInPlayer);

    //perchè senno non funziona il player in campo
    detachOnSubHandler(inPlayer.dom);
    attachOnCourtHandler(inPlayer.dom, match);

    players_map.set(inPlayer.dom, inPlayer);

    this.players[pos] = inPlayer;

    /* Outplayer */

    players_map.delete(outPlayer.dom);

    outPlayer.dom.classList.remove("player");
    outPlayer.dom.classList.add("selected-out");

    outPlayer.onCourt = false;

    const createDivNameSurnamePlayer = document.createElement("div");
    createDivNameSurnamePlayer.classList.add("player-name");
    createDivNameSurnamePlayer.innerHTML =
      outPlayer.name + " " + outPlayer.surname;

    const newBenchPlayer = document.createElement("div");
    newBenchPlayer.classList.add("bench-player");
    newBenchPlayer.appendChild(outPlayer.dom);

    outPlayer.dom = newBenchPlayer;
    outPlayer.dom.appendChild(createDivNameSurnamePlayer);
    console.log(newBenchPlayer);

    //perché senno non funziona la sostituzione del playerOut
    detachOnCourtHandler(outPlayer.dom);
    attachOnSubHandler(outPlayer.dom, match);

    players_map.set(outPlayer.dom, outPlayer);

    console.log(inPlayer);

    this.bench = this.bench.filter((p) => p !== inPlayer);
    this.bench.push(outPlayer);
  }
  /*
  onCourtClickHandler(e) {
    const div = e.currentTarget;
    clickEventListener(div);
  }

  clickEventListener(p) {
    console.log("remp");
    players.forEach((pl) => pl.classList.remove("selected"));

    if (match.currentSelectedPlayer.length != 0) {
      buttonsAttack.forEach((p1) => (p1.disabled = false));
      buttonsDefence.forEach((p1) => (p1.disabled = false));
      buttonsBlock.forEach((p1) => (p1.disabled = false));
      buttonsFwb.forEach((p1) => (p1.disabled = false));
      buttonsTechnical.forEach((p1) => (p1.disabled = true));
      buttonsCards.forEach((p1) => (p1.disabled = true));
      buttonsServe.forEach((p1) => (p1.disabled = true));
    }

    const player = match.players_map.get(p);
    console.log("changeMode:" + changeMode);
    if (changeMode) {
      console.log("parte1");
      match.selectedOutPlayer = player;
      return;
    }

    let squad = squadA.players.includes(player) ? squadA : squadB;
    //console.log("cardMode: " + match.cardMode);
    if (match.cardMode) {
      //console.log("assegno giallo");
      const player = match.players_map.get(p);
      console.log("assegno giallo");

      assignStats(player, squad, "yellow_card");
      assignStats(player, squad, "totalCard");

      match.logEventCard(player, "card", match.cardMode);
      //console.log(player);
      updatePlayerCardUI(player, match.cardMode);
      match.disableCardMode();
      match.highlightPlayer(match.servingSquad.servingPlayer.dom);
      resetButton();
      return;
    }

    assignStats(player, squad, "touches");
    match.highlightPlayer(p);
  }

  onSubClickHandler(e) {
    const div = e.currentTarget;
    clickEventSub(div);
  }

  clickEventSub(p) {
    if (changeMode && match.selectedOutPlayer) {
      let squad = squadA.players.includes(match.selectedOutPlayer)
        ? squadA
        : squadB; //se il player appartiene alla squadA
      console.log("squad");
      //console.log(squad);

      match.addToSnapshotSub(
        match.selectedOutPlayer.team,
        match.selectedOutPlayer,
        match.players_map.get(p),
      );
      squad.substitute(match.selectedOutPlayer, match.players_map.get(p));

      updateCourtDom(squad);
      updateBenchDOM(squad);

      match.logEventSubstitute(
        match.selectedOutPlayer,
        match.players_map.get(p),
      );

      console.log("player_map");
      console.log(match.players_map);
      changeMode = false;
      match.resetSelectedOutPlayer();

      match.highlightPlayer(match.servingSquad.servingPlayer.dom);
    }

    //console.log("cardMode: " + match.cardMode);
    if (match.cardMode) {
      const player = match.players_map.get(p);
      const squad = squadA.players.includes(p) ? squadA : squadB; //se il player appartiene alla squadA
      console.log("assegno " + match.cardMode);

      if (match.cardMode === "red") assignStats(player, squad, "red_card");
      else assignStats(player, squad, "yellow_card");

      match.logEventCard(player, "card", match.cardMode);
      //console.log(player);
      updatePlayerCardUI(player, match.cardMode);
      match.disableCardMode();
      match.highlightPlayer(match.servingSquad.servingPlayer.dom);
      resetButton();
      return;
    }
  }*/

  /**
   * Aggiunge un giocatore ai player in campo
   * @param {*} player giocatore
   */
  addPlayer(player) {
    this.players.push(player);
  }

  /**
   * Aggiunge un giocatore ai player in panchin
   * @param {*} player giocatore
   */
  addBenchPlayer(player) {
    this.bench.push(player);
  }

  /**
   * Aggiunge un punto alla squad
   */
  scorePoint() {
    this.score++;
    console.log(
      "aumentato score a " + this.score + " per la squadra " + this.name,
    );
  }

  resetScore() {
    this.score = 0;
  }

  /**
   * Aggiunge un set alla squad
   */
  winSet() {
    this.setsWon++;
    this.resetScore();
  }

  setPlayer() {
    //console.log(this.players);

    if (this.side === "left") this.servingPlayer = this.players[4];
    else this.servingPlayer = this.players[1];
  }

  getStats() {
    return this.players.map((p) => ({
      id: p.id,
      role: p.role,
      stats: p.stats,
    }));
  }

  /**
   * Aggiunge la statistica al player
   * @param {*} type oggetto di tipo STAT
   */
  addStat(type) {
    if (this.stats[type] !== undefined) {
      this.stats[type]++;
    }
  }
}
