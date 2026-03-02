// ================================================================
//  dashboard.js  —  Dashboard Squadra  (ES module)
//
//  Flusso avvio:
//    1. initHeader()   → verifica JWT, mostra header, redirect se non loggato
//    2. resolveTeam()  → determina la squadra da mostrare
//                        • collaboratore  → usa user.team_id
//                        • coach 1 squadra → usa quella
//                        • coach N squadre → mostra selettore nell'header
//    3. mountHeaderSlot()  → inietta comp-select + pulsante nell'hdr-slot
//    4. loadCompetitions() → popola il dropdown
//    5. loadAll()          → KPI + giocatori + partite in parallelo
//    6. loadTrophies()     → pannello trofei (indipendente dalla comp)
//    7. hideLoadingScreen()
// ================================================================

import { initHeader, getCurrentUser } from "./header.js";
import api from "./api.js";

// ================================================================
//  STATO
// ================================================================
const state = {
  teamId: null,
  teamName: "",
  competitions: [],
  currentComp: { type: null, id: null }, // null = tutte
  currentStat: "pts",
};

const STAT_LABELS = {
  pts: "Punti",
  ace: "Ace",
  atk: "Attacchi",
  kills: "Kill",
  kill_pct: "Kill %",
  recv_pct: "Ric. %",
  blk: "Muri",
};

const TROPHY_ICONS = {
  campionato: "🏆",
  cup: "🥇",
  supercup: "🌟",
  european: "🌍",
  playoff: "🏅",
  friendly: "🤝",
};

// ================================================================
//  ENTRY POINT
// ================================================================
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    // ── 1. Auth guard + header ──────────────────────────────
    // initHeader verifica il JWT con /api/auth/me.
    // Se il token manca o è scaduto, redirige a login.html.
    // Se il ruolo non corrisponde a requiredRole, mostra errore.
    const user = await initHeader({
      pageTitle: "Dashboard",
      requiredRole: null, // null = coach E collaboratore possono accedere
    });

    // ── 2. Determina la squadra da mostrare ─────────────────
    await resolveTeam(user);

    // ── 3. Inietta controlli nell'hdr-slot ──────────────────
    mountHeaderSlot();

    // ── 4. Carica competizioni e popola dropdown ────────────
    await loadCompetitions();

    // ── 5. Carica le pill stat (solo HTML, nessuna API) ──────
    buildStatPills();

    // ── 6. Carica KPI + giocatori + partite ─────────────────
    await loadAll();

    // ── 7. Carica trofei (indipendente dalla competizione) ───
    await loadTrophies();
  } catch (err) {
    // Gli errori REDIRECT_TO_LOGIN e ACCESS_DENIED sono gestiti
    // da initHeader e non arrivano qui. Gli altri li mostriamo.
    if (
      err.message !== "REDIRECT_TO_LOGIN" &&
      err.message !== "ACCESS_DENIED"
    ) {
      console.error("[dashboard] Errore fatale:", err);
      showFatalError(err.message);
    }
  } finally {
    hideLoadingScreen();
  }
}

// ================================================================
//  RISOLUZIONE SQUADRA
//  Determina quale squadra mostrare in base al ruolo.
// ================================================================
async function resolveTeam(user) {
  // ── Collaboratore ───────────────────────────────────────────
  // Il team_id è già nel JWT. Usiamo quello, nessuna scelta.
  if (user.role === "collaborator") {
    if (!user.team_id) {
      throw new Error(
        "Nessuna squadra associata al tuo account. Contatta l'amministratore.",
      );
    }
    const team = await api.teams.get(user.team_id);
    state.teamId = team.id;
    state.teamName = team.name;
    return;
  }

  // ── Coach ───────────────────────────────────────────────────
  // Recupera la lista di squadre che allena attualmente.
  const teams = await api.teams.getMe(); // array per i coach

  if (!teams || !teams.length) {
    throw new Error(
      "Nessuna squadra associata al tuo account. Contatta l'amministratore.",
    );
  }

  if (teams.length === 1) {
    // Una sola squadra: la usiamo senza mostrare il selettore
    state.teamId = teams[0].id;
    state.teamName = teams[0].name;
    return;
  }

  // Più squadre: controlla se c'è una preferenza salvata
  const savedTeamId = parseInt(localStorage.getItem("selectedTeamId"));
  const savedTeam = savedTeamId
    ? teams.find((t) => t.id === savedTeamId)
    : null;

  if (savedTeam) {
    state.teamId = savedTeam.id;
    state.teamName = savedTeam.name;
  } else {
    // Default: prima squadra della lista
    state.teamId = teams[0].id;
    state.teamName = teams[0].name;
  }

  // Mostra il selettore squadra nell'header per i coach con più squadre
  mountTeamSelector(teams);
}

