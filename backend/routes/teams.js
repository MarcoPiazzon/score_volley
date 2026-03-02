// ================================================================
//  routes/teams.js  —  MODIFICATO (versione estesa)
//
//  Rotte esistenti confermate + nuove rotte per la dashboard:
//
//  ESISTENTI (invariate):
//    GET  /api/teams                          → lista squadre
//    GET  /api/teams/:id                      → dettaglio squadra
//    GET  /api/teams/:id/players              → giocatori della squadra
//
//  NUOVE:
//    GET  /api/teams/:id/competitions         → stagioni + tornei della squadra
//    GET  /api/teams/:id/stats                → KPI aggregati per competizione
//    GET  /api/teams/:id/players/stats        → classifica giocatori per competizione
//    GET  /api/teams/:id/trophies             → competizioni vinte
//    GET  /api/teams/me                       → squadra dell'utente loggato
//
//  Query params per filtro competizione (su /stats, /players/stats, /matches):
//    ?competition_type=season|tournament  (richiesto se competition_id è presente)
//    ?competition_id=X
//    Se nessuno dei due è presente → aggregato su tutte le competizioni
// ================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate, requireTeamAccess } = require("../middleware/auth");

router.use(authenticate);

// ================================================================
//  HELPER: costruisce il WHERE clause + params per il filtro
//  competizione. Ritorna { whereClause, params }.
//
//  Usato da /stats e /players/stats per filtrare
//  per season_id o tournament_id.
// ================================================================
function buildCompetitionFilter(
  competitionType,
  competitionId,
  tableAlias = "md",
) {
  if (!competitionId || !competitionType) {
    // Nessun filtro: tutte le competizioni
    return { whereClause: "", params: [] };
  }
  const col = competitionType === "season" ? "season_id" : "tournament_id";
  return {
    whereClause: ` AND ${tableAlias}.${col} = ?`,
    params: [parseInt(competitionId)],
  };
}

// ================================================================
//  GET /api/teams
//  Lista di tutte le squadre (utile per admin / selezione).
// ================================================================
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
            SELECT id, name, short_name, city, logo_url, created_at
            FROM teams
            ORDER BY name
        `);
    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/me
//  Restituisce la squadra associata all'utente loggato.
//  • Se collaborator: usa req.user.team_id
//  • Se coach: restituisce lista squadre che allena (attive)
// ================================================================
router.get("/me", async (req, res) => {
  try {
    if (req.user.role === "collaborator") {
      if (!req.user.team_id) {
        return res.status(404).json({ error: "Nessuna squadra associata" });
      }
      const [[team]] = await pool.query(
        "SELECT id, name, short_name, city, logo_url FROM teams WHERE id = ?",
        [req.user.team_id],
      );
      return res.json(team || null);
    }

    // Coach: restituisce tutte le squadre che allena attualmente
    const [teams] = await pool.query(
      `
            SELECT DISTINCT t.id, t.name, t.short_name, t.city, t.logo_url
            FROM coach_assignments ca
            JOIN coaches c  ON c.id  = ca.coach_id
            JOIN users   u  ON u.id  = c.user_id
            JOIN teams   t  ON t.id  = ca.team_id
            WHERE u.id = ? AND ca.is_current = 1
            ORDER BY t.name
        `,
      [req.user.id],
    );
    return res.json(teams);
  } catch (err) {
    console.error("[teams] GET /me", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id
//  Dettaglio di una squadra.
// ================================================================
router.get("/:id", async (req, res) => {
  try {
    const [[team]] = await pool.query(
      "SELECT id, name, short_name, city, logo_url, created_at FROM teams WHERE id = ?",
      [req.params.id],
    );
    if (!team) return res.status(404).json({ error: "Squadra non trovata" });
    res.json(team);
  } catch (err) {
    console.error("[teams] GET /:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/players
//  Lista giocatori della squadra (anagrafica, no stats).
// ================================================================
router.get("/:id/players", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
            SELECT
                p.id, p.name, p.surname, p.shirt_number, p.role,
                p.is_active, p.created_at
            FROM players p
            WHERE p.team_id = ?
            ORDER BY p.shirt_number
        `,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /:id/players", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/competitions
