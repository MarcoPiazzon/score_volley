class Match {
  constructor(squadA, squadB) {
    this.squadA = squadA;
    this.squadB = squadB;

    this.currentSet = 1;
    this.maxSet = 5;
    this.setPoints = 25;
    this.tieBreakPoints = 15;

    this.servingSquad = null;
    this.currentSelectedPlayer = new Array(); //array di Player
    this.history = [];
  }

  startMatch(servingSquad) {
    this.servingSquad = servingSquad;
    this.assignServe();
  }

  assignServe() {
    this.clearServe();
    this.servingSquad.setPlayer();
    console.log(this.servingSquad.servingPlayer);
    if (this.servingSquad.servingPlayer) {
      this.servingSquad.servingPlayer.dom.classList.add("serve");
      this.servingSquad.servingPlayer.dom.classList.add("selected");
      console.log("ora batte il");
      console.log(this.servingSquad.servingPlayer);
    }
  }

  clearServe() {
    document
      .querySelectorAll(".player")
      .forEach((p) => p.classList.remove("serve"));
  }

  //value: serve per determinare se il punto va alla squadra del giocatore oppure no
  scorePoint(player, value, type) {
    console.log(player);
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
    console.log(this.servingSquad); //squadra che ha battuto il set
    console.log(value);

    //cambio servizio
    if (this.servingSquad !== squad && value) {
      console.log("1 cambio battutas, ora tocca a: " + squad.name);
      this.servingSquad = squad;
      squad.rotate();
    } else if (this.servingSquad === squad && !value) {
      //questo vuol dire che l'ultimo giocatore che ha toccato palla è della stessa squadra che ha battuto ma hanno perso il punto lo stesso
      console.log("2 cambio battutas, ora tocca a: " + opponent.name);
      this.servingSquad = opponent;
      opponent.rotate();
    }

    this.assignServe();

    this.updateScore();
    this.logEvent(player, type);

    this.currentSelectedPlayer = new Array();
    this.currentSelectedPlayer.push(this.servingSquad.servingPlayer);
    this.checkSetEnd();
  }

  updateScore() {
    const score = document.querySelectorAll(".score")[0];

    score.innerHTML = "" + this.squadA.score + " - " + this.squadB.score;
  }

  checkSetEnd() {
    const target =
      this.currentSet === this.maxSet ? this.tieBreakPoints : this.setPoints;

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
  }

  winSet(winner) {
    winner.setsWon++;
    alert("vince la squadra: " + winner.name);
    this.squadA.resetScore();
    this.squadB.resetScore();

    // fare cambio cambio
    if (this.currentSet !== this.maxSet) {
      //campio cambio
      this.swapCourts();
    }

    this.currentSet++;
  }

  swapCourts() {
    //da fare
  }

  logEvent(player, type) {
    this.history.push({
      set: this.currentSet,
      team: player.team,
      playerId: player.id,
      role: player.role,
      type,
      timestamp: Date.now(),
    });
  }

  isMatchOver() {
    return this.squadA.setsWon === 3 || this.squadB.setsWon === 3;
  }

  exportJson() {
    return {
      currentSet: this.currentSet,
      squads: {
        A: {
          score: this.squadA.score,
          setsWon: this.squadA.setsWon,
          players: this.squadA.getStats(),
        },
        B: {
          score: this.squadB.score,
          setsWon: this.squadB.setsWon,
          players: this.squadB.getStats(),
        },
      },
      history: this.history,
    };
  }
}

class Squad {
  constructor(name, side) {
    this.name = name;
    this.side = side;
    this.players = [];
    this.bench = [];
    this.score = 0;
    this.setsWon = 0;
    this.servingPlayer = null;
    this.timeout = 3;
  }

  addToCourt(player,position){
    player.onCourt = true;
    player.position = position;
    this.players[position - 1] = player;
  }

  addToBench(player){
    player.onCourt = false;
    player.position = null;
    this.bench.push(player);
  }