// ================================================================
//  SLOT HEADER
//  Inietta i controlli specifici della dashboard nel centro
//  dell'header universale (div#hdr-slot creato da header.js).
// ================================================================
function mountHeaderSlot() {
  const slot = document.getElementById("hdr-slot");
  if (!slot) return;

  slot.innerHTML = `
        <div class="hdr-sep"></div>
        <span class="comp-label">Competizione</span>
        <div class="select-wrap">
            <select class="styled-select" id="comp-select">
                <option value="">Tutte le competizioni</option>
            </select>
            <span class="select-arrow">▼</span>
        </div>
        <div class="tb-spacer"></div>
        <button class="tb-btn primary" id="btn-new-match">▶ Nuova Partita</button>
    `;

  // Aggiorna il titolo nell'header con il nome squadra
  const hdrTitle = document.getElementById("hdr-page-title");
  if (hdrTitle) {
    hdrTitle.innerHTML = `${state.teamName} <span>/ Dashboard</span>`;
  }

  // Event listeners
  document
    .getElementById("comp-select")
    .addEventListener("change", onCompChange);
  document.getElementById("btn-new-match").addEventListener("click", () => {
    window.location.href = "monitor.html";
  });
}

// ================================================================
//  SELETTORE SQUADRA (solo coach con più squadre)
//  Iniettato in hdr-slot prima del separatore, come primo elemento.
// ================================================================
function mountTeamSelector(teams) {
  // Viene chiamato prima di mountHeaderSlot, quindi va aggiunto dopo
  // oppure si aggiunge al render. Lo gestiamo dopo mountHeaderSlot
  // iniettando all'inizio dello slot.
  const slot = document.getElementById("hdr-slot");
  if (!slot) return;

  const wrap = document.createElement("div");
  wrap.className = "hdr-team-selector";
  wrap.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";

  wrap.innerHTML = `
        <span class="team-sel-label" style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">Squadra</span>
        <div class="select-wrap">
            <select class="styled-select" id="team-select" style="min-width:180px;">
                ${teams.map((t) => `<option value="${t.id}" ${t.id === state.teamId ? "selected" : ""}>${t.name}</option>`).join("")}
            </select>
            <span class="select-arrow">▼</span>
        </div>`;

  slot.prepend(wrap);

  document
    .getElementById("team-select")
    .addEventListener("change", async (e) => {
      const newTeamId = parseInt(e.target.value);
      const team = teams.find((t) => t.id === newTeamId);
      if (!team) return;

      state.teamId = team.id;
      state.teamName = team.name;
      localStorage.setItem("selectedTeamId", String(team.id));

      // Aggiorna titolo header
      const hdrTitle = document.getElementById("hdr-page-title");
      if (hdrTitle)
        hdrTitle.innerHTML = `${team.name} <span>/ Dashboard</span>`;

      // Ricarica tutto per la nuova squadra
      state.competitions = [];
      state.currentComp = { type: null, id: null };
      await loadCompetitions();
      await Promise.all([loadAll(), loadTrophies()]);
    });
}

// ================================================================
//  SCHERMATA DI CARICAMENTO
// ================================================================
function hideLoadingScreen() {
  const screen = document.getElementById("loading-screen");
  if (!screen) return;
  screen.classList.add("hidden");
  setTimeout(() => screen.remove(), 350);
}

// ================================================================
//  DROPDOWN COMPETIZIONI
// ================================================================
async function loadCompetitions() {
  state.competitions = await api.teams.getCompetitions(state.teamId);

  const sel = document.getElementById("comp-select");
  if (!sel) return;

  sel.innerHTML = '<option value="">Tutte le competizioni</option>';

  let lastYear = null;
  for (const comp of state.competitions) {
    // Optgroup per anno
    if (comp.year !== lastYear) {
      const grp = document.createElement("optgroup");
      grp.label = String(comp.year);
      sel.appendChild(grp);
      lastYear = comp.year;
    }
    const opt = document.createElement("option");
    opt.value = JSON.stringify({
      type: comp.competition_type,
      id: comp.competition_id,
    });
    opt.textContent = comp.competition_name + (comp.is_active ? "  ●" : "");
    sel.lastElementChild.appendChild(opt);
  }
}

