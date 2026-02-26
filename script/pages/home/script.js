//console.log("MODULE LOADED");
import Match from "../../model/match.js"; // ❌ se il file è Squad.js
import Squad from "../../model/squad.js"; // ❌ se il file è Squad.js
import Player from "../../model/player.js"; // ❌ se il file è Squad.js

import { CARD_TYPE, STAT } from "../../enums.js";
import {
  attachOnCourtHandler,
  detachOnCourtHandler,
  attachOnSubHandler,
  detachOnSubHandler,
  updateCourtDOM,
  updateBenchDOM,
  assignStats,
  resetButtons,
} from "../../utils.js";

const squadA = new Squad("A", "left");
const squadB = new Squad("B", "right");

//per mappare div con player
export const match = new Match(squadA, squadB); //forzo l'inizio batuta della squadra A

console.log(match);

export let buttonsAttack = document.querySelectorAll(".attack");
export let buttonsServe = document.querySelectorAll(".serve");
export let buttonsDefence = document.querySelectorAll(".defence");
export let buttonsBlock = document.querySelectorAll(".block");
export let buttonsFwb = document.querySelectorAll(".fwb");
export let buttonsCards = document.querySelectorAll(".cards");
export let buttonsTechnical = document.querySelectorAll(".technical");
export let timeoutButtons = document.querySelectorAll(".timeout");
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

/**
 * Ripristino i pulsanti in condizione prebattuta
 */

async function loadTeams() {
  const res = await fetch(API + "/teams", {
    headers: {
      Authorization: "Bearer " + TOKEN,
    },
  });

  const teams = await res.json();

  console.log(teams);

  // prendiamo le prime due squadre del coach
  //window.teamA = teams[0];
  //window.teamB = teams[1];

  //document.querySelectorAll(".panel h3")[0].textContent = teamA.name;
  //document.querySelectorAll(".panel h3")[1].textContent = teamB.name;

  //da modificare con teams[1].id
  loadPlayers(teams[0].id, teams[0].id);
}

async function loadPlayers(teamAId, teamBId) {
  const [resA, resB] = await Promise.all([
    fetch(API + `/teams/${teamAId}/players`, {
      headers: { Authorization: "Bearer " + TOKEN },
    }),
    fetch(API + `/teams/${teamBId}/players`, {
      headers: { Authorization: "Bearer " + TOKEN },
    }),
  ]);

  const playersA = await resA.json();
  const playersB = await resB.json();

  console.log(playersA);
  console.log(playersB);
  //renderTeam(".half.left", playersA);
  //renderTeam(".half.right", playersB);
}

function renderTeam(selector, players) {
  const half = document.querySelector(selector);
  half.innerHTML = "";

  players.slice(0, 6).forEach((p) => {
    const div = document.createElement("div");
    div.className = "player";
    div.textContent = p.number;
    div.dataset.id = p.id;
    half.appendChild(div);
  });
}

async function sendMatchInformation() {
  let teamAId = match.squadA.id;
  let teamBId = match.squadB.id;
  let mjson = match.toJSON();
  /*console.log(
    JSON.stringify({
      teamAId,
      teamBId,
      match,
    }),
  );

  const res = await fetch("http://localhost:3000/api/matches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TOKEN,
    },
    body: JSON.stringify({
      teamAId,
      teamBId,
      match,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("server errore", text);
    return;
  }*/

  const json = JSON.stringify({
    teamAId,
    teamBId,
    mjson,
  });

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  //const data = await res.json();

  alert("partita salvata");
}