  substitute(outPlayer, inPlayer){
    console.log("test-----");
    console.log(outPlayer);
    console.log(inPlayer);
    if(!outPlayer.onCourt){
      throw new Error("Il giocatore da sostituire non è in campo");
    }
    if(inPlayer.onCourt){
      throw new Error("Il giocatore entrante è già in campo");
    }

    const pos = this.players.findIndex(p => p.id === outPlayer.id);

    inPlayer.dom.classList.remove("selected-out");
    inPlayer.dom.classList.add("player");
    this.players[pos] = inPlayer;

    outPlayer.onCourt = false;
    inPlayer.onCourt = true;

    outPlayer.dom.classList.remove("player");
    
    outPlayer.dom.classList.add("selected-out");
    this.bench = this.bench.filter(p => p !== inPlayer);
    this.bench.push(outPlayer);

    console.log("end--");
    console.log(this.players);
  }

  addPlayer(player) {
    this.players.push(player);
  }

  addBenchPlayer(player) {
    this.bench.push(player);
  }

  scorePoint() {
    this.score++;
    console.log(
      "aumentato score a " + this.score + " per la squadra " + this.name
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
    console.log(this.players);

    if (this.side === "left") this.servingPlayer = this.players[4];
    else this.servingPlayer = this.players[1];
  }

  rotate() {
    // ordine FIVB visto dall’alto
    // indici DOM:   0  1  2  3  4  5
    // posizioni:    1  2  3  4  5  6
    // mapping:     [3, 1, 5, 2, 6, 4]

    // 2️⃣ recupero DOM della metà campo

    console.log(this.side);
    const half =
      this.side === "left"
        ? document.querySelector(".half.left")
        : document.querySelector(".half.right");

    const divs = Array.from(half.querySelectorAll(".player"));

    console.log("pre ordine");
    console.log(divs);
    // 3️⃣ snapshot dei player attuali in DOM order
    const values = divs.map((div) => players_map.get(div));

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

    console.log("nuovo ordine");
    console.log(newOrder);

    this.players = newOrder;
  }

  getStats() {
    return this.players.map((p) => ({
      id: p.id,
      role: p.role,
      stats: p.stats,
    }));
  }
}

class Player {
  constructor(id, team, role, dom, onCourt) {
    this.id = id; // numero giocatore
    this.team = team; // 'A' o 'B'
    this.role = role; // Palleggiatore, Centrale, ecc.
    this.dom = dom; //Riferimento al div nel campo
    this.position = null;
    this.onCourt = onCourt; //se il giocatore è in campo
    this.stats = {
      touches: 0, //palloni toccati durante la partita intera

      //Attack
      attackWin: 0, //attacchi vinti
      attackErr: 0, //attacchi sbagliati (solo fuori)
      totalAttack: 0, // attacchi totali fatti nella partita

      //Serve
      ace: 0, //ace totali
      serves: 0, //battute totali
      servesErr: 0, //errori totali in battuta
      linea_pestata: 0, //da capire come fare

      //Ricezione
      defensePos: 0, //ricezioni corrette
      defenseNeg: 0, //ricezioni sbagliate

      //Lost Ball
      lostBall: 0, //palle perse o passaggi sbagliati

      //Block
      blockWin: 0, //da capire come fare

      //Foul WB
      foul_double: 0, //doppe
      foul_four_touches: 0, //4 tocchi
      foul_raised: 0, //sollevata

      //Foul WOB
      foul_position: 0, //fallo di posizione
      foul_invasion: 0, //fallo di invasione

      //Card
      card_yellow: 0, //cartellini gialli
      card_red: 0, //cartelini rossi
    };
  }

