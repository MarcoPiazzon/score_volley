//console.log("MODULE LOADED");
import { Squad } from "./squad.js"; // ❌ se il file è Squad.js
import { Player } from "./player.js"; // ❌ se il file è Squad.js
import { Match } from "./match.js"; // ❌ se il file è Squad.js
import { CARD_TYPE, STAT } from "./enums.js";
import { updateCourtDOM, updateBenchDOM } from "./utils.js";

const squadA = new Squad("A", "left");
const squadB = new Squad("B", "right");
//per mappare div con player
export const match = new Match(squadA, squadB); //forzo l'inizio batuta della squadra A

export let buttonsAttack = document.querySelectorAll(".attack");
export let buttonsServe = document.querySelectorAll(".serve");
export let buttonsDefence = document.querySelectorAll(".defence");
export let buttonsBlock = document.querySelectorAll(".block");
export let buttonsFwb = document.querySelectorAll(".fwb");
export let buttonsCards = document.querySelectorAll(".cards");
export let buttonsTechnical = document.querySelectorAll(".technical");
export let timeoutButtons = document.querySelectorAll(".timeout");
let scoreLeft = document.querySelectorAll(".scorebar.left");
let scoreRight = document.querySelectorAll(".scorebar.right");
let players = document.querySelectorAll(" .player");
let sub = document.querySelectorAll(".bench-player");

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
  players.forEach((p1) => p1.classList.remove("selected"));
}

function updatePlayerCardUI(player, type) {
  const cardsDiv = player.dom.querySelector(".cards");

  console.log(type);

  const card = document.createElement("div");
  card.classList.add("card", type.split("-")[1]); // "yellow" o "red"

  cardsDiv.appendChild(card);
}

function onCourtClickHandler(e) {
  const div = e.currentTarget;
  clickEventListener(div);
}

