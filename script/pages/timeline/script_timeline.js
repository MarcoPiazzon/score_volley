//console.log("MODULE LOADED");
import Match from "../../model/match.js";
import Player from "../../model/player.js";
import { updateBenchDOM, updateCourtDOM } from "../../utils.js";

const match_json = JSON.parse(localStorage.getItem("openMatch"));
console.log(match_json);
const match = Match.fromJSON(match_json);

console.log(match);

// Esempio array di pulsanti e punti
const sets = match.sets;
let selectedSet = 1; //default
const events = sets[selectedSet - 1].events;
//console.log(events);
let selectedPoint = 1; //default
let selectedPlayerOnSelectedPlayer = 1; //numero del player attualmente scelto nel punto, l'array parte da 0

//console.log(events[selectedPoint - 1]);
let selectedPlayer =
  events[selectedPoint - 1].touchOfPlayers[selectedPlayerOnSelectedPlayer - 1]; //player corrispondente

//console.log(selectedPlayer);
loadPoint(events[selectedPoint - 1]);
console.log(match.players_map);
function createOnCourtPlayer(number) {
  const player = document.createElement("div");
  player.classList.add("player");

  const badges = document.createElement("div");
  badges.classList.add("badges");

  const cards = document.createElement("div");
  cards.classList.add("cards");

  player.textContent = number;
  player.appendChild(badges);
  player.appendChild(cards);
  return player;
}

function createOnBenchPlayer(number, name, surname) {
  const bench_player = document.createElement("div");
  bench_player.classList.add("bench-player");

  const selected_out = document.createElement("div");
  selected_out.classList.add("selected-out");

  const cards = document.createElement("div");
  cards.classList.add("cards");

  const player_name = document.createElement("div");
  player_name.classList.add("player-name");

  selected_out.innerHTML = number;
  selected_out.appendChild(cards);

  player_name.innerHTML = name + " " + surname;

  bench_player.appendChild(selected_out);
  bench_player.appendChild(player_name);

  return bench_player;
}

function addToUIOnCourt(div, side) {
  const players = document.querySelector(".half." + side);

  players.appendChild(div);
}

function addToUIOnBench(div, side) {
  const players = document.querySelector("#bench-" + side);
  players.appendChild(div);
}

function addToUI(div, side, onCourt) {
  if (onCourt) addToUIOnCourt(div, side);
  else addToUIOnBench(div, side);
}

function createPlayer(p, side) {
  const id = p.id;
  const role = null; //per ora non gestito
  const team = p.team;

  let div = null;
  if (p.onCourt) {
    //addToCourt
    div = createOnCourtPlayer(id);
  } else {
    div = createOnBenchPlayer(id, p.name, p.surname);
  }

  console.log(div);
  console.log(id);

  addToUI(div, side, p.onCourt);

  const player = new Player(id, team, role, div, p.onCourt); //true perché sono i titolari

  match.players_map.set(div, player);
  match.domByPlayer.set(player.id, div);
}

document.addEventListener("DOMContentLoaded", () => {
  //inizializzo tutti i player
  console.log(sets[selectedSet - 1].startingLineUp.A);

  //match.highlightPlayer(match.servingSquad.servingPlayer.dom); //match.servingSquad.servingPlayer
});

// Popola pulsanti
const buttonRow = document.getElementById("buttonRow");
sets.forEach((set) => {
  const btn = document.createElement("button");
  btn.textContent = set.number;
  btn.addEventListener("click", () => {
    selectedSet = set.number;
    // Qui puoi filtrare l'elenco punti dinamicamente se vuoi
  });
  buttonRow.appendChild(btn);
});

// Popola elenco punti
const pointsList = document.getElementById("pointsList");
events.forEach((event) => {
  const btn = document.createElement("button");

  btn.textContent = event.squadA.score + " - " + event.squadB.score;
  btn.addEventListener("click", () => {
    loadPoint(event);
    // Qui puoi gestire il click sul punto
  });
  pointsList.appendChild(btn);
});

function loadPoint(event) {
  updateScore(event);
  updatePlayers(event);

  console.log(match.domByPlayer);
  selectedPlayer = event.touchOfPlayers[selectedPlayerOnSelectedPlayer];
}

function highlightPlayer(p) {
  //console.log(p);
  // rimuovi la palla da tutti
  document
    .querySelectorAll(".player .badges")
    .forEach((b) => (b.innerHTML = ""));

  document
    .querySelectorAll(".player")
    .forEach((b) => b.classList.remove("selected"));

  console.log(p);

  const badge = document.createElement("div");
  badge.classList.add("ball");
  badge.textContent = "🏐";

  p.querySelector(".badges").appendChild(badge);

  p.classList.add("selected");
}

function updateScore(event) {
  //squadA
  let score = document.querySelectorAll(".scorebar." + event.squadA.side)[0];

  //console.log(event.squadA);
  score.querySelectorAll(".field-score")[0].innerHTML = event.squadA.score;
  score.querySelectorAll(".set-score")[0].innerHTML = event.squadA.setsWon;

  //squadB
  score = document.querySelectorAll(".scorebar." + event.squadB.side)[0];

  score.querySelectorAll(".field-score")[0].innerHTML = event.squadB.score;
  score.querySelectorAll(".set-score")[0].innerHTML = event.squadB.setsWon;

  //console.log(score);
}

function removeAllPlayers() {
  document.getElementsByClassName("half left").item(0).innerHTML = "";
  document.getElementsByClassName("half right").item(0).innerHTML = "";
}

function searchPlayer(playerId) {
  match.players_map.forEach((p) => {
    console.log(p.id + " - " + playerId);
    console.log(typeof p.id);
    console.log(typeof playerId);
    if (p.id === playerId) return p;
  });
  return true;
}

function updatePlayers(event) {
  removeAllPlayers();
  match.players_map = new Map();
  match.domByPlayer = new Map();
  event.squadA.players.forEach((p) => createPlayer(p, event.squadA.side));
  event.squadB.players.forEach((p) => createPlayer(p, event.squadB.side));

  console.log();
  highlightPlayer(match.domByPlayer.get(event.playerToSet.id));

  console.log(match.players_map);
}

/**
 * Metodo per andare avanti nel punteggio: da 1-1 a 1-2
 */
function nextPoint() {
  if (selectedPoint === events.length) {
    //fine del set
    return;
  }
  selectedPoint++;
  selectedPlayerOnSelectedPlayer = 0;
}

/**
 * Metodo per andare indietro nel punteggio: da 1-2 a 1-1
 */
function prevPoint() {
  if (selectedPoint === 0) {
    //inizio del set
    return;
  }
  selectedPoint--;
  selectedPlayerOnSelectedPlayer = 0;
}

/**
 * Metodo per andare avanti nel punteggio: da 1-1 a 1-2
 */
function goOnPoint() {
  if (selectedPlayerOnSelectedPlayer === events.currentSelectedPlayers.length) {
    //fine del punto
    return;
  }
  selectedPlayerOnSelectedPlayer++;
}

/**
 * Metodo per andare indietro nel punteggio: da 1-2 a 1-1
 */
function backOnPoint() {
  if (selectedPlayerOnSelectedPlayer === 0) {
    //inizio del set
    return;
  }
  selectedPlayerOnSelectedPlayer--;
}