  addStat(type) {
    if (this.stats[type] !== undefined) {
      this.stats[type]++;
    }
  }
}

const squadA = new Squad("A", "left");
const squadB = new Squad("B", "right");
const players_map = new Map(); //per mappare div con player
const match = new Match(squadA, squadB); //forzo l'inizio batuta della squadra A

let selectedPlayer = null;

let buttonsAttack = document.querySelectorAll(".attack");
let buttonsServe = document.querySelectorAll(".serve");
let buttonsDefence = document.querySelectorAll(".defence");
let buttonsBlock = document.querySelectorAll(".block");
let buttonsFwb = document.querySelectorAll(".fwb");
let buttonsCards = document.querySelectorAll(".cards");
let buttonsTechnical = document.querySelectorAll(".technical");
let playersSquad1 = document.querySelectorAll(".left .player");
let playersSquad2 = document.querySelectorAll(".right .player");
let players = document.querySelectorAll(" .player");
let sub = document.querySelectorAll(".selected-out");

let json = {
  squad1: "Terraglio",
  squad2: "Mirano",
  date: "20-01-26:20:30",
  place: "Palestra Terraglio",
  numberDay: 23,
  firstPlayerSquad1: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: 10,
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
    player4: {
      name: "Micheal",
      surname: "Jordan",
      number: 4,
    },
    player5: {
      name: "Alberto",
      surname: "Tomba",
      number: 7,
    },
    player6: {
      name: "Sofia",
      surname: "Goggia",
      number: 20,
    },
  },
  benchPlayerSquad1: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: 10,
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
  },
  firstPlayerSquad2: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: "10",
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
    player4: {
      name: "Micheal",
      surname: "Jordan",
      number: 4,
    },
    player5: {
      name: "Alberto",
      surname: "Tomba",
      number: 7,
    },
    player6: {
      name: "Sofia",
      surname: "Goggia",
      number: "20",
    },
  },
  benchPlayerSquad2: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: "10",
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
  },
  setWonSquad1: "0",
  setWonSquad2: "0",
  sets: {
    set1: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set2: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set3: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set4: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set5: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
  },
};

function disableAllPlayers() {
  console.log("fatto");
  players.forEach((p1) => p1.classList.remove("selected"));
}

function highlightPlayer(p) {
  console.log(p);
  p.classList.add("selected");
  selectedPlayer = players_map.get(p);
  match.currentSelectedPlayer.push(selectedPlayer);
}

function updateCourtDom(squad){
  
  const halfElement = document.querySelector(`.half.${squad.side}`);

  console.log(halfElement);
  // svuota la metà per inserire i player ordinati
  halfElement.innerHTML = '';

  // inserisci i div dei player nella giusta posizione
  squad.players.forEach(player => {
    halfElement.appendChild(player.dom); // ⚡ inserisce fisicamente nel DOM
    player.dom.textContent = player.id + '\n' + (player.role?.charAt(0) || '');
    player.dom.classList.add('player'); // aggiungi classi necessarie
  });
}

function updateBenchDOM(squad){
  
  const benchContainer = document.querySelector(`#bench-${squad.side}`);
  benchContainer.innerHTML = "";

  squad.bench.forEach(player => {
    benchContainer.appendChild(player.dom);
  });
}

selectedOutPlayer = null; //da mettere dentro a match
changeMode = true;

