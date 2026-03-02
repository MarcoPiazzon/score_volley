// ================================================================
//  header.js  —  Header universale per tutte le pagine
//
//  Responsabilità:
//    • Auth guard: se il token manca o non è valido → login.html
//    • Accesso per ruolo: collaboratori vedono solo la propria squadra
//    • Renderizza l'header con: logo, titolo pagina, info utente,
//      menu dropdown (profilo + logout)
//    • Espone l'utente autenticato a tutta la pagina
//
//  Uso in ogni pagina:
//    import { initHeader, getCurrentUser } from './header.js';
//
//    // Nella funzione init() della pagina, PRIMA di qualsiasi altra cosa:
//    const user = await initHeader({
//        pageTitle: 'Dashboard',               // titolo mostrato nell'header
//        teamNameElId: 'team-name-tb',         // (opzionale) id elemento da aggiornare
//        requiredRole: null,                   // null = tutti | 'coach' | 'collaborator'
//    });
//
//    // Da quel momento in poi:
//    const user = getCurrentUser();            // { id, username, role, team_id, name, surname, ... }
//
//  Struttura HTML richiesta nella pagina:
//    <div id="app-header"></div>              ← l'header viene iniettato qui
//
//  Se id="app-header" non esiste, l'header viene prepend a <body>.
// ================================================================

import api from "./api.js";

// ── Stato modulo ─────────────────────────────────────────────────
let _currentUser = null;
let _config = {};

// ================================================================
//  EXPORT PRINCIPALE
// ================================================================

/**
 * Inizializza l'auth guard e l'header.
 * Deve essere chiamata come PRIMA operazione in ogni pagina
 * (attendere il risultato con await prima di fare qualsiasi altra cosa).
 *
 * @param {object} config
 * @param {string}  config.pageTitle      - Titolo della pagina (mostrato nell'header)
 * @param {string}  [config.teamNameElId] - id elemento HTML da aggiornare con nome squadra
 * @param {string}  [config.requiredRole] - null|'coach'|'collaborator' — restringe per ruolo
 * @returns {Promise<object>} - Oggetto utente autenticato
 */
export async function initHeader(config = {}) {
  _config = config;

  // 1. Verifica autenticazione
  const user = await _authGuard();

  // 2. Renderizza header
  _render(user);

  // 3. Se teamNameElId specificato, aggiorna l'elemento con il nome squadra
  if (config.teamNameElId && user.team_name) {
    const el = document.getElementById(config.teamNameElId);
    if (el) el.innerHTML = `${user.team_name} <span>/ Squadra</span>`;
  }

  return user;
}

/**
 * Restituisce l'utente autenticato corrente (dopo initHeader).
 * @returns {object|null}
 */
export function getCurrentUser() {
  return _currentUser;
}

/**
 * Esegue il logout: rimuove token e dati da localStorage e
 * redirige a login.html.
 */
export function logout() {
  // Chiamata fire-and-forget (può fallire senza problemi)
  api.auth.logout?.().catch(() => {});

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.location.href = "login.html";
}

// ================================================================
//  AUTH GUARD
//  Verifica token e permessi; redirect a login.html se fallisce.
// ================================================================
async function _authGuard() {
  const token = localStorage.getItem("token");

  // Nessun token: redirect immediato
  if (!token) {
    _redirectToLogin();
  }

  let user;
  try {
    // Verifica token con il server e recupera dati freschi
    user = await api.auth.me();
  } catch (err) {
    // Token non valido o scaduto
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    _redirectToLogin();
  }

  // Controllo ruolo richiesto
  if (_config.requiredRole && user.role !== _config.requiredRole) {
    _showAccessDenied(
      `Accesso riservato ai ${_config.requiredRole === "coach" ? "coach" : "collaboratori"}.`,
    );
  }

  // Aggiorna cache utente
  _currentUser = user;
  localStorage.setItem("user", JSON.stringify(user));

  return user;
}

