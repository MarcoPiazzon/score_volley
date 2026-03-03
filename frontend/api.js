// ================================================================
//  api.js  —  Client API centralizzato per il frontend
//
//  Importa e usa questo modulo ovunque serve fare chiamate al backend.
//
//  Uso:
//    import api from './api.js';
//
//    const team     = await api.teams.getMe();
//    const stats    = await api.teams.getStats(teamId, { competition_type:'season', competition_id:1 });
//    const matches  = await api.matches.getByTeam(teamId, { competition_type:'season', competition_id:1 });
//
//  Il token JWT viene letto automaticamente da localStorage ad ogni
//  richiesta, così funziona anche dopo un refresh della pagina.
// ================================================================

// ── Configurazione base ─────────────────────────────────────────
const BASE_URL = "/api"; // stesso origin → nessun CORS

// ── Core fetch wrapper ──────────────────────────────────────────
/**
 * Esegue una fetch autenticata.
 * Lancia un Error con { status, message } se la risposta non è OK.
 *
 * @param {string} path    - path relativo a BASE_URL, es. '/teams/1/stats'
 * @param {object} options - opzioni fetch (method, body, ecc.)
 * @returns {Promise<any>} - JSON parsato
 */
async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Token scaduto → redirect al login
  // (non redirige se siamo già su login o register — non hanno token)
  if (res.status === 401) {
    localStorage.removeItem("token");
    const page = window.location.pathname.split("/").pop();
    const publicPages = ["login.html", "register.html", ""];
    if (!publicPages.includes(page)) {
      window.location.href = "/login.html";
    }
    throw new Error("Sessione scaduta");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ── Helper: costruisce query string da un oggetto ───────────────
function toQuery(params = {}) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
}

