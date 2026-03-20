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
//  offset = numero di $N già usati prima di questo filtro
// ================================================================
function buildCompetitionFilter(competitionType, competitionId, offset = 0) {
  if (!competitionId || !competitionType) {
    return { clause: "", params: [] };
  }
  const col =
    competitionType === "season" ? "md.season_id" : "md.tournament_id";
  return {
    clause: ` AND ${col} = $${offset + 1}`,
    params: [parseInt(competitionId)],
  };
}

// ================================================================
//  GET /api/players/:id
// ================================================================
router.get("/:id", async (req, res) => {
  try {
    const rows = await q(
      `
            SELECT
                p.id, p.name, p.surname, p.shirt_number, p.role,
                p.is_active, p.created_at,
                t.id         AS team_id,
                t.name       AS team_name,
                t.short_name AS team_short
            FROM  players p
            JOIN  teams t ON t.id = p.team_id
            WHERE p.id = $1
        `,
      [req.params.id],
    );

    if (!rows[0])
      return res.status(404).json({ error: "Giocatore non trovato" });
    res.json(rows[0]);
  } catch (err) {
    console.error("[players] GET /:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/stats
// ================================================================
router.get("/:id/stats", async (req, res) => {
  const playerId = req.params.id;
  const { competition_type, competition_id } = req.query;

  // $1 = playerId → offset 1 per il filtro competizione
  const { clause, params: fp } = buildCompetitionFilter(
    competition_type,
    competition_id,
    1,
  );
  const mdJoin = fp.length ? "JOIN matchdays md ON md.id = m.matchday_id" : "";

  try {
    const rows = await q(
      `
            SELECT
                COUNT(DISTINCT spm.match_id)                        AS matches,
                COALESCE(SUM(spm.total_points), 0)                 AS pts,

                -- Battuta
                COALESCE(SUM(spm.total_serves), 0)                  AS serves_total,
                COALESCE(SUM(spm.ace), 0)                          AS aces,
                COALESCE(SUM(spm.serves_err), 0)                  AS serve_errors,
                COALESCE(SUM(spm.serves), 0)                AS serve_positive,
                ROUND(SUM(spm.ace)::NUMERIC / NULLIF(SUM(spm.total_serves), 0) * 100, 1)              AS ace_pct,

                -- Ricezione
                COALESCE(SUM(spm.total_receive), 0)              AS receptions_total,
                COALESCE(SUM(spm.def_neg), 0)              AS reception_errors,
                COALESCE(SUM(spm.def_pos), 0)            AS reception_positive,
                COALESCE(SUM(spm.def_neg), 0)            AS reception_negative,
                ROUND(SUM(spm.def_pos)::NUMERIC / NULLIF(SUM(spm.total_receive), 0) * 100, 1) AS recv_pct,

                -- Attacco
                COALESCE(SUM(spm.total_attack), 0)                 AS attacks_total,
                COALESCE(SUM(spm.attack_win), 0)                  AS attack_kills,
                COALESCE(SUM(spm.attack_out), 0)                 AS attack_errors,
                COALESCE(SUM(spm.block_successful), 0)                AS attack_blocked,
                ROUND(SUM(spm.attack_win)::NUMERIC / NULLIF(SUM(spm.total_attack), 0) * 100, 1)     AS kill_pct,

                -- Muro
                COALESCE(SUM(spm.total_block), 0)                  AS blocks_total,
                COALESCE(SUM(spm.block_successful), 0)                   AS block_kills,
                COALESCE(SUM(spm.block_not_successful), 0)                  AS block_errors,

                -- Difesa
                COALESCE(SUM(spm.total_receive), 0)                    AS digs_total,
                COALESCE(SUM(spm.def_pos), 0)                    AS dig_errors,

                -- Disciplina
                COALESCE(SUM(spm.card_yellow), 0)                  AS cards_yellow,
                COALESCE(SUM(spm.card_red), 0)                     AS cards_red

            FROM  stats_player_match spm
            JOIN  matches m ON m.id = spm.match_id AND m.status = 'completed'
            ${mdJoin}
            WHERE spm.player_id = $1
            ${clause}
        `,
      [playerId, ...fp],
    );

    res.json(rows[0] ?? {});
  } catch (err) {
    console.error("[players] GET /:id/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/competitions
// ================================================================
router.get("/:id/competitions", async (req, res) => {
  const playerId = req.params.id;
  try {
    // $1 viene usato in entrambe le sotto-query della UNION
    const rows = await q(
      `
            SELECT
                'season'                                AS competition_type,
                s.id                                    AS competition_id,
                s.name                                  AS competition_name,
                s.year_start || '/' || s.year_end       AS edition,
                s.year_start                            AS year,
                COUNT(DISTINCT spm.match_id)            AS matches_played
            FROM  stats_player_match spm
            JOIN  matches   m  ON m.id  = spm.match_id AND m.status = 'completed'
            JOIN  matchdays md ON md.id = m.matchday_id AND md.season_id IS NOT NULL
            JOIN  seasons   s  ON s.id  = md.season_id
            WHERE spm.player_id = $1
            GROUP BY s.id, s.name, s.year_start, s.year_end

            UNION ALL

            SELECT
                'tournament'                            AS competition_type,
                t.id                                    AS competition_id,
                t.name                                  AS competition_name,
                COALESCE(t.edition, t.year::TEXT)       AS edition,
                t.year                                  AS year,
                COUNT(DISTINCT spm.match_id)            AS matches_played
            FROM  stats_player_match spm
            JOIN  matches     m  ON m.id  = spm.match_id AND m.status = 'completed'
            JOIN  matchdays   md ON md.id = m.matchday_id AND md.tournament_id IS NOT NULL
            JOIN  tournaments t  ON t.id  = md.tournament_id
            WHERE spm.player_id = $1
            GROUP BY t.id, t.name, t.edition, t.year

            ORDER BY year DESC
        `,
      [playerId],
    );

    res.json(rows);
  } catch (err) {
    console.error("[players] GET /:id/competitions", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/matches
// ================================================================
router.get("/:id/matches", async (req, res) => {
  const playerId = req.params.id;
  const { limit = 10, competition_type, competition_id } = req.query;

  // $1 = playerId → offset 1 per il filtro competizione
  const { clause, params: fp } = buildCompetitionFilter(
    competition_type,
    competition_id,
    1,
  );
  const mdJoin = fp.length ? "JOIN matchdays md ON md.id = m.matchday_id" : "";

  // LIMIT è l'ultimo parametro → $1 + fp.length + 1
  const limitIdx = 1 + fp.length + 1;

  try {
    // Verifica che il giocatore esista
    const playerRows = await q("SELECT team_id FROM players WHERE id = $1", [
      playerId,
    ]);
    if (!playerRows[0])
      return res.status(404).json({ error: "Giocatore non trovato" });

    const rows = await q(
      `
            SELECT
                m.id                                            AS match_id,
                COALESCE(m.played_at, m.scheduled_at)          AS date,
                ht.name                                         AS home_team,
                at.name                                         AS away_team,
                m.home_sets_won,
                m.away_sets_won,
                (spm.team_id = m.home_team_id)                  AS is_home,

                spm.total_points                               AS pts,
                spm.ace                                        AS ace,
                spm.total_attack                               AS atk,
                spm.attack_win                                AS kills,
                ROUND(spm.attack_win::NUMERIC / NULLIF(spm.total_attack, 0) * 100, 1)         AS kill_pct,
                ROUND(spm.def_pos::NUMERIC / NULLIF(spm.total_receive, 0) * 100, 1) AS recv_pct,
                spm.total_block                                 AS blk,

                CASE
                    WHEN (spm.team_id = m.home_team_id AND m.home_sets_won > m.away_sets_won)
                      OR (spm.team_id = m.away_team_id AND m.away_sets_won > m.home_sets_won)
                    THEN 'W'
                    ELSE 'L'
                END                                             AS result

            FROM  stats_player_match spm
            JOIN  matches m  ON m.id  = spm.match_id AND m.status = 'completed'
            JOIN  teams   ht ON ht.id = m.home_team_id
            JOIN  teams   at ON at.id = m.away_team_id
            ${mdJoin}
            WHERE spm.player_id = $1
            ${clause}
            ORDER BY COALESCE(m.played_at, m.scheduled_at) DESC
            LIMIT $${limitIdx}
        `,
      [playerId, ...fp, parseInt(limit)],
    );

    res.json(rows);
  } catch (err) {
    console.error("[players] GET /:id/matches", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/trophies
// ================================================================
router.get("/:id/trophies", async (req, res) => {
  const playerId = req.params.id;
  try {
    // $1 e $2 sono entrambi playerId (due sotto-query separate nella UNION)
    const rows = await q(
      `
            SELECT
                'season'        AS competition_type,
                s.id            AS competition_id,
                s.name          AS competition_name,
                s.year_start    AS year,
                'campionato'    AS display_type,
                t.name          AS team_name
            FROM  seasons s
            JOIN (
                SELECT DISTINCT md.season_id, spm.team_id
                FROM  stats_player_match spm
                JOIN  matches   m  ON m.id  = spm.match_id AND m.status = 'completed'
                JOIN  matchdays md ON md.id = m.matchday_id
                WHERE spm.player_id = $1 AND md.season_id IS NOT NULL
            ) participation ON participation.season_id = s.id
            JOIN  teams t ON t.id = participation.team_id
            WHERE s.is_active = 0
              AND participation.team_id = (
                  SELECT vs.team_id FROM v_standings vs
                  WHERE  vs.season_id = s.id
                  ORDER  BY vs.points DESC, vs.total_kills DESC
                  LIMIT  1
              )

            UNION ALL

            SELECT
                'tournament'    AS competition_type,
                trn.id          AS competition_id,
                trn.name        AS competition_name,
                trn.year        AS year,
                trn.type::TEXT  AS display_type,
                t.name          AS team_name
            FROM  tournaments trn
            JOIN (
                SELECT DISTINCT md.tournament_id, spm.team_id
                FROM  stats_player_match spm
                JOIN  matches   m  ON m.id  = spm.match_id AND m.status = 'completed'
                JOIN  matchdays md ON md.id = m.matchday_id
                WHERE spm.player_id = $2 AND md.tournament_id IS NOT NULL
            ) participation ON participation.tournament_id = trn.id
            JOIN  teams t ON t.id = participation.team_id
            WHERE trn.is_active = 0
              AND participation.team_id = (
                  SELECT  stm.team_id
                  FROM    stats_team_match stm
                  JOIN    matches   m  ON m.id  = stm.match_id AND m.status = 'completed'
                  JOIN    matchdays md ON md.id = m.matchday_id AND md.tournament_id = trn.id
                  GROUP   BY stm.team_id
                  ORDER   BY SUM(CASE
                      WHEN (stm.is_home = 1 AND m.home_sets_won > m.away_sets_won)
                        OR (stm.is_home = 0 AND m.away_sets_won > m.home_sets_won)
                      THEN 1 ELSE 0
                  END) DESC
                  LIMIT 1
              )

            ORDER BY year DESC
        `,
      [playerId, playerId],
    );

    res.json(rows);
  } catch (err) {
    console.error("[players] GET /:id/trophies", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
