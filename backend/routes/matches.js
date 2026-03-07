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
//  GET /api/matches
//  Query params: ?status=  ?competition_type=  ?competition_id=
//               ?limit=50  ?page=1
// ================================================================
router.get("/", async (req, res) => {
  const {
    status,
    competition_type,
    competition_id,
    limit = 50,
    page = 1,
  } = req.query;

  const conditions = [];
  const condParams = [];

  if (status) {
    condParams.push(status);
    conditions.push(`m.status = $${condParams.length}`);
  }

  // offset per il filtro competizione = parametri già aggiunti sopra
  const { clause, params: fp } = buildCompetitionFilter(
    competition_type,
    competition_id,
    condParams.length,
  );

  const offsetVal = (parseInt(page) - 1) * parseInt(limit);
  // LIMIT e OFFSET vengono dopo i condParams + fp
  const limitIdx = condParams.length + fp.length + 1;
  const offsetIdx = limitIdx + 1;

  const whereSQL = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "WHERE 1=1";

  try {
    const rows = await q(
      `
            SELECT
                m.id, m.status, m.scheduled_at, m.played_at,
                m.home_sets_won, m.away_sets_won,
                m.home_points,  m.away_points,
                ht.id           AS home_team_id,
                ht.name         AS home_team,
                ht.short_name   AS home_short,
                at.id           AS away_team_id,
                at.name         AS away_team,
                at.short_name   AS away_short,
                v.name          AS venue,
                v.city          AS venue_city,
                md.round_number AS matchday,
                md.season_id,
                md.tournament_id
            FROM  matches m
            JOIN  matchdays md ON md.id = m.matchday_id
            JOIN  teams     ht ON ht.id = m.home_team_id
            JOIN  teams     at ON at.id = m.away_team_id
            LEFT JOIN venues v ON v.id  = m.venue_id
            ${whereSQL}
            ${clause}
            ORDER BY COALESCE(m.played_at, m.scheduled_at) DESC
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `,
      [...condParams, ...fp, parseInt(limit), offsetVal],
    );

    res.json(rows);
  } catch (err) {
    console.error("[matches] GET /", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/matches/team/:teamId
//  Partite di una squadra, filtrabili per competizione.
//  Query params: ?competition_type=  ?competition_id=  ?status=
// ================================================================
router.get("/team/:teamId", async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const { competition_type, competition_id, status } = req.query;

  // Parametri base: $1 e $2 = teamId (home OR away), $3 = teamId (is_home)
  const condParams = [teamId, teamId];
  const conditions = [`(m.home_team_id = $1 OR m.away_team_id = $2)`];

  if (status) {
    condParams.push(status);
    conditions.push(`m.status = $${condParams.length}`);
  }

  // is_home usa teamId → aggiungiamo come prossimo param
  condParams.push(teamId);
  const isHomeIdx = condParams.length; // $3 o $4

  // filtro competizione parte dopo tutti i condParams
  const { clause, params: fp } = buildCompetitionFilter(
    competition_type,
    competition_id,
    condParams.length,
  );

  try {
    const rows = await q(
      `
            SELECT
                m.id, m.status, m.scheduled_at, m.played_at,
                m.home_sets_won, m.away_sets_won,
                m.home_points,  m.away_points,
                ht.id           AS home_team_id,
                ht.name         AS home_team,
                ht.short_name   AS home_short,
                at.id           AS away_team_id,
                at.name         AS away_team,
                at.short_name   AS away_short,
                v.name          AS venue,
                v.city          AS venue_city,
                md.round_number AS matchday,
                md.season_id,
                md.tournament_id,
                (m.home_team_id = $${isHomeIdx}) AS is_home
            FROM  matches m
            JOIN  matchdays md ON md.id = m.matchday_id
            JOIN  teams     ht ON ht.id = m.home_team_id
            JOIN  teams     at ON at.id = m.away_team_id
            LEFT JOIN venues v ON v.id  = m.venue_id
            WHERE ${conditions.join(" AND ")}
            ${clause}
            ORDER BY COALESCE(m.played_at, m.scheduled_at) DESC
        `,
      [...condParams, ...fp],
    );

    res.json(rows);
  } catch (err) {
    console.error("[matches] GET /team/:teamId", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/matches/:id
// ================================================================
router.get("/:id", async (req, res) => {
  const matchId = req.params.id;
  try {
    const matchRows = await q(
      `
            SELECT
                m.*,
                ht.name AS home_team,   ht.short_name AS home_short,
                at.name AS away_team,   at.short_name AS away_short,
                v.name  AS venue,       v.city        AS venue_city,
                md.round_number AS matchday,
                md.season_id,   md.tournament_id,
                s.name  AS season_name,
                trn.name AS tournament_name
            FROM  matches m
            JOIN  matchdays md      ON md.id  = m.matchday_id
            JOIN  teams     ht      ON ht.id  = m.home_team_id
            JOIN  teams     at      ON at.id  = m.away_team_id
            LEFT JOIN venues      v   ON v.id   = m.venue_id
            LEFT JOIN seasons     s   ON s.id   = md.season_id
            LEFT JOIN tournaments trn ON trn.id = md.tournament_id
            WHERE m.id = $1
        `,
      [matchId],
    );

    if (!matchRows[0])
      return res.status(404).json({ error: "Partita non trovata" });

    const sets = await q(
      `
            SELECT set_number, home_score, away_score, winner_team_id,
                   started_at, ended_at
            FROM   match_sets
            WHERE  match_id = $1
            ORDER  BY set_number
        `,
      [matchId],
    );

    res.json({ ...matchRows[0], sets });
  } catch (err) {
    console.error("[matches] GET /:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/matches/:id/lineup
// ================================================================
router.get("/:id/lineup", async (req, res) => {
  const matchId = req.params.id;
  try {
    const matchRows = await q(
      "SELECT id, home_team_id, away_team_id FROM matches WHERE id = $1",
      [matchId],
    );
    if (!matchRows[0])
      return res.status(404).json({ error: "Partita non trovata" });
    const match = matchRows[0];

    const lineupRows = await q(
      `
            SELECT
                ml.team_id, ml.player_id, ml.position_number,
                ml.is_starter, ml.is_libero,
                p.name, p.surname, p.shirt_number, p.role
            FROM  match_lineups ml
            JOIN  players p ON p.id = ml.player_id
            WHERE ml.match_id = $1
            ORDER BY ml.team_id, ml.is_starter DESC, ml.position_number
        `,
      [matchId],
    );

    const homeLineup = lineupRows.filter(
      (r) => r.team_id === match.home_team_id,
    );
    const awayLineup = lineupRows.filter(
      (r) => r.team_id === match.away_team_id,
    );

    const homeTeam = await q("SELECT name FROM teams WHERE id = $1", [
      match.home_team_id,
    ]);
    const awayTeam = await q("SELECT name FROM teams WHERE id = $1", [
      match.away_team_id,
    ]);

    res.json({
      home: {
        team_id: match.home_team_id,
        team_name: homeTeam[0]?.name,
        starters: homeLineup.filter((p) => p.is_starter),
        bench: homeLineup.filter((p) => !p.is_starter),
      },
      away: {
        team_id: match.away_team_id,
        team_name: awayTeam[0]?.name,
        starters: awayLineup.filter((p) => p.is_starter),
        bench: awayLineup.filter((p) => !p.is_starter),
      },
    });
  } catch (err) {
    console.error("[matches] GET /:id/lineup", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  POST /api/matches/:id/lineup
//  Body: { team_id, players: [{ player_id, position_number,
//                               is_starter, is_libero }] }
// ================================================================
router.post("/:id/lineup", async (req, res) => {
  const matchId = parseInt(req.params.id);
  const { team_id, players } = req.body;

  if (!team_id || !Array.isArray(players) || players.length === 0) {
    return res
      .status(400)
      .json({ error: "team_id e players[] sono obbligatori" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Elimina lineup esistente per questa squadra in questa partita
    await client.query(
      "DELETE FROM match_lineups WHERE match_id = $1 AND team_id = $2",
      [matchId, team_id],
    );

    console.log(players);
    // Inserisce la nuova lineup
    for (const p of players) {
      await client.query(
        `
                INSERT INTO match_lineups
                    (match_id, team_id, player_id, shirt_number, is_starter, is_libero, position_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
        [
          matchId,
          team_id,
          p.player_id,
          p.shirt_number,
          p.is_starter ? 1 : 0,
          p.is_libero ? 1 : 0,
          p.position_number || null,
        ],
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, inserted: players.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[matches] POST /:id/lineup", err);
    res.status(500).json({ error: "Errore salvataggio formazione" });
  } finally {
    client.release();
  }
});

// ================================================================
//  GET /api/matches/:id/stats
// ================================================================
router.get("/:id/stats", async (req, res) => {
  const matchId = req.params.id;
  try {
    const teamStats = await q(
      `
            SELECT stm.*, t.name AS team_name, t.short_name
            FROM   stats_team_match stm
            JOIN   teams t ON t.id = stm.team_id
            WHERE  stm.match_id = $1
        `,
      [matchId],
    );

    const playerStats = await q(
      `
            SELECT
                spm.*,
                p.name, p.surname, p.shirt_number, p.role,
                t.name AS team_name
            FROM  stats_player_match spm
            JOIN  players p ON p.id = spm.player_id
            JOIN  teams   t ON t.id = spm.team_id
            WHERE spm.match_id = $1
            ORDER BY spm.team_id, spm.points_scored DESC
        `,
      [matchId],
    );

    res.json({ teamStats, playerStats });
  } catch (err) {
    console.error("[matches] GET /:id/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
