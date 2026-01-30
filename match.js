import { Sset } from "./set.js"; // ❌ se il file è Squad.js
import {
  onCourtClickHandler,
  onSubClickHandler,
  updateCourtDOM,
  updateBenchDOM,
} from "./utils.js";

export class Match {
  constructor(squadA, squadB) {
    this.squadA = squadA;
    this.squadB = squadB;

    this.currentSetNumber = 1;
    this.sets = [];
    this.currentSet = this.startNewSet();

    this.players_map = new Map();
    this.selectedPlayer = null;
    this.selectedOutPlayer = null;

    //rules
    this.maxSet = 5;
    this.setPoints = 25;
    this.tieBreakPoints = 15;
    this.changeFieldMaxSet = true; //se true ancora da fare, se false già fatto

    this.servingSquad = null;
    this.currentSelectedPlayers = new Array(); //array di Player

    this.history = []; // questo segna tutto come events (punti,card,sub,timeout)
    this.undoHistory = []; //per ora SOLO con i punti
    this.cardMode = null; //per modalità cartellino
  }

  resetSelectedOutPlayer() {
    this.selectedOutPlayer = null;
  }

  startNewSet() {
    const set = new Sset(this.currentSetNumber);

    set.startingLineup.A = this.squadA.players.map((p) => p.id);
    set.startingLineup.B = this.squadB.players.map((p) => p.id);

    this.currentSet = set;
    this.sets.push(set);

    this.squadA.score = 0;
    this.squadB.score = 0;
    this.squadA.timeout = 0;
    this.squadB.timeout = 0;

    return set;
  }

  endSet(winnerTeam) {
    this.currentSet.winner = winnerTeam;

    if (winnerTeam === "A") this.squadA.setsWon++;
    else this.squadB.setsWon++;

    this.currentSetNumber++;
    this.currentSet = null;
  }

  restoreFromSnapshot(snapshot) {
    console.log(snapshot.type);

    //console.log(this.servingSquad);
    this.servingSquad = snapshot.servingSquad;

    this._restoreSquad(this.squadA, snapshot.squads.A);
    this._restoreSquad(this.squadB, snapshot.squads.B);

    this.updateScore();
    this._updateCourtDOM();

    this.highlightPlayer(snapshot.playerWhoServed.dom);
  }

  highlightPlayer(p) {
    //console.log(p);
    p.classList.add("selected");
    this.selectedPlayer = this.players_map.get(p);
    this.currentSelectedPlayers.push(this.selectedPlayer);
  }

  _restoreSquad(squad, snap) {
    squad.score = snap.score;
    squad.setsWon = snap.setsWon;
    squad.timeout = snap.timeout;

    this._restorePlayers(squad, snap);
  }