// ================================================================
//  RENDERING HEADER
// ================================================================
function _render(user) {
  // Injetta stili (una sola volta)
  if (!document.getElementById("hdr-styles")) {
    const style = document.createElement("style");
    style.id = "hdr-styles";
    style.textContent = _CSS;
    document.head.appendChild(style);
  }

  const container =
    document.getElementById("app-header") ||
    document.body.prepend(document.createElement("div"));

  const roleLabel = _roleLabel(user.role);
  const roleClass = user.role === "coach" ? "coach" : "collab";
  const initials = _initials(user);
  const displayName =
    user.name && user.surname ? `${user.name} ${user.surname}` : user.username;

  const html = `
        <header id="app-hdr">
            <!-- Sinistra: logo + titolo pagina -->
            <div class="hdr-left">
                <div class="hdr-logo" onclick="window.location.href='dashboard.html'">V</div>
                <div class="hdr-page-title" id="hdr-page-title">${_config.pageTitle || ""}</div>
            </div>

            <!-- Centro: slot per contenuto specifico della pagina -->
            <div class="hdr-center" id="hdr-slot"></div>

            <!-- Destra: utente + menu -->
            <div class="hdr-right">
                <div class="hdr-user" id="hdr-user-btn" aria-haspopup="true" aria-expanded="false">
                    <div class="hdr-avatar">${initials}</div>
                    <div class="hdr-user-info">
                        <div class="hdr-user-name">${displayName}</div>
                        <div class="hdr-user-role ${roleClass}">${roleLabel}</div>
                    </div>
                    <div class="hdr-chevron">▾</div>
                </div>

                <!-- Dropdown menu -->
                <div class="hdr-dropdown" id="hdr-dropdown" role="menu">
                    <div class="hdr-drop-user">
                        <div class="hdr-drop-avatar">${initials}</div>
                        <div>
                            <div class="hdr-drop-name">${displayName}</div>
                            <div class="hdr-drop-email">${user.email || ""}</div>
                        </div>
                    </div>
                    <div class="hdr-drop-sep"></div>
                    <button class="hdr-drop-item" id="hdr-profile-btn">
                        <span>👤</span> Il mio profilo
                    </button>
                    <div class="hdr-drop-sep"></div>
                    <button class="hdr-drop-item danger" id="hdr-logout-btn">
                        <span>🚪</span> Esci
                    </button>
                </div>
            </div>
        </header>`;

  const target = document.getElementById("app-header");
  if (target) {
    target.outerHTML = html;
  } else {
    document.body.insertAdjacentHTML("afterbegin", html);
  }

  // ── Event listeners ────────────────────────────────────────
  const userBtn = document.getElementById("hdr-user-btn");
  const dropdown = document.getElementById("hdr-dropdown");
  const logoutBtn = document.getElementById("hdr-logout-btn");
  const profileBtn = document.getElementById("hdr-profile-btn");

  // Toggle dropdown
  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle("open");
    userBtn.setAttribute("aria-expanded", String(open));
  });

  // Chiudi cliccando fuori
  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
    userBtn.setAttribute("aria-expanded", "false");
  });

  // Logout
  logoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    logout();
  });

  // Profilo
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "profile.html";
  });
}

// ================================================================
//  UTILITY
// ================================================================

/** Redirect a login.html preservando la pagina corrente come returnTo */
function _redirectToLogin() {
  const returnTo = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.replace(`login.html?returnTo=${returnTo}`);
  // throw per bloccare l'esecuzione successiva
  throw new Error("REDIRECT_TO_LOGIN");
}