function clickEventListener(p) {
  console.log("remp");

  console.log(match.squadA.stats);
  console.log(match.currentSet.stats);
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

  if (match.currentSelectedPlayers.length === 4) {
    console.log("assegno la battuta ok");
    assignStats(
      match.servingSquad.servingPlayer,
      match.servingSquad,
      STAT.SERVES,
    );
    assignStats(
      match.servingSquad.servingPlayer,
      match.servingSquad,
      STAT.TOTAL_SERVES,
    );
    console.log(match.servingSquad.servingPlayer);
    console.log(match.servingSquad);
  }

  const player = match.players_map.get(p);
  console.log("changeMode:" + match.changeMode);
  if (match.changeMode) {
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

    if (match.cardMode === CARD_TYPE.CARD_RED)
      assignStats(player, squad, STAT.CARD_RED);
    else assignStats(player, squad, STAT.CARD_YELLOW);

    assignStats(player, squad, STAT.TOTAL_CARD);

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

function onSubClickHandler(e) {
  const div = e.currentTarget;
  clickEventSub(div);
}

function clickEventSub(p) {
  if (match.changeMode && match.selectedOutPlayer) {
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

    updateCourtDOM(squad);
    updateBenchDOM(squad);

    match.logEventSubstitute(match.selectedOutPlayer, match.players_map.get(p));

    console.log("player_map");
    console.log(match.players_map);
    match.changeMode = false;
    match.resetSelectedOutPlayer();
    resetButton();
    match.highlightPlayer(match.servingSquad.servingPlayer.dom);
  }

  //console.log("cardMode: " + match.cardMode);
  if (match.cardMode) {
    const player = match.players_map.get(p);
    const squad = squadA.players.includes(p) ? squadA : squadB; //se il player appartiene alla squadA
    console.log("assegno " + match.cardMode);

    if (match.cardMode === "red") assignStats(player, squad, STAT.CARD_RED);
    else assignStats(player, squad, STAT.CARD_YELLOW);

    assignStats(player, squad, STAT.TOTAL_CARD);

    match.logEventCard(player, "card", match.cardMode);
    //console.log(player);
    updatePlayerCardUI(player, match.cardMode);
    match.disableCardMode();
    match.highlightPlayer(match.servingSquad.servingPlayer.dom);
    resetButton();
    return;
  }
}

function assignStatsOnlyPlayer(player, type) {}

function assignStatsOnlySquad(squad, type) {
  //squad
  //set player
  //set squad
}

/**
 * funzione che assegna tutte le statistiche a player,squad e set
 */
export function assignStats(player, squad, type) {
  //player
  player.addStat(type);

  squad.addStat(type);

  match.currentSet._updateSetPlayerStats(player, type);

  match.currentSet._updateSetSquadStats(player.team, type);
}

function resetButton() {
  //ripristino il selected player
  //console.log("ripristino");
  //console.log(match.servingSquad.servingPlayer);
  match.selectedPlayer = match.servingSquad.servingPlayer;

  //ripristino i pulsanti che servono
  buttonsTechnical.forEach((p1) => (p1.disabled = false));
  buttonsCards.forEach((p1) => (p1.disabled = false));
  buttonsServe.forEach((p1) => (p1.disabled = false));

  //disabilito i pulsanti che non servono
  buttonsAttack.forEach((p1) => (p1.disabled = true));
  buttonsDefence.forEach((p1) => (p1.disabled = true));
  buttonsBlock.forEach((p1) => (p1.disabled = true));
  buttonsFwb.forEach((p1) => (p1.disabled = true));
}

document.addEventListener("DOMContentLoaded", () => {
  //inizializzo tutti i player
  players.forEach((p) => {
    //OO
    const id = p.textContent.trim();
    const role = null; //per ora non gestito
    const team = p.closest(".half").classList.contains("left") ? "A" : "B";

    const player = new Player(id, team, role, p, true); //true perché sono i titolari
    match.players_map.set(p, player);

    if (team === "A") {
      squadA.addPlayer(player);
    } else {
      squadB.addPlayer(player);
    }

    p.addEventListener("click", onCourtClickHandler);
  });

  //console.log(sub);
  sub.forEach((p) => {
    //OO
    const id = p.textContent.trim();
    const role = null; //per ora non gestito
    const team = p.closest(".bench-quarter").classList.contains("left")
      ? "A"
      : "B";

    const player = new Player(id, team, role, p, false); //false perché sono i titolari
    match.players_map.set(p, player);

    if (team === "A") {
      squadA.addBenchPlayer(player);
    } else {
      squadB.addBenchPlayer(player);
    }

    p.querySelectorAll(".player-name")[0].innerHTML =
      player.name + " " + player.surname;

    p.addEventListener("click", onSubClickHandler);
  });

  match.startMatch(squadA);

  assignStats(match.servingSquad.servingPlayer, match.servingSquad, "touches");

  match.highlightPlayer(match.servingSquad.servingPlayer.dom); //match.servingSquad.servingPlayer

  document.querySelectorAll(".events button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!match.selectedPlayer) {
        alert("Seleziona prima un giocatore");
        return;
      }

      const label = btn.textContent.toLowerCase();
      //console.log("label");
      players.forEach((pl) => pl.classList.remove("selected"));

      const player = match.players_map.get(match.selectedPlayer.dom);
      const squad = squadA.players.includes(match.selectedPlayer)
        ? squadA
        : squadB; //se il player appartiene alla squadA
      if (label === "point") {
        if (match.currentSelectedPlayers.length === 4) {
          console.log("assegno la battuta ok");
          assignStats(
            match.servingSquad.servingPlayer,
            match.servingSquad,
            STAT.SERVES,
          );
          assignStats(
            match.servingSquad.servingPlayer,
            match.servingSquad,
            STAT.TOTAL_SERVES,
          );
          console.log(match.servingSquad.servingPlayer);
          console.log(match.servingSquad);
        }
        assignStats(player, squad, STAT.ATTACK_WIN);
        assignStats(player, squad, STAT.TOTAL_ATTACK);

        match.scorePoint(player, true, "point"); //per ora tengo null
      } else if (label === "out") {
        if (match.currentSelectedPlayers.length === 4) {
          console.log("assegno la battuta ok");
          assignStats(
            match.servingSquad.servingPlayer,
            match.servingSquad,
            STAT.SERVES,
          );
          assignStats(
            match.servingSquad.servingPlayer,
            match.servingSquad,
            STAT.TOTAL_SERVES,
          );
          console.log(match.servingSquad.servingPlayer);
          console.log(match.servingSquad);
        }
        assignStats(player, squad, STAT.ATTACK_ERR);
        assignStats(player, squad, STAT.TOTAL_ATTACK);

        match.scorePoint(player, false, "point"); //per ora tengo null
      } else if (label === "ace") {
        assignStats(player, squad, STAT.ACE);
        assignStats(player, squad, STAT.TOTAL_SERVES);

        match.scorePoint(
          match.players_map.get(match.currentSelectedPlayers[0].dom),
          true,
          "point",
        ); //per ora tengo null
      } else if (label === "serve error") {
        assignStats(player, squad, STAT.SERVES_ERR);
        assignStats(player, squad, STAT.TOTAL_SERVES);

        match.scorePoint(player, false, "point"); //per ora tengo null
      } else if (label === "lost ball") {
        assignStats(player, squad, STAT.BALL_LOST);

        match.scorePoint(player, false, "point"); //per ora tengo null
      } else if (label === "double") {
        assignStats(player, squad, STAT.FOUL_DOUBLE);
        assignStats(player, squad, STAT.TOTAL_FOUL);

        match.scorePoint(player, false, "foul"); //per ora tengo null
      } else if (label === "4 touches") {
        assignStats(player, squad, STAT.FOUL_FOUR_TOUCHES);
        assignStats(player, squad, STAT.TOTAL_FOUL);

        match.scorePoint(player, false, "foul"); //per ora tengo null
      } else if (label === "raised") {
        assignStats(player, squad, STAT.FOUL_RAISED);
        assignStats(player, squad, STAT.TOTAL_FOUL);

        match.scorePoint(player, false, "foul"); //per ora tengo null
      } else if (label === "position") {
        assignStats(player, squad, STAT.FOUL_POSITION);
        assignStats(player, squad, STAT.TOTAL_FOUL);

        match.scorePoint(player, false, "point"); //per ora tengo null
      } else if (label === "invasion") {
        assignStats(player, squad, STAT.FOUL_INVASION);
        assignStats(player, squad, STAT.TOTAL_FOUL);

        match.scorePoint(player, false, "point"); //per ora tengo null
      } else if (label === "yellow card") {
        //console.log("abilito giallo");
        match.enableCardMode(CARD_TYPE.CARD_YELLOW);
      } else if (label === "red card") {
        match.enableCardMode(CARD_TYPE.CARD_RED);
      } else if (label === "change") {
        match.changeMode = true;
        match.selectedOutPlayer = null;
        console.log("modalità cambio attiva");
      } else if (label === "timeout") {
        //da tenere in stand by fino alla fine dell'implementazione del cambio campo
        /*const team = btn.classList.contains("left") ? "A" : "B";
        if(team === 'A'){
          match
        }*/
      }

      if (!match.changeMode) {
        resetButton();
      }

      //console.log(match.servingSquad);
    });
  });

  //pulsante di swap
  const btnSwap = document.querySelector(".swap");
  btnSwap.addEventListener("click", () => {
    match.swapSides();
  });
  //pulsante di swap
  const btnUndo = document.querySelector(".undo");
  btnUndo.addEventListener("click", () => {
    match.undoLastEvent();
  });

  //pulsante di swap
  const btnExport = document.querySelector(".export");
  btnExport.addEventListener("click", () => {
    match.exportJson();
  });

  //disabilito i pulsanti che non servono
  buttonsAttack.forEach((p1) => (p1.disabled = true));
  buttonsDefence.forEach((p1) => (p1.disabled = true));
  buttonsBlock.forEach((p1) => (p1.disabled = true));
  buttonsFwb.forEach((p1) => (p1.disabled = true));

  //inizializzo i timeout (da rifare)
  timeoutButtons = document.querySelectorAll(".timeout");
  //addToSnapshotTimeout
  /*timeoutButtons[0].innerHTML += timeoutSquad1;
  timeoutButtons[1].innerHTML += timeoutSquad2;*/
});