document.addEventListener("DOMContentLoaded", () => {
  //inizializzo tutti i player
  players.forEach((p) => {
    //OO
    const id = p.textContent.trim();
    const role = null; //per ora non gestito
    const team = p.closest(".half").classList.contains("left") ? "A" : "B";

    const player = new Player(id, team, role, p, true); //true perché sono i titolari
    players_map.set(p, player);

    if (team === "A") {
      squadA.addPlayer(player);
    } else {
      squadB.addPlayer(player);
    }

    p.addEventListener("click", () => {
      players.forEach((pl) => pl.classList.remove("selected"));

      if (match.currentSelectedPlayer.length != 0) {
        buttonsAttack.forEach((p1) => (p1.disabled = false));
        buttonsDefence.forEach((p1) => (p1.disabled = false));
        buttonsBlock.forEach((p1) => (p1.disabled = false));
        buttonsFwb.forEach((p1) => (p1.disabled = false));
        buttonsTechnical.forEach((p1) => (p1.disabled = true));
        buttonsCards.forEach((p1) => (p1.disabled = true));
      }

      if(changeMode){
        selectedOutPlayer = players_map.get(p);
        //p.classList.add('selected-out');
        return;
      }

      highlightPlayer(p);
    });
  });

  console.log(sub);
  sub.forEach((p) => {
    //OO
    const id = p.textContent.trim();
    const role = null; //per ora non gestito
    const team = p.closest(".panel").classList.contains("left") ? "A" : "B";

    const player = new Player(id, team, role, p, false); //false perché sono i titolari
    players_map.set(p, player);

    if (team === "A") {
      squadA.addBenchPlayer(player);
    } else {
      squadB.addBenchPlayer(player);
    }
    p.addEventListener("click", () => {
      if(changeMode && selectedOutPlayer){
        squad = (squadA.players.includes(selectedOutPlayer)) ? squadA : squadB; //se il player appartiene alla squadA
        console.log("squad");
        console.log(squad);
        squad.substitute(selectedOutPlayer, players_map.get(p));
        updateCourtDom(squad);
        updateBenchDOM(squad);

        changeMode = false;
        selectedOutPlayer = null;
          
      }
    });
  });
  //console.log(squadA);

  //console.log("---------------");

  //console.log(squadB);

  //console.log("----------");

  //serve squadra di sx

  match.startMatch(squadA);

  console.log(match.servingSquad);
  match.currentSelectedPlayer.push(match.servingSquad.servingPlayer);

  //console.log(match.servingSquad.servingPlayer.dom);
  highlightPlayer(match.servingSquad.servingPlayer.dom); //match.servingSquad.servingPlayer

  //questo è da rifare
  /*
  playersSquad1.forEach((p1) => {
    if (!p1.classList.contains("serve")) {
      p1.style.pointerEvents = "none";
    }
  });

  playersSquad2.forEach((p1) => {
    if (!p1.classList.contains("serve")) {
      p1.style.pointerEvents = "none";
    }
  });*/

  console.log(players_map);
  document.querySelectorAll(".events button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!selectedPlayer) {
        alert("Seleziona prima un giocatore");
        return;
      }

      const label = btn.textContent.toLowerCase();
      console.log("label");
      players.forEach((pl) => pl.classList.remove("selected"));
      if (label === "point") {
        console.log(players_map.get(selectedPlayer.dom));
        //decido di chi è il punto
        match.scorePoint(players_map.get(selectedPlayer.dom), true, null); //per ora tengo null
      } else if (label === "out") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "ace") {
        match.scorePoint(
          players_map.get(match.currentSelectedPlayer[0].dom),
          true,
          null
        ); //per ora tengo null
      } else if (label === "errore") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "lost ball") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "double") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "4 touches") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "raised") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "position") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "invasion") {
        match.scorePoint(players_map.get(selectedPlayer.dom), false, null); //per ora tengo null
      } else if (label === "yellow") {
        isYellow = true;
      } else if (label === "red") {
        isRed = true;
      } else if (label === "change") {
        changeMode = true;
        selectedOutPlayer = null;
        console.log("modalità cambio attiva");
      }
      if(!changeMode){
        //ripristino il selected player
      console.log("ripristino");
      console.log(match.servingSquad.servingPlayer);
      selectedPlayer = match.servingSquad.servingPlayer;

      //ripristino i pulsanti che servono
      buttonsTechnical.forEach((p1) => (p1.disabled = false));
      buttonsCards.forEach((p1) => (p1.disabled = false));

      //disabilito i pulsanti che non servono
      buttonsAttack.forEach((p1) => (p1.disabled = true));
      buttonsDefence.forEach((p1) => (p1.disabled = true));
      buttonsBlock.forEach((p1) => (p1.disabled = true));
      buttonsFwb.forEach((p1) => (p1.disabled = true));
      }
      
    });
  });

  //disabilito i pulsanti che non servono
  buttonsAttack.forEach((p1) => (p1.disabled = true));
  buttonsDefence.forEach((p1) => (p1.disabled = true));
  buttonsBlock.forEach((p1) => (p1.disabled = true));
  buttonsFwb.forEach((p1) => (p1.disabled = true));

  //inizializzo i timeout (da rifare)
  timeoutButtons = document.querySelectorAll(".timeout");
  /*timeoutButtons[0].innerHTML += timeoutSquad1;
  timeoutButtons[1].innerHTML += timeoutSquad2;*/
});
