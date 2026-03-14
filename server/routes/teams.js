const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// ================================================================
//  HELPER: query semplice
// ================================================================
async function q(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}

// ================================================================
//  HELPER: filtro competizione
//
//  offset = numero di $N già usati nella query prima di questo
//  filtro, così il placeholder viene numerato correttamente.
//
//  Esempio:
//    WHERE stm.team_id = $1          ← offset=1
//    buildCompetitionFilter(..., 1)  → "AND md.season_id = $2"
// ================================================================
function buildCompetitionFilter(
  competitionType,
  competitionId,
  offset = 0,
  tableAlias = "md",
) {
  if (!competitionId || !competitionType) {
    return { whereClause: "", params: [] };
  }
  const col = competitionType === "season" ? "season_id" : "tournament_id";
  return {
    whereClause: ` AND ${tableAlias}.${col} = $${offset + 1}`,
    params: [parseInt(competitionId)],
  };
}

// ================================================================
//  GET /api/teams
// ================================================================
router.get("/", async (_req, res) => {
  try {
    const rows = await q(`
            SELECT id, name, short_name, city, logo_url, created_at
            FROM   teams
            ORDER  BY name
        `);
    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/me
// ================================================================
router.get("/me", async (req, res) => {
  try {
    if (req.user.role === "collaborator") {
      if (!req.user.team_id) {
        return res.status(404).json({ error: "Nessuna squadra associata" });
      }
      const rows = await q(
        "SELECT id, name, short_name, city, logo_url FROM teams WHERE id = $1",
        [req.user.team_id],
      );
      return res.json(rows[0] ?? null);
    }

    // Coach: tutte le squadre che allena attualmente
    const rows = await q(
      `
            SELECT DISTINCT t.id, t.name, t.short_name, t.city, t.logo_url
            FROM   coach_assignments ca
            JOIN   coaches c ON c.id = ca.coach_id
            JOIN   users   u ON u.id = c.user_id
            JOIN   teams   t ON t.id = ca.team_id
            WHERE  u.id = $1 AND ca.is_current = 1
            ORDER  BY t.name
        `,
      [req.user.id],
    );
    return res.json(rows);
  } catch (err) {
    console.error("[teams] GET /me", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id
// ================================================================
router.get("/:id", async (req, res) => {
  try {
    const rows = await q(
      "SELECT id, name, short_name, city, logo_url, created_at FROM teams WHERE id = $1",
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Squadra non trovata" });
    res.json(rows[0]);
  } catch (err) {
    console.error("[teams] GET /:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/players
// ================================================================
router.get("/:id/players", async (req, res) => {
  try {
    const rows = await q(
      `
            SELECT p.id, p.name, p.surname, p.shirt_number, p.role,
                   p.is_active, p.created_at
            FROM   players p
            WHERE  p.team_id = $1
            ORDER  BY p.shirt_number
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
// ================================================================
router.get("/:id/competitions", async (req, res) => {
  try {
    // $1 viene usato in entrambe le sotto-query UNION
    const rows = await q(
      `
            SELECT
                'season'                                AS competition_type,
                s.id                                    AS competition_id,
                s.name                                  AS competition_name,
                s.year_start || '/' || s.year_end       AS edition,
                s.year_start                            AS year,
                s.is_active,
                NULL::TEXT                              AS type
            FROM  championship_teams ct
            JOIN  seasons s ON s.id = ct.season_id
            WHERE ct.team_id = $1

            UNION ALL

            SELECT
                'tournament'                            AS competition_type,
                t.id                                    AS competition_id,
                t.name                                  AS competition_name,
                COALESCE(t.edition, t.year::TEXT)       AS edition,
                t.year                                  AS year,
                t.is_active,
                t.type::TEXT                            AS type
            FROM  tournament_teams tt
            JOIN  tournaments t ON t.id = tt.tournament_id
            WHERE tt.team_id = $1

            ORDER BY is_active DESC, year DESC
        `,
      [req.params.id],
    );

    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /:id/competitions", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/stats
// ================================================================
router.get("/:id/stats", async (req, res) => {
  const teamId = parseInt(req.params.id);
  const { competition_type, competition_id } = req.query;

  // $1 = teamId → offset 1 per il filtro competizione
  const { whereClause, params: fp } = buildCompetitionFilter(
    competition_type,
    competition_id,
    1,
  );
  const mdJoin = fp.length ? "JOIN matchdays md ON md.id = m.matchday_id" : "";

  try {
    const rows = await q(
      `
            SELECT
                COUNT(DISTINCT m.id)                                        AS matches,

                SUM(CASE
                    WHEN (stm.is_home = 1 AND m.home_sets_won > m.away_sets_won)
                      OR (stm.is_home = 0 AND m.away_sets_won > m.home_sets_won)
                    THEN 1 ELSE 0
                END)                                                        AS wins,

                SUM(CASE
                    WHEN (stm.is_home = 1 AND m.home_sets_won < m.away_sets_won)
                      OR (stm.is_home = 0 AND m.away_sets_won < m.home_sets_won)
                    THEN 1 ELSE 0
                END)                                                        AS losses,

                SUM(CASE WHEN stm.is_home = 1 THEN m.home_sets_won ELSE m.away_sets_won END) AS sets_won,
                SUM(CASE WHEN stm.is_home = 1 THEN m.away_sets_won ELSE m.home_sets_won END) AS sets_lost,

                COALESCE(SUM(stm.ace), 0)                                  AS aces,
                COALESCE(SUM(stm.total_block), 0)                           AS blocks,

                ROUND(
                    SUM(stm.def_pos)::NUMERIC /
                    NULLIF(SUM(stm.total_receive), 0) * 100, 1
                )                                                           AS recv_pct,

                ROUND(
                    SUM(stm.attack_win)::NUMERIC /
                    NULLIF(SUM(stm.total_attack), 0) * 100, 1
                )                                                           AS kill_pct

            FROM  stats_team_match stm
            JOIN  matches m ON m.id = stm.match_id AND m.status = 'completed'
            ${mdJoin}
            WHERE stm.team_id = $1
            ${whereClause}
        `,
      [teamId, ...fp],
    );

    const s = rows[0] ?? {};
    res.json({
      matches: Number(s.matches) || 0,
      wins: Number(s.wins) || 0,
      losses: Number(s.losses) || 0,
      sets_won: Number(s.sets_won) || 0,
      sets_lost: Number(s.sets_lost) || 0,
      aces: Number(s.aces) || 0,
      blocks: Number(s.blocks) || 0,
      recv_pct: Number(s.recv_pct) || 0,
      kill_pct: Number(s.kill_pct) || 0,
    });
  } catch (err) {
    console.error("[teams] GET /:id/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/players/stats
// ================================================================
router.get("/:id/players/stats", async (req, res) => {
  const teamId = parseInt(req.params.id);
  const {
    competition_type,
    competition_id,
    stat = "pts",
    limit = 50,
  } = req.query;

  // $1 = teamId → offset 1 per il filtro competizione
  const { whereClause, params: fp } = buildCompetitionFilter(
    competition_type,
    competition_id,
    1,
  );
  const mdJoin = fp.length ? "JOIN matchdays md ON md.id = m.matchday_id" : "";

  // LIMIT è l'ultimo parametro → $1 + fp.length + 1
  const limitIdx = 1 + fp.length + 1;

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
    const rows = await q(
      `
            SELECT
                p.id, p.name, p.surname, p.shirt_number, p.role,

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
                    SUM(spm.attack_kills)::NUMERIC /
                    NULLIF(SUM(spm.attacks_total), 0) * 100, 1
                )                                                   AS kill_pct,

                ROUND(
                    SUM(spm.reception_positive)::NUMERIC /
                    NULLIF(SUM(spm.receptions_total), 0) * 100, 1
                )                                                   AS recv_pct

            FROM  stats_player_match spm
            JOIN  players p ON p.id = spm.player_id
            JOIN  matches m ON m.id = spm.match_id AND m.status = 'completed'
            ${mdJoin}
            WHERE spm.team_id = $1
            ${whereClause}
            GROUP BY p.id, p.name, p.surname, p.shirt_number, p.role
            ORDER BY ${orderBy}
            LIMIT $${limitIdx}
        `,
      [teamId, ...fp, parseInt(limit)],
    );

    res.json(rows);
  } catch (err) {
    console.error("[teams] GET /:id/players/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:id/trophies
// ================================================================
router.get("/:id/trophies", async (req, res) => {
  const teamId = parseInt(req.params.id);
  try {
    // teamId compare 4 volte → $1 $2 $3 $4 (tutti lo stesso valore)
    const rows = await q(
      `
            SELECT
                'season'        AS competition_type,
                s.id            AS competition_id,
                s.name          AS competition_name,
                s.year_start    AS year,
                'campionato'    AS display_type
            FROM  seasons s
            WHERE s.is_active = 0
              AND $1 = (
                  SELECT vs.team_id
                  FROM   v_standings vs
                  WHERE  vs.season_id = s.id
                  ORDER  BY vs.points DESC, vs.total_kills DESC
                  LIMIT  1
              )
              AND EXISTS (
                  SELECT 1 FROM championship_teams ct
                  WHERE  ct.season_id = s.id AND ct.team_id = $2
              )

            UNION ALL

            SELECT
                'tournament'    AS competition_type,
                t.id            AS competition_id,
                t.name          AS competition_name,
                t.year          AS year,
                t.type::TEXT    AS display_type
            FROM  tournaments t
            WHERE t.is_active = 0
              AND $3 = (
                  SELECT  stm.team_id
                  FROM    stats_team_match stm
                  JOIN    matches   m  ON m.id   = stm.match_id AND m.status = 'completed'
                  JOIN    matchdays md ON md.id  = m.matchday_id AND md.tournament_id = t.id
                  GROUP   BY stm.team_id
                  ORDER   BY SUM(CASE
                      WHEN (stm.is_home = 1 AND m.home_sets_won > m.away_sets_won)
                        OR (stm.is_home = 0 AND m.away_sets_won > m.home_sets_won)
                      THEN 1 ELSE 0
                  END) DESC
                  LIMIT 1
              )
              AND EXISTS (
                  SELECT 1 FROM tournament_teams tt
                  WHERE  tt.tournament_id = t.id AND tt.team_id = $4
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