/* Statistiche */
const statsBtn = document.querySelector(".stats");
const popup = document.getElementById("popupOverlay");
const closeBtn = document.querySelector(".close");

popup.addEventListener("click", (e) => e.stopPropagation());
statsBtn.addEventListener("click", () => {
  popup.classList.remove("hidden");
  populateSetSelector();
  render();
});

closeBtn.addEventListener("click", (e) => {
  console.log("test2");
  e.stopPropagation();
  popup.classList.add("hidden");
});

// --- DATI MOCK (sostituire con JSON reale) ---

const statsConfig = [
  //Tocchi
  {
    key: STAT.TOUCHES,
    label: "Tocchi",
    type: "absolute",
  },
  //Attacchi
  {
    key: STAT.TOTAL_ATTACK,
    label: "Attacchi totali",
    type: "absolute",
  },
  {
    key: STAT.ATTACK_WIN,
    label: "Attachi vinti",
    type: "relative",
    base: STAT.TOTAL_ATTACK,
  },
  {
    key: STAT.ATTACK_ERR,
    label: "Attachi falliti",
    type: "relative",
    base: STAT.TOTAL_ATTACK,
  },
  /*SERVES*/
  {
    key: STAT.TOTAL_SERVES,
    label: "Battute totali",
    type: "absolute",
  },
  {
    key: STAT.SERVES,
    label: "Battute non sbagliate",
    type: "relative",
    base: STAT.TOTAL_SERVES,
  },
  {
    key: STAT.ACE,
    label: "Ace",
    type: "relative",
    base: STAT.TOTAL_SERVES,
  },
  {
    key: STAT.SERVES_ERR,
    label: "Battute sbagliate",
    type: "relative",
    base: STAT.TOTAL_SERVES,
  },
  //Palle perse
  {
    key: STAT.BALL_LOST,
    label: "Palle perse",
    type: "absolute",
  },
  //Falli
  {
    key: STAT.TOTAL_FOUL,
    label: "Falli totali",
    type: "absolute",
  },
  {
    key: STAT.FOUL_DOUBLE,
    label: "Falli di doppia",
    type: "relative",
    base: STAT.TOTAL_FOUL,
  },
  {
    key: STAT.FOUL_FOUR_DOUBLE,
    label: "Falli di quattro tocchi",
    type: "relative",
    base: STAT.TOTAL_FOUL,
  },
  {
    key: STAT.FOUL_RAISED,
    label: "Falli di sollevata",
    type: "relative",
    base: STAT.TOTAL_FOUL,
  },

  {
    key: STAT.FOUL_POSITION,
    label: "Falli di posizione",
    type: "relative",
    base: STAT.TOTAL_FOUL,
  },

  {
    key: STAT.FOUL_INVASION,
    label: "Falli di invasione",
    type: "relative",
    base: STAT.TOTAL_FOUL,
  },
  //Cartellini
  {
    key: STAT.TOTAL_CARD,
    label: "Cartellini totali",
    type: "absolute",
  },
  {
    key: STAT.CARD_YELLOW,
    label: "Cartellini gialli",
    type: "relative",
    base: STAT.TOTAL_CARD,
  },
  {
    key: STAT.CARD_RED,
    label: "Cartellini rossi",
    type: "relative",
    base: STAT.TOTAL_CARD,
  },
];