document.addEventListener("DOMContentLoaded", () => {
  //loadTeams();
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

    attachOnCourtHandler(p, match);
  });

  //inizializzo tutti i sub
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

    attachOnSubHandler(p, match);
    //p.addEventListener("click", onSubClickHandler);
  });

  console.log(squadA.players);
  console.log(squadB.players);

  match.startNewSet();

  match.startMatch(squadA);

  assignStats(
    match,
    match.servingSquad.servingPlayer,
    match.servingSquad,
    "touches",
  );

  match.highlightPlayer(match.servingSquad.servingPlayer); //match.servingSquad.servingPlayer

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

      switch (label) {
        case "point":
          if (match.currentSelectedPlayers.length === 4) {
            console.log("assegno la battuta ok");
            assignStats(
              match,
              match.servingSquad.servingPlayer,
              match.servingSquad,
              STAT.SERVES,
            );
            assignStats(
              match,
              match.servingSquad.servingPlayer,
              match.servingSquad,
              STAT.TOTAL_SERVES,
            );
            console.log(match.servingSquad.servingPlayer);
            console.log(match.servingSquad);
          }
          assignStats(match, player, squad, STAT.ATTACK_WIN);
          assignStats(match, player, squad, STAT.TOTAL_ATTACK);

          match.scorePoint(player, true, "point"); //per ora tengo null
          break;
        case "out":
          if (match.currentSelectedPlayers.length === 4) {
            console.log("assegno la battuta ok");
            assignStats(
              match,
              match.servingSquad.servingPlayer,
              match.servingSquad,
              STAT.SERVES,
            );
            assignStats(
              match,
              match.servingSquad.servingPlayer,
              match.servingSquad,
              STAT.TOTAL_SERVES,
            );
            //console.log(match.servingSquad.servingPlayer);
            //console.log(match.servingSquad);
          }
          assignStats(match, player, squad, STAT.ATTACK_ERR);
          assignStats(match, player, squad, STAT.TOTAL_ATTACK);

          match.scorePoint(player, false, "point"); //per ora tengo null
          break;
        case "ace":
          assignStats(match, player, squad, STAT.ACE);
          assignStats(match, player, squad, STAT.TOTAL_SERVES);

          match.scorePoint(
            match.players_map.get(match.currentSelectedPlayers[0].dom),
            true,
            "point",
          ); //per ora tengo null
          break;
        case "serve error":
          console.log(player);
          console.log(squad);
          assignStats(match, player, squad, STAT.SERVES_ERR);
          assignStats(match, player, squad, STAT.TOTAL_SERVES);

          match.scorePoint(player, false, "point"); //per ora tengo null
          break;
        case "lost ball":
          assignStats(match, player, squad, STAT.BALL_LOST);

          match.scorePoint(player, false, "point"); //per ora tengo null
          break;
        case "blocked":
          //player che ha fatto l'attacco
          // match.currentSelectedPlayers[currentSelectedPlayers.length-2];

          //player che ha aftto il muro
          match.currentSelectedPlayers[currentSelectedPlayers.length - 1];

          break;
        case "double":
          assignStats(match, player, squad, STAT.FOUL_DOUBLE);
          assignStats(match, player, squad, STAT.TOTAL_FOUL);

          match.scorePoint(player, false, "foul"); //per ora tengo null
          break;
        case "4 touches":
          assignStats(match, player, squad, STAT.FOUL_FOUR_TOUCHES);
          assignStats(match, player, squad, STAT.TOTAL_FOUL);
          match.scorePoint(player, false, "foul"); //per ora tengo null
          break;
        case "raised":
          assignStats(match, player, squad, STAT.FOUL_RAISED);
          assignStats(match, player, squad, STAT.TOTAL_FOUL);

          match.scorePoint(player, false, "foul"); //per ora tengo null
          break;
        case "position":
          assignStats(match, player, squad, STAT.FOUL_POSITION);
          assignStats(match, player, squad, STAT.TOTAL_FOUL);

          match.scorePoint(player, false, "point"); //per ora tengo null
          break;
        case "invasion":
          assignStats(match, player, squad, STAT.FOUL_INVASION);
          assignStats(match, player, squad, STAT.TOTAL_FOUL);

          match.scorePoint(player, false, "point"); //per ora tengo null
          break;
        case "yellow card":
          match.enableCardMode(CARD_TYPE.CARD_YELLOW);
          break;
        case "red card":
          match.enableCardMode(CARD_TYPE.CARD_RED);
          break;
        case "change":
          match.changeMode = true;
          match.selectedOutPlayer = null;
          console.log("modalità cambio attiva");
          break;
        case "timeout":
          break;
      }

      console.log(match.currentSet);
      //Controllo se il match è terminato
      if (match.checkEndMatch()) {
        console.log("Match finito");
        sendMatchInformation();
      }

      if (!match.changeMode && label !== "blocked") {
        resetButtons(match);
      }
    });
  });

  //pulsante di swap
  const btnSwap = document.querySelector(".swap");
  btnSwap.addEventListener("click", () => {
    match.swapSides();
  });
  //pulsante di undo
  const btnUndo = document.querySelector(".undo");
  btnUndo.addEventListener("click", () => {
    match.undoLastEvent();
  });

  //pulsante di export
  const btnExport = document.querySelector(".export");
  btnExport.addEventListener("click", () => {
    //match.exportJson();
    sendMatchInformation();
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
  //Set Point
  {
    key: STAT.TOTAL_SET_POINTS,
    label: "Set Point Totali",
    type: "absolute",
  },
  {
    key: STAT.SET_POINTS_WIN,
    label: "Set point vinti",
    type: "relative",
    base: STAT.TOTAL_SET_POINTS,
  },
  {
    key: STAT.SET_POINTS_ERR,
    label: "Set point sbagliati",
    type: "relative",
    base: STAT.TOTAL_SET_POINTS,
  },

  {
    key: STAT.SET_POINTS_CANCELLED,
    label: "Set point annullati",
    type: "relative",
    base: STAT.TOTAL_SET_POINTS,
  },
  //Set Match
  {
    key: STAT.TOTAL_MATCH_POINTS,
    label: "Match Point Totali",
    type: "absolute",
  },
  {
    key: STAT.MATCH_POINTS_WIN,
    label: "Match point vinti",
    type: "relative",
    base: STAT.TOTAL_MATCH_POINTS,
  },
  {
    key: STAT.MATCH_POINTS_ERR,
    label: "Match point sbagliati",
    type: "relative",
    base: STAT.TOTAL_MATCH_POINTS,
  },

  {
    key: STAT.MATCH_POINTS_CANCELLED,
    label: "Match point annullati",
    type: "relative",
    base: STAT.TOTAL_MATCH_POINTS,
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
  setsData = match.sets;
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

  return {
    A: set.stats.squads.A,
    B: set.stats.squads.B,
  };
}

function render() {
  const stats = getSquadsStats();

  if (!stats) return;

  statsBody.innerHTML = "";

  statsConfig.forEach((stat) => {
    const aVal = stats.A[stat.key] || 0;
    const bVal = stats.B[stat.key] || 0;

    let aPerc = 0;
    let bPerc = 0;

    if (stat.type === "absolute") {
      const total = aVal + bVal || 1;
      aPerc = aVal / total;
      bPerc = bVal / total;
    }

    if (stat.type === "relative") {
      const aBase = stats.A[stat.base] || 1;
      const bBase = stats.B[stat.base] || 1;
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
