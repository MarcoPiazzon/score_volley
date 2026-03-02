import { STAT } from "../../enums.js";

let players = [];
let currentStat = STAT.ATTACK_WIN;

const fileInput = document.getElementById("fileInput");
const filtersDiv = document.getElementById("filters");
const tableBody = document.getElementById("tableBody");
const statHeader = document.getElementById("statHeader");

const res = await fetch(API + "/teams", {
  headers: {
    Authorization: "Bearer " + TOKEN,
  },
});

let team = await res.json();

team = team[1];
console.log(team);

loadPlayers(team.id);

async function loadPlayers(teamId) {
  const [resA, resB] = await Promise.all([
    fetch(API + `/teams/${teamId}/players`, {
      headers: { Authorization: "Bearer " + TOKEN },
    }),
  ]);

  players = await resA.json();

  console.log(players);
  renderTable();
  //renderTeam(".half.left", playersA);
  //renderTeam(".half.right", playersB);
}

const res1 = await fetch(API + "/matches", {
  headers: {
    Authorization: "Bearer " + TOKEN,
  },
});
const matches = await res1.json();

console.log(matches);

const container = document.getElementById("matches");

matches.forEach((m) => {
  console.log(m);
  const div = document.createElement("div");
  div.textContent = `Giornata ${m.numberday} — ${new Date(m.date).toLocaleDateString()}`;

  const buttonFormazioni = document.createElement("button");
  buttonFormazioni.innerHTML = "Formazione";
  buttonFormazioni.addEventListener("click", () => openLineupToast(m));

  div.appendChild(buttonFormazioni);

  if (m.ismatchfinished === false) {
    const buttonOpenMatch = document.createElement("button");
    buttonOpenMatch.innerHTML = "Apri Match";
    buttonOpenMatch.addEventListener("click", () => openMatch(m));
    div.appendChild(buttonOpenMatch);
  } else {
    const buttonOpenReview = document.createElement("button");
    buttonOpenReview.innerHTML = "Apri Review";
    buttonOpenReview.addEventListener("click", () => openReviewMatch(m.id));
    div.appendChild(buttonOpenReview);
  }

  container.appendChild(div);
});

async function openReviewMatch(matchId) {
  alert(matchId);
  const res = await fetch(`http://localhost:3000/api/matches/${matchId}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const match = await res.json();

  localStorage.setItem("openMatch", JSON.stringify(match));

  window.location.href = "timeline.html";
}

function openMatch(m) {
  localStorage.setItem("idSquadA", m.team_a_id);
  localStorage.setItem("idSquadB", m.team_b_id);

  window.location.href = "home.html";
}

// --- Caricamento JSON ---
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const json = JSON.parse(reader.result);
    players = extractPlayers(json);
    renderTable();
  };
  reader.readAsText(file);
});

// --- Estrazione giocatori dal JSON ---
function extractPlayers(json) {
  const squads = [json.match?.squadA, json.match?.squadB].filter(Boolean);
  const result = [];

  squads.forEach((squad) => {
    [...squad.players, ...squad.bench].forEach((p) => {
      result.push({
        id: p.id,
        team: squad.name,
        stats: p.stats,
      });
    });
  });

  return result;
}

// --- Filtri ---
Object.values(STAT).forEach((stat) => {
  const btn = document.createElement("button");
  btn.textContent = stat;
  btn.onclick = () => {
    document
      .querySelectorAll(".controls button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStat = stat;
    renderTable();
  };
  if (stat === currentStat) btn.classList.add("active");
  filtersDiv.appendChild(btn);
});

// --- Render tabella ---
function renderTable() {
  if (!players.length) return;

  statHeader.textContent = currentStat;

  const sorted = [...players].sort(
    (a, b) => (b.stats[currentStat] || 0) - (a.stats[currentStat] || 0),
  );

  tableBody.innerHTML = "";

  sorted.forEach((p, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${p.id}</td>
        <td>${p.first_name}</td>
        <td>${p.last_name}</td>
        <td>${p.stats[currentStat] || 0}</td>
      `;
    tableBody.appendChild(tr);
  });
}

/**
 * Toasto Formazioni
 */

const toast = document.getElementById("lineup-toast");

function openLineupToast(match) {
  toast.classList.remove("hidden");
  renderAvailablePlayers(match);
}

function closeLineupToast() {
  toast.classList.add("hidden");
}

function renderAvailablePlayers(match) {
  const container = document.getElementById("available-players");
  container.innerHTML = "";

  console.log();

  players.forEach((player) => {
    console.log(player);
    const div = document.createElement("div");
    div.className = "player-item";
    div.textContent = `${player.number} - ${player.first_name} ${player.last_name}`;
    div.draggable = true;

    div.dataset.playerId = player.id;

    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("playerId", player.id);
    });

    container.appendChild(div);
  });
}

document.querySelectorAll(".slot").forEach((slot) => {
  slot.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  slot.addEventListener("drop", (e) => {
    e.preventDefault();

    const playerId = e.dataTransfer.getData("playerId");

    console.log(playerId);
    console.log(players);

    const player = players.find((u) => u.id == playerId);
    console.log(player);
    placePlayerInSlot(slot, player);
  });
});

function placePlayerInSlot(slot, player) {
  // se c'è già qualcuno, lo rimuovo
  if (slot.firstChild) {
    const oldPlayerId = slot.firstChild.dataset.playerId;
    restorePlayerToList(oldPlayerId);
  }

  const div = document.createElement("div");
  div.className = "player-item";
  div.textContent = player.number;
  div.dataset.playerId = player.id;

  slot.innerHTML = "";
  slot.appendChild(div);
  slot.classList.add("filled");

  removePlayerFromList(player.id);
}

function removePlayerFromList(playerId) {
  const playerDiv = document.querySelector(
    `.player-item[data-player-id="${playerId}"]`,
  );

  if (playerDiv) {
    playerDiv.remove();
  }
}

function restorePlayerToList(playerId) {
  const player = players.find((u) => u.id == playerId);

  const container = document.getElementById("available-players");

  const div = document.createElement("div");
  div.className = "player-item";
  div.textContent = `${player.number} - ${player.first_name} ${player.last_name}`;
  div.draggable = true;
  div.dataset.playerId = player.id;

  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("playerId", player.id);
  });

  container.appendChild(div);
}

document.getElementById("confirm-lineup").onclick = () => {
  const lineup = {};

  document.querySelectorAll(".slot").forEach((slot) => {
    const pos = slot.dataset.pos;
    const playerDiv = slot.firstChild;

    if (playerDiv) {
      lineup[pos] = parseInt(playerDiv.dataset.playerId);
    }
  });

  console.log("Lineup:", lineup);

  closeLineupToast();
};

document.getElementById("cancel-lineup").onclick = () => {
  closeLineupToast();
};
