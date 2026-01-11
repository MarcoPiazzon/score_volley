class Match {
  constructor(squadA, squadB, servingSquad) {
    this.squadA = squadA;
    this.squadB = squadB;

    this.currentSet = 1;
    this.maxSet = 5;
    this.setPoints = 25;
    this.tieBreakPoints = 15;

    this.servingSquad = servingSquad;
    this.currentSelectedPlayer = new Array();
    this.history = [];
  }

  startMatch(servingSquad) {
    this.servingSquad = servingSquad;
    this.assignServe();
  }

  assignServe() {
    this.clearServe();
    if (this.servingSquad.servingPlayer) {
      this.servingSquad.servingPlayer.dom.classList.add("serve");
    }
  }

  clearServe() {
    document
      .querySelectorAll(".player")
      .forEach((p) => p.classList.remove("serve"));
  }

  //value: serve per determinare se il punto va alla squadra del giocatore oppure no
  scorePoint(player, value, type) {
    const squad = player.team === "A" ? this.squadA : this.squadB;
    const opponent = squad === this.squadA ? this.squadA : this.squadB;

    if (this.squadA.players.includes(player)) {
      if (value) this.squadA.scorePoint();
      else this.squadB.scorePoint();
    } else {
      if (value) this.squadB.scorePoint();
      else this.squadA.scorePoint();
    }

    //player.addStats(type); // per ora lo teniamo così

    //cambio servizio
    if (this.servingSquad !== squad) {
      this.servingSquad = squad;
      squad.rotate();
    }

    this.updateScore();
    this.logEvent(player, type);
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

    if (this.squadB >= target && this.squadB.score - this.squadA.score >= 2)
      this.winSet(this.squadB);
  }

  winSet(winner) {
    winner.setsWon++;
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
  constructor(name) {
    this.name = name;
    this.players = [];
    this.bench = [];
    this.score = 0;
    this.setsWon = 0;
    this.servingPlayer = null;
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

  setPlayer(player) {
    if (!this.players.includes(player)) return;
    this.servingPlayer = player;
  }

  rotate() {
    // ordine FIVB visto dall’alto
    // indici DOM:   0  1  2  3  4  5
    // posizioni:    1  2  3  4  5  6
    // mapping:     [3, 1, 5, 2, 6, 4]

    // 1️⃣ rotazione LOGICA (shift ciclico)
    const first = this.players.shift();
    this.players.push(first);

    // 2️⃣ recupero DOM della metà campo
    const half =
      this.side === "left"
        ? document.querySelector(".half.left")
        : document.querySelector(".half.right");

    const divs = Array.from(half.querySelectorAll(".player"));

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
  constructor(id, team, role, dom) {
    this.id = id; // numero giocatore
    this.team = team; // 'A' o 'B'
    this.role = role; // Palleggiatore, Centrale, ecc.
    this.dom = dom; //Riferimento al div nel campo
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

const squadA = new Squad("A");
const squadB = new Squad("B");
const players_map = new Map(); //per mappare div con player
const match = new Match(squadA, squadB, squadA); //forzo l'inizio batuta della squadra A

let selectedPlayer = null;
let timeoutSquad1 = 3;
let timeoutSquad2 = 3;
let counterPlayerTouched = 0;
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

let isYellow = false;
let isRed = false;
let isChange = false;

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
  selectedPlayer = p;
}

document.addEventListener("DOMContentLoaded", () => {
  //inizializzo tutti i player
  players.forEach((p) => {
    //OO
    const id = p.textContent.trim();
    const role = null; //per ora non gestito
    const team = p.closest(".half").classList.contains("left") ? "A" : "B";

    const player = new Player(id, team, role, p);
    players_map.set(p, player);

    if (team === "A") {
      squadA.addPlayer(player);
      if (p.classList.contains("serve")) squadA.servingPlayer = player;
    } else {
      squadB.addPlayer(player);

      if (p.classList.contains("serve")) squadA.servingPlayer = player;
    }

    p.addEventListener("click", () => {
      players.forEach((pl) => pl.classList.remove("selected"));
      counterPlayerTouched++;

      if (counterPlayerTouched != 0) {
        buttonsAttack.forEach((p1) => (p1.disabled = false));
        buttonsDefence.forEach((p1) => (p1.disabled = false));
        buttonsBlock.forEach((p1) => (p1.disabled = false));
        buttonsFwb.forEach((p1) => (p1.disabled = false));
        buttonsTechnical.forEach((p1) => (p1.disabled = true));
        buttonsCards.forEach((p1) => (p1.disabled = true));
      }

      playersSquad1.forEach((p1) => {
        if (!p1.classList.contains("serve")) {
          p1.style.pointerEvents = "auto";
        }
      });

      playersSquad2.forEach((p1) => {
        if (!p1.classList.contains("serve")) {
          p1.style.pointerEvents = "auto";
        }
      });

      console.log("test" + isYellow);
      if (isYellow) {
        console.log("cartellino giallo");
        //riattivo tutti i player

        playersSquad1.forEach((p1) => {
          p1.style.pointerEvents = "auto";
        });

        playersSquad2.forEach((p1) => {
          p1.style.pointerEvents = "auto";
        });

        //inserisco nel json

        //ripristino com'era prima
        //disabilito i giocatori in battuta
        if (playerToServe === 1) {
          //serve squadra di sx
          currentSelectedPlayer.push(servePlayerSquad1.innerText);
          highlightPlayer(servePlayerSquad1);

          playersSquad1.forEach((p1) => {
            if (!p1.classList.contains("serve")) {
              p1.style.pointerEvents = "none";
            }
          });
        } else {
          //serve squadra di dx
          currentSelectedPlayer.push(servePlayerSquad2.innerText);
          highlightPlayer(servePlayerSquad2);

          playersSquad2.forEach((p1) => {
            if (!p1.classList.contains("serve")) {
              p1.style.pointerEvents = "none";
            }
          });
        }

        isYellow = false;
      } else if (isRed) {
        console.log("cartellino rosso");
      }
      selectedPlayer = p;
      highlightPlayer(selectedPlayer);
      match.currentSelectedPlayer.push(p.innerHTML);
    });
  });
  console.log(squadA);

  console.log("---------------");

  console.log(squadB);

  console.log("----------");

  //serve squadra di sx
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

      players.forEach((pl) => pl.classList.remove("selected"));
      if (label === "point") {
        console.log(players_map.get(selectedPlayer));
        //decido di chi è il punto
        match.scorePoint(players_map.get(selectedPlayer), true, null); //per ora tengo null
      } else if (label === "out") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "ace") {
        match.scorePoint(players_map.get(selectedPlayer), true, null); //per ora tengo null
      } else if (label === "errore") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "lost ball") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "double") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "4 touches") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "raised") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "position") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "invasion") {
        match.scorePoint(players_map.get(selectedPlayer), false, null); //per ora tengo null
      } else if (label === "yellow") {
        isYellow = true;
      } else if (label === "red") {
        isRed = true;
      } else if (label === "change") {
      }

      //ripristino i pulsanti che servono
      buttonsTechnical.forEach((p1) => (p1.disabled = false));
      buttonsCards.forEach((p1) => (p1.disabled = false));

      //disabilito i pulsanti che non servono
      buttonsAttack.forEach((p1) => (p1.disabled = true));
      buttonsDefence.forEach((p1) => (p1.disabled = true));
      buttonsBlock.forEach((p1) => (p1.disabled = true));
      buttonsFwb.forEach((p1) => (p1.disabled = true));
    });
  });

  //disabilito i pulsanti che non servono
  buttonsAttack.forEach((p1) => (p1.disabled = true));
  buttonsDefence.forEach((p1) => (p1.disabled = true));
  buttonsBlock.forEach((p1) => (p1.disabled = true));
  buttonsFwb.forEach((p1) => (p1.disabled = true));

  //inizializzo i timeout (da rifare)
  timeoutButtons = document.querySelectorAll(".timeout");
  timeoutButtons[0].innerHTML += timeoutSquad1;
  timeoutButtons[1].innerHTML += timeoutSquad2;
});
