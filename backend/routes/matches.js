// ================================================================
//  routes/matches.js  —  MODIFICATO (versione estesa)
//
//  Rotte esistenti confermate + nuove rotte:
//
//  ESISTENTI:
//    GET  /api/matches               → lista partite (globale)
//    GET  /api/matches/:id           → dettaglio partita
//
//  NUOVE:
//    GET  /api/teams/:teamId/matches → partite di una squadra
//                                     filtrabili per competizione
//    GET  /api/matches/:id/lineup    → formazione titolare di una partita
//    POST /api/matches/:id/lineup    → salva/aggiorna formazione
//    GET  /api/matches/:id/sets      → dettaglio set a set
//    GET  /api/matches/:id/stats     → statistiche complete della partita
// ================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// ================================================================
//  HELPER: filtra per stagione o torneo
// ================================================================
function buildCompetitionFilter(competitionType, competitionId) {
  if (!competitionId || !competitionType) return { clause: "", params: [] };
  const col =
    competitionType === "season" ? "md.season_id" : "md.tournament_id";
  return { clause: ` AND ${col} = ?`, params: [parseInt(competitionId)] };
}

// ================================================================
//  GET /api/matches
//  Lista partite globale — con filtri opzionali.
//
//  Query params:
//    ?status=scheduled|in_progress|completed
//    ?competition_type=season|tournament  + ?competition_id=X
//    ?limit=50  (default 50)
//    ?page=1
// ================================================================
router.get("/", async (req, res) => {
  const {
    status,
    competition_type,
    competition_id,
    limit = 50,
    page = 1,
  } = req.query;
  const { clause, params } = buildCompetitionFilter(
    competition_type,
    competition_id,
  );

  const conditions = ["1=1"];
  const condParams = [];

  if (status) {
    conditions.push("m.status = ?");
    condParams.push(status);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [rows] = await pool.query(
      `
            SELECT
                m.id,
                m.status,
                m.scheduled_at,
                m.played_at,
                m.home_sets_won,
                m.away_sets_won,
                m.home_points,
                m.away_points,
                ht.id   AS home_team_id,
                ht.name AS home_team,
                ht.short_name AS home_short,
                at.id   AS away_team_id,
                at.name AS away_team,
                at.short_name AS away_short,
                v.name  AS venue,
                v.city  AS venue_city,
                md.round_number AS matchday,
                md.season_id,
                md.tournament_id
            FROM matches m
            JOIN matchdays md ON md.id  = m.matchday_id
            JOIN teams ht     ON ht.id  = m.home_team_id
            JOIN teams at     ON at.id  = m.away_team_id
            LEFT JOIN venues v ON v.id  = m.venue_id
            WHERE ${conditions.join(" AND ")}
            ${clause}
            ORDER BY COALESCE(m.played_at, m.scheduled_at) DESC
            LIMIT ? OFFSET ?
        `,
      [...condParams, ...params, parseInt(limit), offset],
    );

    res.json(rows);
  } catch (err) {
    console.error("[matches] GET /", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/teams/:teamId/matches
//  Partite di una squadra specifica, filtrabili per competizione.
//  Questo è l'endpoint usato dalla dashboard.
//
//  Query params:
//    ?competition_type=season|tournament
//    ?competition_id=X
//    ?status=scheduled|completed (opzionale)
//
//  Response: [
//    { id, status, scheduled_at, played_at,
//      home_sets_won, away_sets_won,
//      home_team_id, home_team, away_team_id, away_team,
//      venue, matchday,
//      is_home (bool: la squadra richiesta gioca in casa?) }
//  ]
// ================================================================
router.get("/team/:teamId", async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const { competition_type, competition_id, status } = req.query;
  const { clause, params } = buildCompetitionFilter(
    competition_type,
    competition_id,
  );

  const conditions = [`(m.home_team_id = ? OR m.away_team_id = ?)`];
  const condParams = [teamId, teamId];

  if (status) {
    conditions.push("m.status = ?");
    condParams.push(status);
  }

  try {
    const [rows] = await pool.query(
      `
            SELECT
                m.id,
                m.status,
                m.scheduled_at,
                m.played_at,
                m.home_sets_won,
                m.away_sets_won,
                m.home_points,
                m.away_points,
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
                (m.home_team_id = ?)    AS is_home
            FROM matches m
            JOIN matchdays md ON md.id = m.matchday_id
            JOIN teams ht     ON ht.id = m.home_team_id
            JOIN teams at     ON at.id = m.away_team_id
            LEFT JOIN venues v ON v.id = m.venue_id
            WHERE ${conditions.join(" AND ")}
            ${clause}
            ORDER BY COALESCE(m.played_at, m.scheduled_at) DESC
        `,
      [...condParams, teamId, ...params],
    );

    res.json(rows);
  } catch (err) {
    console.error("[matches] GET /team/:teamId", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/matches/:id
//  Dettaglio completo di una partita (con set e statistiche base).
// ================================================================
router.get("/:id", async (req, res) => {
  const matchId = req.params.id;
  try {
    // Partita principale
    const [[match]] = await pool.query(
      `
            SELECT
                m.*,
                ht.name AS home_team,   ht.short_name AS home_short,
                at.name AS away_team,   at.short_name AS away_short,
                v.name  AS venue,       v.city AS venue_city,
                md.round_number AS matchday,
                md.season_id,   md.tournament_id,
                s.name   AS season_name,
                t.name   AS tournament_name
            FROM matches m
            JOIN matchdays md   ON md.id = m.matchday_id
            JOIN teams ht       ON ht.id = m.home_team_id
            JOIN teams at       ON at.id = m.away_team_id
            LEFT JOIN venues v  ON v.id  = m.venue_id
            LEFT JOIN seasons s ON s.id  = md.season_id
            LEFT JOIN tournaments t ON t.id = md.tournament_id
            WHERE m.id = ?
        `,
      [matchId],
    );

    if (!match) return res.status(404).json({ error: "Partita non trovata" });

    // Set
    const [sets] = await pool.query(
      `
            SELECT set_number, home_score, away_score, winner_team_id,
                   started_at, ended_at
            FROM match_sets
            WHERE match_id = ?
            ORDER BY set_number
        `,
      [matchId],
    );

    res.json({ ...match, sets });
  } catch (err) {
    console.error("[matches] GET /:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/matches/:id/lineup
//  Formazione (titolari + panchina) di entrambe le squadre
//  per una partita. Usato dal pulsante "Carica Formazione"
//  della dashboard (partite non ancora giocate).
//
//  Response: {
//    home: { team_id, team_name, starters: [...], bench: [...] },
//    away: { team_id, team_name, starters: [...], bench: [...] }
//  }
// ================================================================
router.get("/:id/lineup", async (req, res) => {
  const matchId = req.params.id;
  try {
    // Verifica che la partita esista
    const [[match]] = await pool.query(
      "SELECT id, home_team_id, away_team_id FROM matches WHERE id = ?",
      [matchId],
    );
    if (!match) return res.status(404).json({ error: "Partita non trovata" });

    // Lineup salvata
    const [lineupRows] = await pool.query(
      `
            SELECT
                ml.team_id,
                ml.player_id,
                ml.position_number,
                ml.is_starter,
                ml.is_libero,
                p.name,
                p.surname,
                p.shirt_number,
                p.role
            FROM match_lineups ml
            JOIN players p ON p.id = ml.player_id
            WHERE ml.match_id = ?
            ORDER BY ml.team_id, ml.is_starter DESC, ml.position_number
        `,
      [matchId],
    );

    // Raggruppa per squadra
    const homeLineup = lineupRows.filter(
      (r) => r.team_id === match.home_team_id,
    );
    const awayLineup = lineupRows.filter(
      (r) => r.team_id === match.away_team_id,
    );

    // Nomi squadre
    const [[homeTeam]] = await pool.query(
      "SELECT name FROM teams WHERE id = ?",
      [match.home_team_id],
    );
    const [[awayTeam]] = await pool.query(
      "SELECT name FROM teams WHERE id = ?",
      [match.away_team_id],
    );

    res.json({
      home: {
        team_id: match.home_team_id,
        team_name: homeTeam?.name,
        starters: homeLineup.filter((p) => p.is_starter),
        bench: homeLineup.filter((p) => !p.is_starter),
      },
      away: {
        team_id: match.away_team_id,
        team_name: awayTeam?.name,
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
//  Salva la formazione di una partita.
//
//  Body: {
//    team_id: number,
//    players: [
//      { player_id, position_number, is_starter, is_libero }
//    ]
//  }
// ================================================================
router.post("/:id/lineup", async (req, res) => {
  const matchId = parseInt(req.params.id);
  const { team_id, players } = req.body;

  if (!team_id || !Array.isArray(players) || players.length === 0) {
    return res
      .status(400)
      .json({ error: "team_id e players[] sono obbligatori" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Elimina lineup esistente per questa squadra in questa partita
    await conn.query(
      "DELETE FROM match_lineups WHERE match_id = ? AND team_id = ?",
      [matchId, team_id],
    );

    // Inserisce la nuova lineup
    for (const p of players) {
      await conn.query(
        `
                INSERT INTO match_lineups
                    (match_id, team_id, player_id, position_number, is_starter, is_libero)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
        [
          matchId,
          team_id,
          p.player_id,
          p.position_number || null,
          p.is_starter ? 1 : 0,
          p.is_libero ? 1 : 0,
        ],
      );
    }

    await conn.commit();
    res.json({ ok: true, inserted: players.length });
  } catch (err) {
    await conn.rollback();
    console.error("[matches] POST /:id/lineup", err);
    res.status(500).json({ error: "Errore salvataggio formazione" });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/matches/:id/stats
//  Statistiche complete della partita (team + player).
// ================================================================
router.get("/:id/stats", async (req, res) => {
  const matchId = req.params.id;
  try {
    // Stats squadra
    const [teamStats] = await pool.query(
      `
            SELECT
                stm.*,
                t.name AS team_name,
                t.short_name
            FROM stats_team_match stm
            JOIN teams t ON t.id = stm.team_id
            WHERE stm.match_id = ?
        `,
      [matchId],
    );

    // Stats giocatori
    const [playerStats] = await pool.query(
      `
            SELECT
                spm.*,
                p.name, p.surname, p.shirt_number, p.role,
                t.name AS team_name
            FROM stats_player_match spm
            JOIN players p ON p.id = spm.player_id
            JOIN teams   t ON t.id = spm.team_id
            WHERE spm.match_id = ?
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