  _restorePlayers(squad, snap) {
    const allPlayers = [...squad.players, ...squad.bench];

    //console.log(allPlayers);

    squad.players = snap.players.map((sp) => {
      const p = allPlayers.find((pl) => pl.id === sp.id);

      this._restorePlayerData(p, sp);
      return p;
    });

    //console.log(snap);
    console.log(this.players_map);
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

  _restorePlayerData(player, snap) {
    //controllo se il snap

    player.role = snap.role;
    player.stats = { ...snap.stats };
  }

  /*_updateCourtDOM() {
    this._updateHalf(this.squadA, ".half.left");
    this._updateHalf(this.squadB, ".half.right");
  }

  _updateHalf(squad, selector) {
    const halfElement = document.querySelector(`.half.${squad.side}`);

    //console.log(halfElement);
    // svuota la metà per inserire i player ordinati
    halfElement.innerHTML = "";

    // inserisci i div dei player nella giusta posizione
    squad.players.forEach((player) => {
      halfElement.appendChild(player.dom); // ⚡ inserisce fisicamente nel DOM
      player.dom.textContent =
        player.id + "\n" + (player.role?.charAt(0) || "");
      player.dom.classList.add("player"); // aggiungi classi necessarie
    });
    /*const half = document.querySelector(selector);
    const slots = half.querySelectorAll(".player");

    console.log(this.squadA);
    console.log(half);
    console.log(slots);
    squad.players.forEach((player, i) => {
      const div = slots[i];
      div.textContent = player.id;
      player.dom = div;
      this.players_map.set(div, player);
    });

    console.log(squad.players);
  }*/

  //type serve per indicare cosa sto caricando (point,card, sub)
  addToSnapshotPoint(team) {
    const snapshot = this.toSnapshotPoint(
      team,
      this.squadA.score + this.squadB.score,
    );
    this.undoHistory.push(snapshot);
    console.log("snapshot");
    console.log(this.undoHistory);
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
  /*
  onCourtClickHandler(e) {
    const div = e.currentTarget;
    clickEventListener(div);
  }

  clickEventListener(p) {
    console.log("remp");
    players.forEach((pl) => pl.classList.remove("selected"));

    if (match.currentSelectedPlayers.length != 0) {
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

  //metodo per esportare json quando premo il pulsante
  exportJson() {
    console.log("ciao");

    let j = {
      match: {
        squadA: this.squadA.toJSON(),
        squadB: this.squadB.toJSON(),
      },
    };

    /* per dashboard_squad.html */
    let squad_stats = {
      match: {
        squadA: this.squadA.toJSON_stats_squad(),
        squadB: this.squadB.toJSON_stats_squad(),
      },
      sets: this.sets.map((set) => ({
        //number: set.number,
        //score: { A: set.scoreA, B: set.scoreB },
        //winner: set.winner,
        stats: {
          squads: set.stats.squads,
          //players: Object.fromEntries(set.stats.players),
        },
        //events: set.events,
      })),
    };
    /*
     let j = {
      match: {
        squadA: this.squadA.toJSON(),
        suqadB: this.squadB.toJSON(),
      }
    };
      QUESTO FUNZIONA PERFETTAMENTE
    var data = JSON.stringify(j, null, 2); // pretty print

    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "players_stats_totalmatch.json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
*/
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

    /*var data = JSON.stringify(this.history, null, 2); // pretty print

    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "history.json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    data = JSON.stringify(this.undoHistory, null, 2); // pretty print

    blob = new Blob([data], { type: "application/json" });
    url = URL.createObjectURL(blob);

    a = document.createElement("a");
    a.href = url;
    a.download = "undoHistory.json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    data = JSON.stringify(this.sets, null, 2); // pretty print

    blob = new Blob([data], { type: "application/json" });
    url = URL.createObjectURL(blob);

    a = document.createElement("a");
    a.href = url;
    a.download = "sets.json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);*/
    /*
    toJSON() {
  return {
    squads: {
      A: this.squadA.toJSON(),
      B: this.squadB.toJSON()
    },
    sets: this.sets.map(set => ({
      number: set.number,
      score: { A: set.scoreA, B: set.scoreB },
      winner: set.winner,
      stats: {
        squads: set.stats.squads,
        players: Object.fromEntries(set.stats.players)
      },
      events: set.events
    })),
    history: this.history
  };
}
 */
  }
  /*
  playTimeline(delay = 500) {
    this.undoHistory.forEach((s, i) => {
      setTimeout(() => this.restoreFromSnapshot(s), i * delay);
    });
  }*/

  swapSides() {
    //Scambia le squadre
    //console.log("swap sides");
    //console.log(this.squadA);
    //console.log(this.squadB);

    [this.squadA, this.squadB] = [this.squadB, this.squadA];

    this.squadA.swapInnerSide();
    this.squadB.swapInnerSide();

    //console.log("dopo swap");
    //console.log(this.squadA);
    //console.log(this.squadB);

    //aggiorna riferimento team
    this.squadA.players.forEach((p) => (p.team = "A"));
    this.squadA.bench.forEach((p) => (p.team = "A"));

    this.squadB.players.forEach((p) => (p.team = "B"));
    this.squadB.bench.forEach((p) => (p.team = "B"));

    //aggiorna il DOM
    this.renderAll();
  }

  renderAll() {
    updateCourtDOM(this.squadA);
    updateCourtDOM(this.squadB);

    updateBenchDOM(this.squadA);
    updateBenchDOM(this.squadB);

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

    //console.log(this.side);
    const half =
      squad.side === "left"
        ? document.querySelector(".half.left")
        : document.querySelector(".half.right");

    const divs = Array.from(half.querySelectorAll(".player"));

    //console.log("pre ordine");
    //console.log(divs);
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

    //console.log("nuovo ordine");
    //console.log(newOrder);

    squad.players = newOrder;
  }

  enableCardMode(type) {
    this.cardMode = type;
  }

  disableCardMode(type) {
    this.cardMode = null;
  }

  startMatch(servingSquad) {
    this.servingSquad = servingSquad;
    this.assignServe();
    this.addToSnapshotPoint(servingSquad);
  }

  assignServe() {
    this.clearServe();
    this.servingSquad.setPlayer();
    //console.log(this.servingSquad.servingPlayer);
    if (this.servingSquad.servingPlayer) {
      this.servingSquad.servingPlayer.dom.classList.add("serve");
      this.servingSquad.servingPlayer.dom.classList.add("selected");
      //console.log("ora batte il");
      //console.log(this.servingSquad.servingPlayer);
    }
  }

  clearServe() {
    document
      .querySelectorAll(".player")
      .forEach((p) => p.classList.remove("serve"));
  }

  //value: serve per determinare se il punto va alla squadra del giocatore oppure no
  scorePoint(player, value, type) {
    //console.log(player);
    const squad = player.team === "A" ? this.squadA : this.squadB;
    const opponent = squad === this.squadA ? this.squadB : this.squadA;

    if (this.squadA.players.includes(player)) {
      if (value) this.squadA.scorePoint();
      else this.squadB.scorePoint();
    } else {
      if (value) this.squadB.scorePoint();
      else this.squadA.scorePoint();
    }

    //player.addStats(type); // per ora lo teniamo così
    //perché il punto l'ha fatto la squadra opposta della squadra dell'ultimo giocatore che ha toccato il pallone
    if (!value) {
      console.log("ha fatto punto " + opponent.name);
    } else console.log("ha fatto punto: " + squad.name);

    //console.log(squad); //squadra che ha fatto punto
    //console.log(this.servingSquad); //squadra che ha battuto il set
    //console.log(value);

    //prima di modificare tutto, salvo lo stato attuale
    this.addToSnapshotPoint(player.team);

    //cambio servizio

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

    this.assignServe();

    this.updateScore();

    let isAce = type === "ace" ? true : false;

    this.logEvent(player, value, type, isAce);

    this.currentSelectedPlayers = new Array();
    this.currentSelectedPlayers.push(this.servingSquad.servingPlayer);
    this.checkSetEnd();
  }

  updateScore() {
    const score = document.querySelectorAll(".score")[0];

    score.innerHTML = "" + this.squadA.score + " - " + this.squadB.score;
  }

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

  winSet(winner) {
    winner.setsWon++;
    alert("vince la squadra: " + winner.name);

    //riporto il punteggio a 0-0
    this.squadA.resetScore();
    this.squadB.resetScore();

    //resetto i timeout
    this.squadA.resetTimeouts();
    this.squadB.resetTimeouts();

    // fare cambio campo
    if (this.currentSetNumber !== this.maxSet) {
      //cambio campo
      this.swapSides();
    }

    console.log(this.currentSet);
    console.log(this.sets);

    console.log("sets: " + this.squadA.setsWon + " - " + this.squadB.setsWon);
    this.currentSetNumber++;
    this.currentSet = this.startNewSet();
    console.log(this.currentSet);
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

  isMatchOver() {
    return this.squadA.setsWon === 3 || this.squadB.setsWon === 3;
  }
}
