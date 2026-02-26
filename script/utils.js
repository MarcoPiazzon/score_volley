import { STAT, CARD_TYPE } from "./enums.js";

let buttonsAttack = document.querySelectorAll(".attack");
let buttonsServe = document.querySelectorAll(".serve");
let buttonsDefence = document.querySelectorAll(".defence");
let buttonsBlock = document.querySelectorAll(".block");
let buttonsFwb = document.querySelectorAll(".fwb");
let buttonsCards = document.querySelectorAll(".cards");
let buttonsTechnical = document.querySelectorAll(".technical");
let timeoutButtons = document.querySelectorAll(".timeout");

const onCourtHandlers = new WeakMap();

/**
 * onCourt
 * @param {*} playerDom
 * @param {*} match
 */

export function attachOnCourtHandler(playerDom, match) {
  //console.log(match);
  const handler = (e) => onCourtClickHandler(e, match);
  onCourtHandlers.set(playerDom, handler);
  playerDom.addEventListener("click", handler);
  //console.log(match);
}

export function resetButtons(match) {
  //ripristino il selected player
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

export function detachOnCourtHandler(playerDom) {
  const handler = onCourtHandlers.get(playerDom);
  if (!handler) return;

  playerDom.removeEventListener("click", handler);
  onCourtHandlers.delete(playerDom);
}

export function onCourtClickHandler(e, match) {
  const div = e.currentTarget;
  clickEventListener(div, match);
}

export function clickEventListener(p, match) {
  console.log("remp");
  const players = document.querySelectorAll(" .player");
  players.forEach((pl) => pl.classList.remove("selected"));

  console.log(match);
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

  const player = match.players_map.get(p);
  console.log("test player");
  console.log(player);
  console.log("changeMode:" + match.changeMode);
  if (match.changeMode) {
    console.log("parte1");
    match.selectedOutPlayer = player;
    return;
  }

  const squad = match.squadA.players.includes(player)
    ? match.squadA
    : match.squadB;
  //console.log("cardMode: " + match.cardMode);
  if (match.cardMode) {
    //console.log("assegno giallo");
    const player = match.players_map.get(p);
    console.log("assegno " + match.cardMode);

    if (match.cardMode === CARD_TYPE.CARD_RED)
      assignStats(match, player, squad, STAT.CARD_RED);
    else assignStats(match, player, squad, STAT.CARD_YELLOW);

    assignStats(match, player, squad, STAT.TOTAL_CARD);

    match.logEventCard(player, "card", match.cardMode);
    //console.log(player);
    updatePlayerCardUI(player, match.cardMode);
    match.disableCardMode();
    match.highlightPlayer(match.servingSquad.servingPlayer);
    resetButtons(match);
    return;
  }

  assignStats(match, player, squad, STAT.TOUCHES);
  match.highlightPlayer(player);
}

/**
 * SUB
 * @param {*} playerDom
 * @returns
 */

export function attachOnSubHandler(playerDom, match) {
  const handler = (e) => onSubClickHandler(e, match);
  onCourtHandlers.set(playerDom, handler);
  playerDom.addEventListener("click", handler);
}

export function detachOnSubHandler(playerDom) {
  const handler = onCourtHandlers.get(playerDom);
  if (!handler) return;

  playerDom.removeEventListener("click", handler);
  onCourtHandlers.delete(playerDom);
}

export function onSubClickHandler(e, match) {
  const div = e.currentTarget;
  clickEventSub(div, match);
}

export function clickEventSub(p, match) {
  if (match.changeMode && match.selectedOutPlayer) {
    const squad = match.squadA.players.includes(match.selectedOutPlayer)
      ? match.squadA
      : match.squadB; //se il player appartiene alla squadA
    console.log("squad");
    //console.log(squad);

    match.addToSnapshotSub(
      match.selectedOutPlayer.team,
      match.selectedOutPlayer,
      match.players_map.get(p),
    );
    squad.substitute(
      match.selectedOutPlayer,
      match.players_map.get(p),
      match.players_map,
      match,
    );

    updateCourtDOM(squad);
    updateBenchDOM(squad);

    match.logEventSubstitute(match.selectedOutPlayer, match.players_map.get(p));

    console.log("player_map");
    console.log(match.players_map);
    match.changeMode = false;
    match.resetSelectedOutPlayer();
    //resetButtons();
    match.highlightPlayer(match.servingSquad.servingPlayer);
  }

  //console.log("cardMode: " + match.cardMode);
  if (match.cardMode) {
    const player = match.players_map.get(p);
    const squad = match.squadA.players.includes(p)
      ? match.squadA
      : match.squadB; //se il player appartiene alla squadA
    console.log("assegno " + match.cardMode);

    if (match.cardMode === CARD_TYPE.CARD_RED)
      assignStats(match, player, squad, STAT.CARD_RED);
    else assignStats(match, player, squad, STAT.CARD_YELLOW);

    assignStats(match, player, squad, STAT.TOTAL_CARD);

    match.logEventCard(player, "card", match.cardMode);
    //console.log(player);
    updatePlayerCardUI(player, match.cardMode);
    match.disableCardMode();
    match.highlightPlayer(match.servingSquad.servingPlayer.dom);
    resetButton();
    return;
  }
}

function updatePlayerCardUI(player, type) {
  const cardsDiv = player.dom.querySelector(".cards");

  console.log(type);

  const card = document.createElement("div");
  card.classList.add("card", type.split("-")[1]); // "yellow" o "red"

  cardsDiv.appendChild(card);
}

export function updateCourtDOM(squad) {
  const halfElement = document.querySelector(`.half.${squad.side}`);
  console.log(squad);
  squad.players.forEach((player) => {
    console.log(player.dom);
  });

  //console.log(halfElement);
  // svuota la metà per inserire i player ordinati
  halfElement.innerHTML = "";

  // inserisci i div dei player nella giusta posizione
  squad.players.forEach((player) => {
    //console.log(player.dom);
    halfElement.appendChild(player.dom); // ⚡ inserisce fisicamente nel DOM
    //player.dom.textContent = player.id + "\n" + (player.role?.charAt(0) || "");
    //player.dom.classList.add("player"); // aggiungi classi necessarie
  });
}

export function updateBenchDOM(squad) {
  const benchContainer = document.querySelector(`#bench-${squad.side}`);
  benchContainer.innerHTML = "";

  squad.bench.forEach((player) => {
    benchContainer.appendChild(player.dom);
  });
}

/**
 * funzione che assegna tutte le statistiche a player,squad e set
 */
export function assignStats(match, player, squad, type) {
  //player

  match.addStatPlayer(player, type);
  match.addStatSquad(squad, type);
  match.addStatSet(player, type);
}
