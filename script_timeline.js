//console.log("MODULE LOADED");
import { Player } from "./player.js"; // ❌ se il file è Squad.js

const match = JSON.parse(localStorage.getItem("openMatch"));

console.log(match);

function onCourtClickHandler(e) {
  const div = e.currentTarget;
  clickEventListener(div);
}

function clickEventListener(p) {
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

    updateCourtDOM(squad);
    updateBenchDOM(squad);

    match.logEventSubstitute(match.selectedOutPlayer, match.players_map.get(p));

    console.log("player_map");
    console.log(match.players_map);
    changeMode = false;
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

document.addEventListener("DOMContentLoaded", () => {
  console.log("ok");
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
    const team = p.closest(".panel").classList.contains("left") ? "A" : "B";

    const player = new Player(id, team, role, p, false); //false perché sono i titolari
    match.players_map.set(p, player);

    if (team === "A") {
      squadA.addBenchPlayer(player);
    } else {
      squadB.addBenchPlayer(player);
    }

    p.addEventListener("click", onSubClickHandler);
  });

  match.highlightPlayer(match.servingSquad.servingPlayer.dom); //match.servingSquad.servingPlayer
});
