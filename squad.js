import { STAT } from "./enums.js";
import {
  onCourtClickHandler,
  onSubClickHandler,
  clickEventListener,
  clickEventSub,
} from "./utils.js";

export class Squad {
  constructor(name, side) {
    this.name = name;
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
    };
  }

  toJSON() {
    return {
      name: this.name,
      score: this.score,
      sets: this.setsWon,
      timeout: this.timeout,
      players: this.players.map((p) => p.toJSON()),
      bench: this.bench.map((p) => p.toJSON()),
    };
  }

  toJSON_stats_squad() {
    return {
      stats: this.stats,
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

  substitute(outPlayer, inPlayer) {
    //console.log("test-----");
    console.log(outPlayer);
    console.log(inPlayer);
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

    inPlayer.dom.classList.remove("selected-out");
    inPlayer.dom.classList.add("player");
    this.players[pos] = inPlayer;

    outPlayer.onCourt = false;

    //perché senno non funziona la sostituzione del playerOut
    outPlayer.dom.removeEventListener("click", onCourtClickHandler);
    outPlayer.dom.addEventListener("click", onSubClickHandler);

    inPlayer.onCourt = true;

    //perchè senno non funziona il player in campo
    inPlayer.dom.removeEventListener("click", onSubClickHandler);
    inPlayer.dom.addEventListener("click", onCourtClickHandler);

    outPlayer.dom.classList.remove("player");

    outPlayer.dom.classList.add("selected-out");
    this.bench = this.bench.filter((p) => p !== inPlayer);
    this.bench.push(outPlayer);

    //console.log("end--");
    //console.log(this.players);
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

  addPlayer(player) {
    this.players.push(player);
  }

  addBenchPlayer(player) {
    this.bench.push(player);
  }

  scorePoint() {
    this.score++;
    console.log(
      "aumentato score a " + this.score + " per la squadra " + this.name,
    );
  }

  resetScore() {
    this.score = 0;
  }

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

  /* Stats */
  addStat(type) {
    if (this.stats[type] !== undefined) {
      this.stats[type]++;
    }
  }
}