// ================================================================
//  AUTH
// ================================================================
const auth = {
  /**
   * Login utente.
   * @param {string} username
   * @param {string} password
   * @returns {{ token: string, user: object }}
   */
  login(username, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * Registrazione nuovo utente.
   * @param {{ username, password, confirm_password, email, role,
   *           name, surname, phone?, team_id?, role_label?, invite_code? }} body
   * @returns {{ token, user }}
   */
  register(body) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Profilo utente corrente.
   */
  me() {
    return request("/auth/me");
  },

  /**
   * Logout (fire-and-forget lato server).
   */
  logout() {
    return request("/auth/logout", { method: "POST" });
  },
};

// ================================================================
//  COMPETITIONS
// ================================================================
const competitions = {
  /**
   * Tutte le competizioni (stagioni + tornei) — per dropdown globale.
   */
  getAll() {
    return request("/competitions");
  },

  /**
   * Solo campionati (seasons).
   */
  getSeasons() {
    return request("/competitions/seasons");
  },

  /**
   * Dettaglio di un campionato.
   * @param {number} id
   */
  getSeason(id) {
    return request(`/competitions/seasons/${id}`);
  },

  /**
   * Solo tornei.
   */
  getTournaments() {
    return request("/competitions/tournaments");
  },

  /**
   * Dettaglio di un torneo.
   * @param {number} id
   */
  getTournament(id) {
    return request(`/competitions/tournaments/${id}`);
  },
};

// ================================================================
//  TEAMS
// ================================================================
const teams = {
  /**
   * Lista di tutte le squadre (usata nella registrazione collaboratori).
   */
  getAll() {
    return request("/teams");
  },

  /**
   * Squadra/squadre dell'utente loggato.
   * • collaborator → oggetto { id, name, ... }
   * • coach        → array di squadre allenate
   */
  getMe() {
    return request("/teams/me");
  },

  /**
   * Dettaglio squadra.
   * @param {number} id
   */
  get(id) {
    return request(`/teams/${id}`);
  },

  /**
   * Lista giocatori (anagrafica) della squadra.
   * @param {number} teamId
   */
  getPlayers(teamId) {
    return request(`/teams/${teamId}/players`);
  },

  /**
   * Competizioni a cui ha partecipato la squadra.
   * Usato per popolare il dropdown della dashboard.
   * @param {number} teamId
   * @returns {Array<{ competition_type, competition_id, competition_name, edition, year, is_active }>}
   */
  getCompetitions(teamId) {
    return request(`/teams/${teamId}/competitions`);
  },

  /**
   * KPI aggregati per la KPI strip della dashboard.
   *
   * @param {number} teamId
   * @param {{ competition_type?: string, competition_id?: number }} params
   * @returns {{ matches, wins, losses, sets_won, sets_lost, aces, blocks, recv_pct, kill_pct }}
   */
  getStats(teamId, params = {}) {
    return request(`/teams/${teamId}/stats${toQuery(params)}`);
  },

  /**
   * Classifica giocatori per una competizione.
   *
   * @param {number} teamId
   * @param {{ competition_type?, competition_id?, stat?, limit? }} params
   *   stat: 'pts'|'ace'|'atk'|'kill_pct'|'recv_pct'|'blk'
   * @returns {Array<{ id, name, surname, shirt_number, role, pts, ace, ... }>}
   */
  getPlayerStats(teamId, params = {}) {
    return request(`/teams/${teamId}/players/stats${toQuery(params)}`);
  },

  /**
   * Competizioni vinte dalla squadra.
   * @param {number} teamId
   * @returns {Array<{ competition_type, competition_id, competition_name, year, display_type }>}
   */
  getTrophies(teamId) {
    return request(`/teams/${teamId}/trophies`);
  },
};

// ================================================================
//  MATCHES
// ================================================================
const matches = {
  /**
   * Lista partite globale con filtri opzionali.
   * @param {{ status?, competition_type?, competition_id?, limit?, page? }} params
   */
  getAll(params = {}) {
    return request(`/matches${toQuery(params)}`);
  },

  /**
   * Partite di una squadra specifica, filtrate per competizione.
   * Questo è l'endpoint principale della dashboard.
   *
   * @param {number} teamId
   * @param {{ competition_type?, competition_id?, status? }} params
   * @returns {Array<{ id, status, scheduled_at, home_team, away_team,
   *                   home_sets_won, away_sets_won, is_home, matchday, ... }>}
   */
  getByTeam(teamId, params = {}) {
    return request(`/matches/team/${teamId}${toQuery(params)}`);
  },

  /**
   * Dettaglio completo di una partita (con set).
   * @param {number} id
   */
  get(id) {
    return request(`/matches/${id}`);
  },

  /**
   * Formazione (titolari + panchina) di una partita.
   * @param {number} matchId
   */
  getLineup(matchId) {
    return request(`/matches/${matchId}/lineup`);
  },

  /**
   * Salva la formazione di una squadra per una partita.
   * @param {number} matchId
   * @param {{ team_id: number, players: Array }} body
   */
  saveLineup(matchId, body) {
    return request(`/matches/${matchId}/lineup`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Statistiche complete di una partita.
   * @param {number} matchId
   */
  getStats(matchId) {
    return request(`/matches/${matchId}/stats`);
  },
};

// ================================================================
//  PLAYERS
// ================================================================
const players = {
  /**
   * Anagrafica del giocatore.
   * @param {number} id
   */
  get(id) {
    return request(`/players/${id}`);
  },

  /**
   * Statistiche aggregate del giocatore.
   * @param {number} id
   * @param {{ competition_type?, competition_id? }} params
   */
  getStats(id, params = {}) {
    return request(`/players/${id}/stats${toQuery(params)}`);
  },

  /**
   * Competizioni a cui ha partecipato il giocatore.
   * @param {number} id
   */
  getCompetitions(id) {
    return request(`/players/${id}/competitions`);
  },

  /**
   * Ultime N partite del giocatore.
   * @param {number} id
   * @param {{ limit?, competition_type?, competition_id? }} params
   */
  getMatches(id, params = {}) {
    return request(`/players/${id}/matches${toQuery(params)}`);
  },

  /**
   * Titoli vinti dal giocatore.
   * @param {number} id
   */
  getTrophies(id) {
    return request(`/players/${id}/trophies`);
  },
};

// ================================================================
//  Export default
// ================================================================
const api = { auth, competitions, teams, matches, players };
export default api;
