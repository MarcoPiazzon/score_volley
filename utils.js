import { STAT } from "./enums.js";
import {
  match,
  buttonsAttack,
  buttonsDefence,
  buttonsBlock,
  buttonsFwb,
  buttonsTechnical,
  buttonsCards,
  buttonsServe,
  assignStats,
} from "./script.js";

export function onCourtClickHandler(e) {
  const div = e.currentTarget;
  clickEventListener(div);
}

export function clickEventListener(p) {
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

  const squad = match.squadA.players.includes(player)
    ? match.squadA
    : match.squadB;
  //console.log("cardMode: " + match.cardMode);
  if (match.cardMode) {
    //console.log("assegno giallo");
    const player = match.players_map.get(p);
    console.log("assegno " + match.cardMode);

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

export function onSubClickHandler(e) {
  const div = e.currentTarget;
  clickEventSub(div);
}

export function clickEventSub(p) {
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
    squad.substitute(match.selectedOutPlayer, match.players_map.get(p));

    updateCourtDom(squad);
    updateBenchDOM(squad);

    match.logEventSubstitute(match.selectedOutPlayer, match.players_map.get(p));

    console.log("player_map");
    console.log(match.players_map);
    match.changeMode = false;
    match.resetSelectedOutPlayer();

    match.highlightPlayer(match.servingSquad.servingPlayer.dom);
  }

  //console.log("cardMode: " + match.cardMode);
  if (match.cardMode) {
    const player = match.players_map.get(p);
    const squad = match.squadA.players.includes(p)
      ? match.squadA
      : match.squadB; //se il player appartiene alla squadA
    console.log("assegno " + match.cardMode);

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
}

export function updateCourtDOM(squad) {
  const halfElement = document.querySelector(`.half.${squad.side}`);

  //console.log(halfElement);
  // svuota la metà per inserire i player ordinati
  halfElement.innerHTML = "";

  // inserisci i div dei player nella giusta posizione
  squad.players.forEach((player) => {
    halfElement.appendChild(player.dom); // ⚡ inserisce fisicamente nel DOM
    player.dom.textContent = player.id + "\n" + (player.role?.charAt(0) || "");
    player.dom.classList.add("player"); // aggiungi classi necessarie
  });
}

export function updateBenchDOM(squad) {
  const benchContainer = document.querySelector(`#bench-${squad.side}`);
  benchContainer.innerHTML = "";

  squad.bench.forEach((player) => {
    benchContainer.appendChild(player.dom);
  });
}
