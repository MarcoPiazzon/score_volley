// ================================================================
//  routes/players.js  —  MODIFICATO (versione estesa)
//
//  ESISTENTI:
//    GET  /api/players/:id           → anagrafica giocatore
//
//  NUOVE:
//    GET  /api/players/:id/stats     → statistiche aggregate
//                                     (tutte le competizioni o una)
//    GET  /api/players/:id/competitions → competizioni a cui ha partecipato
//    GET  /api/players/:id/matches   → ultime N partite del giocatore
//    GET  /api/players/:id/trophies  → titoli vinti dal giocatore
// ================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// ================================================================
//  HELPER
// ================================================================
function buildCompetitionFilter(competitionType, competitionId) {
  if (!competitionId || !competitionType) return { clause: "", params: [] };
  const col =
    competitionType === "season" ? "md.season_id" : "md.tournament_id";
  return { clause: ` AND ${col} = ?`, params: [parseInt(competitionId)] };
}

// ================================================================
//  GET /api/players/:id
//  Anagrafica completa del giocatore.
// ================================================================
router.get("/:id", async (req, res) => {
  try {
    const [[player]] = await pool.query(
      `
            SELECT
                p.id, p.name, p.surname, p.shirt_number, p.role,
                p.is_active, p.created_at,
                t.id   AS team_id,
                t.name AS team_name,
                t.short_name AS team_short
            FROM players p
            JOIN teams t ON t.id = p.team_id
            WHERE p.id = ?
        `,
      [req.params.id],
    );

    if (!player)
      return res.status(404).json({ error: "Giocatore non trovato" });
    res.json(player);
  } catch (err) {
    console.error("[players] GET /:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/stats
//  Statistiche aggregate del giocatore.
//
//  Query params:
//    ?competition_type=season|tournament
//    ?competition_id=X
//    (se assenti → tutte le competizioni)
//
//  Response: {
//    matches, pts, ace, atk, kills, kill_pct,
//    recv_total, recv_pct, blk, ...
//  }
// ================================================================
router.get("/:id/stats", async (req, res) => {
  const playerId = req.params.id;
  const { competition_type, competition_id } = req.query;
  const { clause, params } = buildCompetitionFilter(
    competition_type,
    competition_id,
  );

  const needsMatchdayJoin = clause !== "";
  const matchdayJoin = needsMatchdayJoin
    ? "JOIN matchdays md ON md.id = m.matchday_id"
    : "";

  try {
    const [[stats]] = await pool.query(
      `
            SELECT
                COUNT(DISTINCT spm.match_id)                        AS matches,

                COALESCE(SUM(spm.points_scored), 0)                 AS pts,

                -- Battuta
                COALESCE(SUM(spm.serves_total), 0)                  AS serves_total,
                COALESCE(SUM(spm.aces), 0)                          AS aces,
                COALESCE(SUM(spm.serve_errors), 0)                  AS serve_errors,
                COALESCE(SUM(spm.serve_positive), 0)                AS serve_positive,
                ROUND(SUM(spm.aces)/NULLIF(SUM(spm.serves_total),0)*100,1) AS ace_pct,

                -- Ricezione
                COALESCE(SUM(spm.receptions_total), 0)              AS receptions_total,
                COALESCE(SUM(spm.reception_errors), 0)              AS reception_errors,
                COALESCE(SUM(spm.reception_positive), 0)            AS reception_positive,
                COALESCE(SUM(spm.reception_negative), 0)            AS reception_negative,
                ROUND(SUM(spm.reception_positive)/NULLIF(SUM(spm.receptions_total),0)*100,1) AS recv_pct,

                -- Attacco
                COALESCE(SUM(spm.attacks_total), 0)                 AS attacks_total,
                COALESCE(SUM(spm.attack_kills), 0)                  AS attack_kills,
                COALESCE(SUM(spm.attack_errors), 0)                 AS attack_errors,
                COALESCE(SUM(spm.attack_blocked), 0)                AS attack_blocked,
                ROUND(SUM(spm.attack_kills)/NULLIF(SUM(spm.attacks_total),0)*100,1) AS kill_pct,

                -- Muro
                COALESCE(SUM(spm.blocks_total), 0)                  AS blocks_total,
                COALESCE(SUM(spm.block_kills), 0)                   AS block_kills,
                COALESCE(SUM(spm.block_errors), 0)                  AS block_errors,

                -- Difesa
                COALESCE(SUM(spm.digs_total), 0)                    AS digs_total,
                COALESCE(SUM(spm.dig_errors), 0)                    AS dig_errors,

                -- Disciplina
                COALESCE(SUM(spm.cards_yellow), 0)                  AS cards_yellow,
                COALESCE(SUM(spm.cards_red), 0)                     AS cards_red

            FROM stats_player_match spm
            JOIN matches m ON m.id = spm.match_id AND m.status = 'completed'
            ${matchdayJoin}
            WHERE spm.player_id = ?
            ${clause}
        `,
      [playerId, ...params],
    );

    res.json(stats || {});
  } catch (err) {
    console.error("[players] GET /:id/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/competitions
//  Lista delle competizioni a cui ha partecipato il giocatore.
//  Usato per il dropdown della pagina giocatore.
//
//  Response: [
//    { competition_type, competition_id, competition_name,
//      edition, year, matches_played }
//  ]
// ================================================================
router.get("/:id/competitions", async (req, res) => {
  const playerId = req.params.id;
  try {
    const [rows] = await pool.query(
      `
            -- Stagioni
            SELECT
                'season'                                    AS competition_type,
                s.id                                        AS competition_id,
                s.name                                      AS competition_name,
                CONCAT(s.year_start,'/',s.year_end)         AS edition,
                s.year_start                                AS year,
                COUNT(DISTINCT spm.match_id)                AS matches_played
            FROM stats_player_match spm
            JOIN matches   m  ON m.id  = spm.match_id AND m.status = 'completed'
            JOIN matchdays md ON md.id = m.matchday_id AND md.season_id IS NOT NULL
            JOIN seasons   s  ON s.id  = md.season_id
            WHERE spm.player_id = ?
            GROUP BY s.id, s.name, s.year_start, s.year_end

            UNION ALL

            -- Tornei
            SELECT
                'tournament'                                AS competition_type,
                t.id                                        AS competition_id,
                t.name                                      AS competition_name,
                COALESCE(t.edition, CAST(t.year AS CHAR))   AS edition,
                t.year                                      AS year,
                COUNT(DISTINCT spm.match_id)                AS matches_played
            FROM stats_player_match spm
            JOIN matches      m  ON m.id  = spm.match_id AND m.status = 'completed'
            JOIN matchdays    md ON md.id = m.matchday_id AND md.tournament_id IS NOT NULL
            JOIN tournaments  t  ON t.id  = md.tournament_id
            WHERE spm.player_id = ?
            GROUP BY t.id, t.name, t.edition, t.year

            ORDER BY year DESC
        `,
      [playerId, playerId],
    );

    res.json(rows);
  } catch (err) {
    console.error("[players] GET /:id/competitions", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/matches
//  Ultime N partite disputate dal giocatore.
//
//  Query params:
//    ?limit=10  (default 10)
//    ?competition_type=season|tournament + ?competition_id=X
//
//  Response: [
//    { match_id, date, home_team, away_team,
//      home_sets_won, away_sets_won,
//      is_home, pts, ace, atk, kill_pct, recv_pct, blk, result }
//  ]
// ================================================================
router.get("/:id/matches", async (req, res) => {
  const playerId = req.params.id;
  const { limit = 10, competition_type, competition_id } = req.query;
  const { clause, params } = buildCompetitionFilter(
    competition_type,
    competition_id,
  );

  const matchdayJoin = clause
    ? "JOIN matchdays md ON md.id = m.matchday_id"
    : "";

  try {
    // Prima recuperiamo team_id attuale del giocatore
    const [[player]] = await pool.query(
      "SELECT team_id FROM players WHERE id = ?",
      [playerId],
    );
    if (!player)
      return res.status(404).json({ error: "Giocatore non trovato" });

    const [rows] = await pool.query(
      `
            SELECT
                m.id            AS match_id,
                COALESCE(m.played_at, m.scheduled_at)   AS date,
                ht.name         AS home_team,
                at.name         AS away_team,
                m.home_sets_won,
                m.away_sets_won,
                (spm.team_id = m.home_team_id)          AS is_home,

                spm.points_scored                       AS pts,
                spm.aces                                AS ace,
                spm.attacks_total                       AS atk,
                spm.attack_kills                        AS kills,
                ROUND(spm.attack_kills/NULLIF(spm.attacks_total,0)*100,1) AS kill_pct,
                ROUND(spm.reception_positive/NULLIF(spm.receptions_total,0)*100,1) AS recv_pct,
                spm.block_kills                         AS blk,

                -- Risultato dal punto di vista del giocatore
                CASE
                    WHEN (spm.team_id = m.home_team_id AND m.home_sets_won > m.away_sets_won)
                      OR (spm.team_id = m.away_team_id AND m.away_sets_won > m.home_sets_won)
                    THEN 'W'
                    ELSE 'L'
                END                                     AS result

            FROM stats_player_match spm
            JOIN matches m  ON m.id  = spm.match_id AND m.status = 'completed'
            JOIN teams ht   ON ht.id = m.home_team_id
            JOIN teams at   ON at.id = m.away_team_id
            ${matchdayJoin}
            WHERE spm.player_id = ?
            ${clause}
            ORDER BY COALESCE(m.played_at, m.scheduled_at) DESC
            LIMIT ?
        `,
      [playerId, ...params, parseInt(limit)],
    );

    res.json(rows);
  } catch (err) {
    console.error("[players] GET /:id/matches", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/players/:id/trophies
//  Titoli vinti dal giocatore (partecipazione alla squadra
//  che ha vinto la competizione).
//
//  Logica: stesso approccio di /teams/:id/trophies ma
//  verifica che il giocatore abbia partecipato alla stagione
//  (almeno una partita giocata).
// ================================================================
router.get("/:id/trophies", async (req, res) => {
  const playerId = req.params.id;
  try {
    const [rows] = await pool.query(
      `
            -- Campionati vinti
            SELECT
                'season'        AS competition_type,
                s.id            AS competition_id,
                s.name          AS competition_name,
                s.year_start    AS year,
                'campionato'    AS display_type,
                t.name          AS team_name
            FROM seasons s
            -- Il giocatore ha partecipato a questa stagione?
            JOIN (
                SELECT DISTINCT md.season_id, spm.team_id
                FROM stats_player_match spm
                JOIN matches m  ON m.id  = spm.match_id AND m.status = 'completed'
                JOIN matchdays md ON md.id = m.matchday_id
                WHERE spm.player_id = ? AND md.season_id IS NOT NULL
            ) participation ON participation.season_id = s.id
            JOIN teams t ON t.id = participation.team_id
            WHERE s.is_active = 0
              -- La sua squadra ha vinto quella stagione?
              AND participation.team_id = (
                  SELECT vs.team_id FROM v_standings vs
                  WHERE vs.season_id = s.id
                  ORDER BY vs.points DESC, vs.total_kills DESC
                  LIMIT 1
              )

            UNION ALL

            -- Tornei vinti
            SELECT
                'tournament'    AS competition_type,
                trn.id          AS competition_id,
                trn.name        AS competition_name,
                trn.year        AS year,
                trn.type        AS display_type,
                t.name          AS team_name
            FROM tournaments trn
            JOIN (
                SELECT DISTINCT md.tournament_id, spm.team_id
                FROM stats_player_match spm
                JOIN matches m  ON m.id  = spm.match_id AND m.status = 'completed'
                JOIN matchdays md ON md.id = m.matchday_id
                WHERE spm.player_id = ? AND md.tournament_id IS NOT NULL
            ) participation ON participation.tournament_id = trn.id
            JOIN teams t ON t.id = participation.team_id
            WHERE trn.is_active = 0
              AND participation.team_id = (
                  SELECT stm.team_id
                  FROM stats_team_match stm
                  JOIN matches m  ON m.id  = stm.match_id AND m.status = 'completed'
                  JOIN matchdays md ON md.id = m.matchday_id AND md.tournament_id = trn.id
                  GROUP BY stm.team_id
                  ORDER BY SUM(
                      CASE
                        WHEN (stm.is_home=1 AND m.home_sets_won > m.away_sets_won)
                          OR (stm.is_home=0 AND m.away_sets_won > m.home_sets_won)
                        THEN 1 ELSE 0
                      END
                  ) DESC
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