//  Tutte le stagioni + tornei a cui ha partecipato la squadra.
//  Usato per popolare il dropdown della dashboard.
//
//  Response: [
//    { competition_type, competition_id, competition_name,
//      edition, year, is_active, type? }
//  ]
// ================================================================
router.get("/:id/competitions", async (req, res) => {
  const teamId = req.params.id;
  try {
    const [rows] = await pool.query(
      `
            -- Campionati
            SELECT
                'season'                                    AS competition_type,
                s.id                                        AS competition_id,
                s.name                                      AS competition_name,
                CONCAT(s.year_start, '/', s.year_end)       AS edition,
                s.year_start                                AS year,
                s.is_active,
                NULL                                        AS type
            FROM championship_teams ct
            JOIN seasons s ON s.id = ct.season_id
            WHERE ct.team_id = ?

            UNION ALL

            -- Tornei
            SELECT
                'tournament'                                AS competition_type,
                t.id                                        AS competition_id,
                t.name                                      AS competition_name,
                COALESCE(t.edition, CAST(t.year AS CHAR))   AS edition,
                t.year                                      AS year,
                t.is_active,
                t.type                                      AS type
            FROM tournament_teams tt
            JOIN tournaments t ON t.id = tt.tournament_id
            WHERE tt.team_id = ?

            ORDER BY is_active DESC, year DESC
        `,
      [teamId, teamId],
    );

    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /:id/competitions", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/stats
//  KPI aggregati della squadra per la KPI strip della dashboard.
//
//  Query params:
//    ?competition_type=season|tournament
//    ?competition_id=X
//    (se assenti → aggregato su tutte le partite)
//
//  Response: {
//    matches, wins, losses, sets_won, sets_lost,
//    aces, blocks, recv_pct, kill_pct
//  }
// ================================================================
router.get("/:id/stats", async (req, res) => {
  const teamId = parseInt(req.params.id);
  const { competition_type, competition_id } = req.query;
  const { whereClause, params } = buildCompetitionFilter(
    competition_type,
    competition_id,
  );

  // Se è richiesto un filtro competizione, usiamo JOIN su matchdays
  const needsMatchdayJoin = whereClause !== "";

  const matchdayJoin = needsMatchdayJoin
    ? "JOIN matchdays md ON md.id = m.matchday_id"
    : "";

  try {
    const [[stats]] = await pool.query(
      `
            SELECT
                COUNT(DISTINCT m.id)                                AS matches,

                SUM(CASE
                    WHEN (stm.is_home = 1 AND m.home_sets_won > m.away_sets_won)
                      OR (stm.is_home = 0 AND m.away_sets_won > m.home_sets_won)
                    THEN 1 ELSE 0
                END)                                                AS wins,

                SUM(CASE
                    WHEN (stm.is_home = 1 AND m.home_sets_won < m.away_sets_won)
                      OR (stm.is_home = 0 AND m.away_sets_won < m.home_sets_won)
                    THEN 1 ELSE 0
                END)                                                AS losses,

                SUM(CASE WHEN stm.is_home = 1
                    THEN m.home_sets_won
                    ELSE m.away_sets_won
                END)                                                AS sets_won,

                SUM(CASE WHEN stm.is_home = 1
                    THEN m.away_sets_won
                    ELSE m.home_sets_won
                END)                                                AS sets_lost,

                COALESCE(SUM(stm.aces), 0)                          AS aces,
                COALESCE(SUM(stm.block_kills), 0)                   AS blocks,

                ROUND(
                    SUM(stm.reception_positive) /
                    NULLIF(SUM(stm.receptions_total), 0) * 100, 1
                )                                                   AS recv_pct,

                ROUND(
                    SUM(stm.attack_kills) /
                    NULLIF(SUM(stm.attacks_total), 0) * 100, 1
                )                                                   AS kill_pct

            FROM stats_team_match stm
            JOIN matches m  ON m.id = stm.match_id AND m.status = 'completed'
            ${matchdayJoin}
            WHERE stm.team_id = ?
            ${whereClause}
        `,
      [teamId, ...params],
    );

    // Se nessuna partita trovata, restituisce zeri invece di null
    res.json({
      matches: stats.matches || 0,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      sets_won: stats.sets_won || 0,
      sets_lost: stats.sets_lost || 0,
      aces: stats.aces || 0,
      blocks: stats.blocks || 0,
      recv_pct: stats.recv_pct || 0,
      kill_pct: stats.kill_pct || 0,
    });
  } catch (err) {
    console.error("[teams] GET /:id/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/players/stats
//  Classifica giocatori della squadra con statistiche aggregate.
//  Usata per la tabella player ranking della dashboard.
//
//  Query params:
//    ?competition_type=season|tournament
//    ?competition_id=X
//    ?stat=pts|ace|atk|kill_pct|recv_pct|blk   (ordinamento)
//    ?limit=50  (default 50)
//
//  Response: [
//    { id, name, surname, shirt_number, role,
//      matches, pts, ace, atk, kills, kill_pct,
//      recv_total, recv_pct, blk, serve_total, serve_errors }
//  ]
// ================================================================
router.get("/:id/players/stats", async (req, res) => {
  const teamId = parseInt(req.params.id);
  const {
    competition_type,
    competition_id,
    stat = "pts",
    limit = 50,
  } = req.query;
  const { whereClause, params } = buildCompetitionFilter(
    competition_type,
    competition_id,
  );

  const needsMatchdayJoin = whereClause !== "";
  const matchdayJoin = needsMatchdayJoin
    ? "JOIN matchdays md ON md.id = m.matchday_id"
    : "";

  // Colonna di ordinamento sicura (whitelist)
  const ORDER_MAP = {
    pts: "pts DESC",
    ace: "ace DESC",
    atk: "atk DESC",
    kills: "kills DESC",
    kill_pct: "kill_pct DESC",
    recv_pct: "recv_pct DESC",
    blk: "blk DESC",
  };
  const orderBy = ORDER_MAP[stat] || "pts DESC";

  try {
    const [rows] = await pool.query(
      `
            SELECT
                p.id,
                p.name,
                p.surname,
                p.shirt_number,
                p.role,

                COUNT(DISTINCT spm.match_id)                        AS matches,

                COALESCE(SUM(spm.points_scored), 0)                 AS pts,
                COALESCE(SUM(spm.aces), 0)                          AS ace,
                COALESCE(SUM(spm.attacks_total), 0)                 AS atk,
                COALESCE(SUM(spm.attack_kills), 0)                  AS kills,
                COALESCE(SUM(spm.block_kills), 0)                   AS blk,
                COALESCE(SUM(spm.serves_total), 0)                  AS serve_total,
                COALESCE(SUM(spm.serve_errors), 0)                  AS serve_errors,
                COALESCE(SUM(spm.receptions_total), 0)              AS recv_total,
                COALESCE(SUM(spm.reception_positive), 0)            AS recv_pos,

                ROUND(
                    SUM(spm.attack_kills) /
                    NULLIF(SUM(spm.attacks_total), 0) * 100, 1
                )                                                   AS kill_pct,

                ROUND(
                    SUM(spm.reception_positive) /
                    NULLIF(SUM(spm.receptions_total), 0) * 100, 1
                )                                                   AS recv_pct

            FROM stats_player_match spm
            JOIN players p ON p.id   = spm.player_id
            JOIN matches  m ON m.id  = spm.match_id AND m.status = 'completed'
            ${matchdayJoin}
            WHERE spm.team_id = ?
            ${whereClause}
            GROUP BY p.id, p.name, p.surname, p.shirt_number, p.role
            ORDER BY ${orderBy}
            LIMIT ?
        `,
      [teamId, ...params, parseInt(limit)],
    );

    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /:id/players/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/trophies
//  Competizioni vinte dalla squadra.
//
//  La logica di "vittoria":
//  • Per una STAGIONE (campionato): il team con il punteggio
//    più alto nella classifica finale (v_standings).
//  • Per un TORNEO: il team con più vittorie tra quelli
//    partecipanti al torneo (approssimazione senza bracket).
//
//  Response: [
//    { competition_type, competition_id, competition_name,
//      year, display_type }
//  ]
// ================================================================
router.get("/:id/trophies", async (req, res) => {
  const teamId = parseInt(req.params.id);
  try {
    const [rows] = await pool.query(
      `
            -- ── Campionati vinti ──────────────────────────────
            SELECT
                'season'        AS competition_type,
                s.id            AS competition_id,
                s.name          AS competition_name,
                s.year_start    AS year,
                'campionato'    AS display_type
            FROM seasons s
            WHERE s.is_active = 0
              AND ? = (
                  -- Team con più punti in questa stagione
                  SELECT vs.team_id
                  FROM   v_standings vs
                  WHERE  vs.season_id = s.id
                  ORDER  BY vs.points DESC, vs.total_kills DESC
                  LIMIT  1
              )
              AND EXISTS (
                  SELECT 1 FROM championship_teams ct
                  WHERE ct.season_id = s.id AND ct.team_id = ?
              )

            UNION ALL

            -- ── Tornei vinti ──────────────────────────────────
            SELECT
                'tournament'    AS competition_type,
                t.id            AS competition_id,
                t.name          AS competition_name,
                t.year          AS year,
                t.type          AS display_type
            FROM tournaments t
            WHERE t.is_active = 0
              AND ? = (
                  -- Team con più vittorie in questo torneo
                  SELECT  stm.team_id
                  FROM    stats_team_match stm
                  JOIN    matches m  ON m.id  = stm.match_id
                                    AND m.status = 'completed'
                  JOIN    matchdays md ON md.id = m.matchday_id
                                     AND md.tournament_id = t.id
                  GROUP   BY stm.team_id
                  ORDER   BY SUM(
                      CASE
                        WHEN (stm.is_home=1 AND m.home_sets_won > m.away_sets_won)
                          OR (stm.is_home=0 AND m.away_sets_won > m.home_sets_won)
                        THEN 1 ELSE 0
                      END
                  ) DESC
                  LIMIT 1
              )
              AND EXISTS (
                  SELECT 1 FROM tournament_teams tt
                  WHERE tt.tournament_id = t.id AND tt.team_id = ?
              )

            ORDER BY year DESC
        `,
      [teamId, teamId, teamId, teamId],
    );

    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /:id/trophies", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