// ================================================================
//  CAMBIO COMPETIZIONE
// ================================================================
async function onCompChange() {
  const sel = document.getElementById("comp-select");
  const val = sel?.value;

  if (!val) {
    state.currentComp = { type: null, id: null };
  } else {
    try {
      const parsed = JSON.parse(val);
      state.currentComp = { type: parsed.type, id: parsed.id };
    } catch {
      state.currentComp = { type: null, id: null };
    }
  }

  syncTrophyHighlight();
  await loadAll();
}

async function selectCompetition(compType, compId) {
  state.currentComp = { type: compType, id: compId };

  // Aggiorna dropdown
  const sel = document.getElementById("comp-select");
  if (sel) {
    const target = JSON.stringify({ type: compType, id: compId });
    for (const opt of sel.options) {
      if (opt.value === target) {
        sel.value = target;
        break;
      }
    }
  }

  syncTrophyHighlight();
  await loadAll();
}

// ================================================================
//  CARICAMENTO PARALLELO
// ================================================================
async function loadAll() {
  const params = buildCompParams();
  await Promise.all([
    loadKPIs(params),
    loadPlayerRanking(params),
    loadMatches(params),
  ]);
}

function buildCompParams() {
  const { type, id } = state.currentComp;
  if (!type || !id) return {};
  return { competition_type: type, competition_id: id };
}

// ================================================================
//  KPI STRIP
// ================================================================
async function loadKPIs(params) {
  try {
    const s = await api.teams.getStats(state.teamId, params);
    const wp = s.matches ? Math.round((s.wins / s.matches) * 100) : 0;

    setText("kpi-matches", s.matches ?? 0);
    setText("kpi-wins", s.wins ?? 0);
    setText("kpi-losses", s.losses ?? 0);
    setText("kpi-winpct", `${wp}%`);
    setText("kpi-sets-w", s.sets_won ?? 0);
    setText("kpi-sets-l", s.sets_lost ?? 0);
    setText("kpi-aces", s.aces ?? 0);
    setText("kpi-blocks", s.blocks ?? 0);
    setText("kpi-pos", `${s.recv_pct ?? 0}%`);
    setText("kpi-kill", `${s.kill_pct ?? 0}%`);

    const bar = document.getElementById("kpi-win-bar");
    if (bar) bar.style.width = `${wp}%`;
  } catch (err) {
    console.error("[dashboard] loadKPIs:", err);
  }
}

// ================================================================
//  CLASSIFICA GIOCATORI
// ================================================================
function buildStatPills() {
  const container = document.getElementById("filters");
  if (!container) return;
  container.innerHTML = "";

  for (const [key, label] of Object.entries(STAT_LABELS)) {
    const btn = document.createElement("button");
    btn.className = `filter-pill${key === state.currentStat ? " active" : ""}`;
    btn.textContent = label;
    btn.dataset.stat = key;
    btn.addEventListener("click", async () => {
      state.currentStat = key;
      container
        .querySelectorAll(".filter-pill")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setText("stat-active-label", label);
      await loadPlayerRanking(buildCompParams());
    });
    container.appendChild(btn);
  }
}