/** Mostra errore accesso negato e blocca la pagina */
function _showAccessDenied(message) {
  document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;height:100vh;gap:14px;
                    background:#0b0e17;color:#e8eaf2;font-family:'Barlow',sans-serif">
            <div style="font-size:44px">🚫</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;
                        font-weight:800;color:#e8eaf2">Accesso negato</div>
            <div style="font-size:13px;color:#7a829a">${message}</div>
            <button onclick="window.location.href='login.html'"
                    style="margin-top:8px;padding:9px 22px;border-radius:7px;
                           border:1px solid #3b8bff;background:rgba(59,139,255,.14);
                           color:#3b8bff;cursor:pointer;font-family:'Barlow Condensed',sans-serif;
                           font-size:13px;font-weight:700;letter-spacing:.5px">
                Torna al login
            </button>
        </div>`;
  throw new Error("ACCESS_DENIED");
}

function _roleLabel(role) {
  return role === "coach" ? "Coach" : "Collaboratore";
}

function _initials(user) {
  if (user.name && user.surname) {
    return `${user.name[0]}${user.surname[0]}`.toUpperCase();
  }
  return user.username?.substring(0, 2).toUpperCase() ?? "??";
}

// ================================================================
//  CSS HEADER (iniettato dinamicamente)
// ================================================================
const _CSS = `
#app-hdr {
    display: flex;
    align-items: center;
    background: #121622;
    border-bottom: 1px solid rgba(255,255,255,.07);
    height: 54px;
    padding: 0 18px;
    gap: 14px;
    flex-shrink: 0;
    position: relative;
    z-index: 100;
}

.hdr-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.hdr-logo {
    width: 32px; height: 32px;
    background: #3b8bff;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 16px; font-weight: 900; color: #fff;
    cursor: pointer;
    flex-shrink: 0;
    transition: background .14s;
}
.hdr-logo:hover { background: #4d98ff; }

.hdr-page-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 18px; font-weight: 900; letter-spacing: .8px;
    color: #e8eaf2;
}
.hdr-page-title span { color: #7a829a; font-weight: 400; font-size: 15px; }

.hdr-center {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.hdr-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    position: relative;
}

/* User badge */
.hdr-user {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: #1a1f30;
    cursor: pointer;
    transition: border-color .14s, background .14s;
    user-select: none;
}
.hdr-user:hover {
    border-color: rgba(255,255,255,.2);
    background: #222840;
}

.hdr-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b8bff, #2255cc);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 800; color: #fff;
    flex-shrink: 0;
}

.hdr-user-info { display: flex; flex-direction: column; gap: 1px; }

.hdr-user-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; font-weight: 700; color: #e8eaf2;
    line-height: 1;
    max-width: 140px;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}

.hdr-user-role {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
}
.hdr-user-role.coach { color: #3b8bff; }
.hdr-user-role.collab { color: #a78bfa; }

.hdr-chevron {
    font-size: 10px; color: #7a829a;
    transition: transform .15s;
}
.hdr-user[aria-expanded="true"] .hdr-chevron { transform: rotate(180deg); }

/* Dropdown */
.hdr-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 230px;
    background: #1a1f30;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.03);
    overflow: hidden;
    display: none;
    animation: hdrFadeIn .15s ease;
    z-index: 200;
}
.hdr-dropdown.open { display: block; }

@keyframes hdrFadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
}

.hdr-drop-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 14px 12px;
}

.hdr-drop-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b8bff, #2255cc);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; font-weight: 800; color: #fff;
    flex-shrink: 0;
}

.hdr-drop-name {
    font-size: 13px; font-weight: 600; color: #e8eaf2;
    line-height: 1.2;
}
.hdr-drop-email {
    font-size: 11px; color: #7a829a;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    max-width: 150px;
}

.hdr-drop-sep {
    height: 1px;
    background: rgba(255,255,255,.07);
    margin: 2px 0;
}

.hdr-drop-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 14px;
    background: none;
    border: none;
    color: #c0c4d0;
    font-family: 'Barlow', sans-serif;
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background .12s, color .12s;
}
.hdr-drop-item:hover {
    background: rgba(255,255,255,.05);
    color: #e8eaf2;
}
.hdr-drop-item.danger { color: #f04e4e; }
.hdr-drop-item.danger:hover { background: rgba(240,78,78,.08); }
.hdr-drop-item span { font-size: 14px; }
`;