const container = document.getElementById("statsBody");

let setsData = [];
let currentMode = "match";
let currentSetIndex = 0;

const statsBody = document.getElementById("statsBody");
const setSelector = document.getElementById("setSelector");
const teamAHeader = document.getElementById("teamAHeader");
const teamBHeader = document.getElementById("teamBHeader");

setsData = match.sets || match.currentSet;

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    currentMode = e.target.value;
    setSelector.disabled = currentMode !== "set";
    render();
  });
});

setSelector.addEventListener("change", (e) => {
  currentSetIndex = parseInt(e.target.value, 10);
  render();
});

function populateSetSelector() {
  setSelector.innerHTML = "";
  setsData.forEach((_, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Set ${i + 1}`;
    setSelector.appendChild(opt);
  });
}

function getSquadsStats() {
  if (currentMode === "match") {
    return {
      A: match.squadA.stats,
      B: match.squadB.stats,
    };
  }

  const set = setsData[currentSetIndex];
  if (!set) return null;

  console.log(set);
  return {
    A: set.stats.squads.A,
    B: set.stats.squads.B,
  };
}

function render() {
  const stats = getSquadsStats();
  if (!stats) return;

  statsBody.innerHTML = "";

  /*Object.values(STAT).forEach(stat => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
            <td class="label">${stat}</td>
            <td>${stats.A[stat] || 0}</td>
            <td>${stats.B[stat] || 0}</td>
          `;
                    statsBody.appendChild(tr);
                });*/
  statsConfig.forEach((stat) => {
    const aVal = match.squadA.stats[stat.key] || 0;
    const bVal = match.squadB.stats[stat.key] || 0;

    let aPerc = 0;
    let bPerc = 0;

    if (stat.type === "absolute") {
      const total = aVal + bVal || 1;
      aPerc = aVal / total;
      bPerc = bVal / total;
    }

    if (stat.type === "relative") {
      const aBase = match.squadA.stats[stat.base] || 1;
      const bBase = match.squadB.stats[stat.base] || 1;
      aPerc = aVal / aBase;
      bPerc = bVal / bBase;
    }

    const row = document.createElement("div");
    row.className = "stat-row";

    row.innerHTML = `
      <div class="stat-values">
        <div class="${aPerc > bPerc ? "winner" : ""}">${aVal} (${Math.round(aPerc * 100)}%)</div>
        <div class="stat-label">${stat.label}</div>
        <div class="${bPerc > aPerc ? "winner" : ""}">${bVal} (${Math.round(bPerc * 100)}%)</div>
      </div>
      <div class="bar">
        <div class="bar-left" style="width: calc(50% * ${aPerc});"></div>
        <div class="bar-right" style="width: calc(50% * ${bPerc});"></div>
        <div class="bar-center"></div>
      </div>
    `;

    container.appendChild(row);
  });
}