async function loadPlayerRanking(params) {
  const tbody = document.getElementById("tableBody");
  const empty = document.getElementById("emptyState");
  if (!tbody) return;

  try {
    const players = await api.teams.getPlayerStats(state.teamId, {
      ...params,
      stat: state.currentStat,
      limit: 50,
    });

    setText("statHeader", STAT_LABELS[state.currentStat] || state.currentStat);
    setText("stat-active-label", STAT_LABELS[state.currentStat] || "");

    tbody.innerHTML = "";

    if (!players.length) {
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";

    const statKey = state.currentStat;
    const maxVal = players[0]?.[statKey] ?? 1;

    players.forEach((p, i) => {
      const val = p[statKey] ?? 0;
      const barPct = Math.round((val / Math.max(maxVal, 1)) * 100);
      const initials = `${p.surname[0] || ""}${p.name[0] || ""}`.toUpperCase();
      const dispVal = statKey.includes("pct") ? `${val}%` : val;

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><span class="td-rank${i < 3 ? " top" : ""}">${i + 1}</span></td>
                <td>
                    <div class="player-cell">
                        <div class="pa">${initials}</div>
                        <div>
                            <div class="pn-name">${p.surname} ${p.name}</div>
                            <div class="pn-role">${formatRole(p.role)} · #${p.shirt_number}</div>
                        </div>
                    </div>
                </td>
                <td><span class="td-stat">${dispVal}</span></td>
                <td>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width:${barPct}%"></div>
                    </div>
                </td>`;
      tr.addEventListener(
        "click",
        () => (window.location.href = `player.html?id=${p.id}`),
      );
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("[dashboard] loadPlayerRanking:", err);
    if (empty) empty.style.display = "flex";
  }
}

// ================================================================
//  PARTITE
// ================================================================
async function loadMatches(params) {
  const container = document.getElementById("matches-list");
  const countEl = document.getElementById("match-count");
  if (!container) return;

  container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin .7s linear infinite">⏳</div><div class="empty-text">Caricamento…</div></div>`;

  try {
    const matches = await api.matches.getByTeam(state.teamId, params);

    if (countEl) countEl.textContent = `${matches.length} totali`;
    container.innerHTML = "";

    if (!matches.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓️</div><div class="empty-text">Nessuna partita per questa competizione</div></div>`;
      return;
    }

    const live = matches.filter((m) => m.status === "in_progress");
    const upcoming = matches.filter(
      (m) => m.status === "scheduled" || m.status === "postponed",
    );
    const played = matches.filter((m) => m.status === "completed");

    if (live.length) appendMatchSection(container, "🔴 In corso", live);
    if (upcoming.length)
      appendMatchSection(container, "▸ Da disputare", upcoming);
    if (played.length) appendMatchSection(container, "▸ Disputate", played);
  } catch (err) {
    console.error("[dashboard] loadMatches:", err);
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Errore nel caricamento partite</div></div>`;
  }
}

function appendMatchSection(container, label, matches) {
  const lbl = document.createElement("div");
  lbl.className = "match-section-label";
  lbl.textContent = label;
  container.appendChild(lbl);
  matches.forEach((m) => container.appendChild(buildMatchCard(m)));
}

function buildMatchCard(m) {
  const card = document.createElement("div");
  const isPlayed = m.status === "completed";
  const isLive = m.status === "in_progress";
  const isHome = m.home_team_id === state.teamId;
  const myScore =
    isPlayed || isLive ? (isHome ? m.home_sets_won : m.away_sets_won) : null;
  const oppScore =
    isPlayed || isLive ? (isHome ? m.away_sets_won : m.home_sets_won) : null;
  const won = (isPlayed || isLive) && myScore > oppScore;

  card.className = `match-card ${isPlayed ? "played" : isLive ? "live" : "upcoming"}`;

  const rawDate = m.played_at || m.scheduled_at;
  const dateStr = rawDate
    ? new Date(rawDate).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const timeStr =
    rawDate && !isPlayed
      ? new Date(rawDate).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const badgeLabel = isLive
    ? "In corso"
    : isPlayed
      ? "Disputata"
      : "In programma";
  const badgeClass = isLive ? "live" : isPlayed ? "played" : "upcoming";

  const scoreHtml =
    isPlayed || isLive
      ? `<div class="match-score">
               <span class="${won ? "score-w" : "score-l"}">${myScore}</span>
               <span style="color:var(--subtle);margin:0 2px">:</span>
               <span class="${won ? "score-l" : "score-w"}">${oppScore}</span>
           </div>`
      : `<div class="match-score"><span class="score-vs">VS</span></div>`;

  card.innerHTML = `
        <div class="match-status-row">
            <span class="ms-badge ${badgeClass}">${badgeLabel}</span>
            <span class="ms-day">Giornata ${m.matchday ?? "—"}</span>
        </div>
        <div class="match-teams">
            <div class="match-team">${m.home_team}</div>
            ${scoreHtml}
            <div class="match-team right">${m.away_team}</div>
        </div>
        <div class="match-footer">
            <div class="match-date-info">
                <span>📅</span><span>${dateStr}</span>
                ${timeStr ? `<span>${timeStr}</span>` : ""}
                ${m.venue ? `<span>· ${m.venue}</span>` : ""}
            </div>
            <div style="display:flex;gap:5px">
                ${
                  isPlayed
                    ? `<button class="action-btn open"   data-id="${m.id}">▶ Apri</button>`
                    : isLive
                      ? `<button class="action-btn open"   data-id="${m.id}">🔴 Monitor</button>`
                      : `<button class="action-btn lineup" data-id="${m.id}">⬡ Formazione</button>`
                }
            </div>
        </div>`;

  // Delegazione eventi
  const btn = card.querySelector("[data-id]");
  btn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (isPlayed || isLive) {
      await openMatch(m.id);
    } else {
      await loadLineup(m.id, btn);
    }
  });

  // Click sull'intera card (solo se giocata)
  if (isPlayed) card.addEventListener("click", () => openMatch(m.id));

  return card;
}

// ================================================================
//  TROFEI
// ================================================================
async function loadTrophies() {
  const container = document.getElementById("trophies-list");
  const countEl = document.getElementById("trophy-count");
  if (!container) return;

  try {
    const trophies = await api.teams.getTrophies(state.teamId);

    if (countEl) countEl.textContent = trophies.length;
    container.innerHTML = "";

    if (!trophies.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏅</div><div class="empty-text">Nessun titolo ancora</div></div>`;
      return;
    }

    for (const t of trophies) {
      const icon = TROPHY_ICONS[t.display_type] || "🏆";
      const typeLabel =
        t.competition_type === "season"
          ? "Campionato"
          : formatTournamentType(t.display_type);

      const card = document.createElement("div");
      card.className = "trophy-card";
      card.dataset.compType = t.competition_type;
      card.dataset.compId = t.competition_id;

      card.innerHTML = `
                <div class="tc-icon">${icon}</div>
                <div class="tc-info">
                    <div class="tc-name">${t.competition_name}</div>
                    <div class="tc-meta">
                        <span class="tc-type ${t.competition_type === "season" ? "camp" : "tourn"}">${typeLabel}</span>
                    </div>
                </div>
                <div class="tc-year">${t.year}</div>`;

      card.addEventListener("click", () =>
        selectCompetition(t.competition_type, t.competition_id),
      );
      container.appendChild(card);
    }

    syncTrophyHighlight();
  } catch (err) {
    console.error("[dashboard] loadTrophies:", err);
    if (container)
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Errore caricamento titoli</div></div>`;
  }
}

function syncTrophyHighlight() {
  const { type, id } = state.currentComp;
  document.querySelectorAll(".trophy-card").forEach((card) => {
    card.classList.toggle(
      "active",
      card.dataset.compType === type &&
        parseInt(card.dataset.compId) === parseInt(id),
    );
  });
}

// ================================================================
//  NAVIGAZIONE
// ================================================================
async function openMatch(matchId) {
  try {
    const match = await api.matches.get(matchId);
    localStorage.setItem("openMatch", JSON.stringify(match));
  } catch (err) {
    console.warn("[dashboard] openMatch fetch failed, navigating anyway:", err);
  }
  window.location.href = "timeline.html";
}

async function loadLineup(matchId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⌛ Caricamento…";
  }
  try {
    const lineup = await api.matches.getLineup(matchId);
    localStorage.setItem("pendingLineup", JSON.stringify({ matchId, lineup }));
    window.location.href = "lineup.html";
  } catch (err) {
    console.error("[dashboard] loadLineup:", err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⬡ Formazione";
    }
    showToast("Errore nel caricamento della formazione", "error");
  }
}

// ================================================================
//  UTILITY
// ================================================================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatRole(role) {
  const MAP = {
    setter: "Palleggiatore",
    outside_hitter: "Schiacciatore",
    opposite: "Opposto",
    middle_blocker: "Centrale",
    libero: "Libero",
    defensive_specialist: "Difensore",
  };
  return MAP[role] || role;
}

function formatTournamentType(type) {
  const MAP = {
    cup: "Coppa",
    supercup: "Supercoppa",
    european: "Europea",
    playoff: "Playoff",
    friendly: "Amichevole",
  };
  return MAP[type] || "Torneo";
}

function showToast(message, type = "info") {
  const t = document.createElement("div");
  t.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:${type === "error" ? "var(--red-dim)" : "var(--surf-3)"};
        border:1px solid ${type === "error" ? "var(--red)" : "var(--border-m)"};
        color:${type === "error" ? "var(--red)" : "var(--text)"};
        padding:10px 20px;border-radius:8px;font-size:13px;
        font-family:'Barlow Condensed',sans-serif;font-weight:700;
        z-index:9999;pointer-events:none;animation:hdrFadeIn .2s ease;`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function showFatalError(message) {
  document.getElementById("app").innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;height:100vh;gap:12px;color:var(--muted)">
            <div style="font-size:40px">⚠️</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;color:var(--text)">
                Impossibile caricare la dashboard
            </div>
            <div style="font-size:13px;max-width:320px;text-align:center">${message}</div>
            <button onclick="window.location.href='login.html'"
                    style="margin-top:8px;padding:8px 20px;border-radius:6px;
                           border:1px solid var(--a);background:var(--a-dim);
                           color:var(--a);cursor:pointer;font-family:'Barlow Condensed',sans-serif;
                           font-size:13px;font-weight:700;letter-spacing:.5px">
                Torna al login
            </button>
        </div>`;
}
