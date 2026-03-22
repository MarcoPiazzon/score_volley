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

    // Inserisce la nuova lineup
    for (const p of players) {
      await client.query(
        `
                INSERT INTO match_lineups
                    (match_id, team_id, player_id, position_number, is_starter, is_libero)
                VALUES ($1, $2, $3, $4, $5, $6)
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
    const [matchRow, teamMatch, playerMatch, teamSets, playerSets] =
      await Promise.all([
        q(`SELECT home_team_id, away_team_id FROM matches WHERE id = $1`, [
          matchId,
        ]),

        q(
          `SELECT stm.*, t.name AS team_name, t.short_name
         FROM   stats_team_match stm
         JOIN   teams t ON t.id = stm.team_id
         WHERE  stm.match_id = $1`,
          [matchId],
        ),

        q(
          `SELECT spm.*, p.name, p.surname, p.shirt_number, p.role, t.name AS team_name
         FROM  stats_player_match spm
         JOIN  players p ON p.id = spm.player_id
         JOIN  teams   t ON t.id = spm.team_id
         WHERE spm.match_id = $1
         ORDER BY spm.team_id, spm.total_points DESC`,
          [matchId],
        ),

        q(
          `SELECT sts.*, ms.set_number, t.name AS team_name, t.short_name
         FROM   stats_team_set sts
         JOIN   match_sets ms ON ms.id = sts.match_set_id
         JOIN   teams t ON t.id = sts.team_id
         WHERE  ms.match_id = $1
         ORDER BY ms.set_number`,
          [matchId],
        ),

        q(
          `SELECT sps.*, ms.set_number, p.name, p.surname, p.shirt_number, p.role, t.name AS team_name
         FROM  stats_player_set sps
         JOIN  match_sets ms ON ms.id = sps.match_set_id
         JOIN  players p ON p.id = sps.player_id
         JOIN  teams   t ON t.id = sps.team_id
         WHERE ms.match_id = $1
         ORDER BY ms.set_number, sps.team_id, sps.total_points DESC`,
          [matchId],
        ),
      ]);

    const match = matchRow[0] ?? {};
    res.json({
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      teamMatch,
      playerMatch,
      teamSets,
      playerSets,
    });
  } catch (err) {
    console.error("[matches] GET /:id/stats", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  POST /api/matches/:id/save
//
//  Salva il risultato completo di una partita nel database.
//
//  Body atteso:
//  {
//    homeTeamId    : number,
//    awayTeamId    : number,
//    setsWonHome   : number,           // set vinti squadra casa
//    setsWonAway   : number,           // set vinti squadra ospite
//    homeTotalPts  : number,           // punti totali casa (somma di tutti i set)
//    awayTotalPts  : number,           // punti totali ospite
//    sets: [                           // solo set COMPLETATI (winner !== null)
//      { number, scoreA, scoreB, winnerTeamId }
//    ],
//    players: [                        // tutti i giocatori (titolari + panchina)
//      { playerId, teamId, isHome, stats: { ace, attackWin, ... } }
//    ]
//  }
//
//  Operazioni in transazione:
//  1. UPDATE matches  → status='completed', set vinti, punti, played_at
//  2. DELETE + INSERT match_sets
//  3. DELETE + INSERT stats_player_match  (UPSERT via ON CONFLICT)
//  4. DELETE + INSERT stats_team_match    (UPSERT via ON CONFLICT)
// ================================================================

// Mappa statType (dall'engine) → event_type salvato nel DB
const STAT_TYPE_TO_EVENT_TYPE = {
  attackWin: "point",
  ace: "ace",
  servesErr: "serve_error",
  attackOut: "out",
  ball_lost: "lost_ball",
  blockNotSuccessful: "blocked",
  foul_double: "double",
  foul_four_touches: "4touches",
  foul_raised: "raised",
  foul_position: "position",
  foul_invasion: "invasion",
};

// Mappa chiave STAT (dal frontend JS) → colonna DB
// Solo le chiavi che NON corrispondono 1:1 al nome colonna DB
const STAT_TO_COL = {
  attackWin: "attack_win",
  attackOut: "attack_out",
  attackNotSuccessful: "attack_not_successful",
  totalAttack: "total_attack",
  servesErr: "serves_err",
  serverErrLine: "serves_err_line",
  totalRicezione: "total_receive",
  defensePos: "def_pos",
  defenseNeg: "def_neg",
  blockSuccessful: "block_successful",
  blockNotSuccessful: "block_not_successful",
  totalBlock: "total_block",
  totalCard: "total_card",
};

// Colonne DB con valore 0 di default (tutte le colonne numeriche delle tabelle stats)
const STATS_PLAYER_COLS = [
  "touches",
  "attack_win",
  "attack_out",
  "attack_not_successful",
  "total_attack",
  "ace",
  "serves",
  "serves_err",
  "serves_err_line",
  "total_serves",
  "total_receive",
  "foul_double",
  "foul_four_touches",
  "foul_raised",
  "foul_position",
  "foul_invasion",
  "total_foul",
  "ball_lost",
  "def_pos",
  "def_neg",
  "block_successful",
  "block_not_successful",
  "total_block",
  "card_yellow",
  "card_red",
  "total_card",
  "total_set_points",
  "set_points_win",
  "set_points_err",
  "set_points_cancelled",
  "total_match_points",
  "match_points_win",
  "match_points_err",
  "match_points_cancelled",
  "total_change",
  "total_timeout",
  "points_played",
  "total_points",
];

const STATS_TEAM_COLS = [
  "touches",
  "attack_win",
  "attack_out",
  "attack_not_successful",
  "total_attack",
  "ace",
  "serves",
  "serves_err",
  "serves_err_line",
  "total_serves",
  "total_receive",
  "foul_double",
  "foul_four_touches",
  "foul_raised",
  "foul_position",
  "foul_invasion",
  "total_foul",
  "ball_lost",
  "def_pos",
  "def_neg",
  "block_successful",
  "block_not_successful",
  "total_block",
  "card_yellow",
  "card_red",
  "total_card",
  "total_set_points",
  "set_points_win",
  "set_points_err",
  "set_points_cancelled",
  "total_match_points",
  "match_points_win",
  "match_points_err",
  "match_points_cancelled",
  "total_change",
  "total_timeout",
];

// Converte l'oggetto stats del frontend in un oggetto { col: valore }
function mapStats(rawStats, stats_col) {
  const colSet = new Set(stats_col);
  const out = {};
  stats_col.forEach((col) => (out[col] = 0));

  Object.entries(rawStats).forEach(([key, val]) => {
    if (typeof val !== "number") return;
    // Prova prima la mappatura esplicita, poi il nome diretto se corrisponde a una colonna DB
    const col = STAT_TO_COL[key] ?? (colSet.has(key) ? key : null);
    if (col && colSet.has(col)) out[col] = val;
  });

  return out;
}

// Somma stats di più giocatori in un unico oggetto (per stats_team_match)
function sumStats(playerStatsList, stats_col) {
  const total = {};
  stats_col.forEach((col) => (total[col] = 0));
  playerStatsList.forEach((ps) => {
    stats_col.forEach((col) => {
      total[col] += ps[col] ?? 0;
    });
  });
  return total;
}

router.post("/:id/save", async (req, res) => {
  const matchId = parseInt(req.params.id);
  const {
    homeTeamId,
    awayTeamId,
    setsWonHome,
    setsWonAway,
    homeTotalPts,
    awayTotalPts,
    sets = [],
    players = [],
  } = req.body;

  // Validazione base
  if (!homeTeamId || !awayTeamId) {
    return res
      .status(400)
      .json({ error: "homeTeamId e awayTeamId sono obbligatori" });
  }
  if (!Array.isArray(sets) || !Array.isArray(players)) {
    return res
      .status(400)
      .json({ error: "sets e players devono essere array" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Verifica che la partita esista ──────────────────────────
    const matchCheck = await client.query(
      "SELECT id, status FROM matches WHERE id = $1",
      [matchId],
    );
    if (!matchCheck.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Partita non trovata" });
    }

    // ── 2. UPDATE matches ──────────────────────────────────────────
    await client.query(
      `
            UPDATE matches SET
                status          = 'completed',
                home_sets_won   = $2,
                away_sets_won   = $3,
                home_points     = $4,
                away_points     = $5,
                raw_json = $6,
                played_at       = NOW()
            WHERE id = $1
        `,
      [matchId, setsWonHome, setsWonAway, homeTotalPts, awayTotalPts, req.body],
    );

    // Raggruppa le stats mappate per squadra (servirà per stats_team_match)
    const teamStatsMap = { [homeTeamId]: [], [awayTeamId]: [] };

    // ── 3. match_sets ──────────────────────────────────────────────
    // Elimina eventuali set già salvati per questa partita
    await client.query("DELETE FROM match_sets WHERE match_id = $1", [matchId]);

    for (const s of sets) {
      if (s.number == null) continue;
      const result = await client.query(
        `
    INSERT INTO match_sets
      (match_id, set_number, home_score, away_score, winner_team_id, duration_min, started_at, ended_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `,
        [
          matchId,
          s.number,
          s.scoreA ?? 0,
          s.scoreB ?? 0,
          s.winnerTeamId ?? null,
          null,
          null,
          null,
        ],
      );

      const setId = result.rows[0].id;

      // ── 6. match_set_events ────────────────────────────────────────

      await client.query(
        "DELETE FROM match_set_events WHERE match_set_id = $1",
        [setId],
      );

      console.log(setId);

      for (const e of s.events) {
        //console.log(e);
        const courtPos = e.courtPositions
          ? JSON.stringify(e.courtPositions)
          : null;

        await client.query(
          `
                INSERT INTO match_set_events
                    (match_set_id, event_order, event_type, team_side, server_player_id, point_won_by_team, point_mode, is_ace, card_player_id, card_type, score_home, score_away, court_positions)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `,
          [
            setId,
            e.touchOfPlayers?.map((t) => t.playerId) ?? null,
            e.type ?? null,
            e.team === "a" ? homeTeamId : e.team === "b" ? awayTeamId : null,
            e.serverPlayerId ?? null,
            e.squadWhoWinPoint ?? null,
            null,
            e.isAce ?? null,
            e.playerId ?? null,
            e.cardType ?? null,
            e.scoreA ?? e.teamA?.score ?? 0,
            e.scoreB ?? e.teamB?.score ?? 0,
            courtPos,
          ],
        );
      }

      // ── 7. stats_player_set ────────────────────────────────────────

      await client.query(
        "DELETE FROM stats_player_set WHERE match_set_id = $1",
        [setId],
      );

      //console.log(s.stats.players);
      for (const [playerId, stats] of Object.entries(s.stats.players)) {
        if (!playerId) continue;
        const mapped = mapStats(stats ?? {}, STATS_PLAYER_COLS);

        //console.log(playerId);
        const playerObj = players.find((p) => p.id === parseInt(playerId));
        const teamId = playerObj?.team === "a" ? homeTeamId : awayTeamId;

        // Accumula per stats_team_match
        if (teamStatsMap[teamId]) teamStatsMap[teamId].push(mapped);

        //console.log(teamId);

        //console.log(mapped);

        const cols = [
          "match_set_id",
          "player_id",
          "team_id",
          ...STATS_PLAYER_COLS,
        ];
        const vals = [
          setId,
          playerId, // ← era p.playerId
          teamId, // ← questo non ce l'hai più, vedi nota sotto
          ...STATS_PLAYER_COLS.map((c) => mapped[c] ?? 0),
        ];

        //console.log(vals);

        const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");

        //console.log(placeholders);
        await client.query(
          `INSERT INTO stats_player_set (${cols.join(", ")}) VALUES (${placeholders})
                 ON CONFLICT (match_set_id, player_id) DO UPDATE SET
                 ${STATS_PLAYER_COLS.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`,
          vals,
        );
      }

      // ── 8. stats_team_set ────────────────────────────────────────

      await client.query("DELETE FROM stats_team_set WHERE match_set_id = $1", [
        setId,
      ]);

      //console.log(s);
      //Home
      const mapped_home = mapStats(s.stats.squads.a ?? {}, STATS_PLAYER_COLS);
      //homeTeamId
      // Accumula per stats_team_match
      if (teamStatsMap[homeTeamId]) teamStatsMap[homeTeamId].push(mapped_home);

      const cols = ["match_set_id", "team_id", "is_home", ...STATS_TEAM_COLS];
      const vals = [
        setId,
        homeTeamId,
        0, //per ora di default
        ...STATS_TEAM_COLS.map((c) => mapped_home[c] ?? 0),
      ];

      console.log(cols);
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");

      await client.query(
        `INSERT INTO stats_team_set (${cols.join(", ")}) VALUES (${placeholders})
                 ON CONFLICT (match_set_id, team_id) DO UPDATE SET
                 ${STATS_TEAM_COLS.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`,
        vals,
      );

      //awayTeamId
      // Accumula per stats_team_match
      const mapped_away = mapStats(s.stats.squads.b ?? {}, STATS_PLAYER_COLS);
      if (teamStatsMap[awayTeamId]) teamStatsMap[awayTeamId].push(mapped_away);

      const cols_away = [
        "match_set_id",
        "team_id",
        "is_home",
        ...STATS_TEAM_COLS,
      ];
      const vals_away = [
        setId,
        awayTeamId,
        0, //per ora di default
        ...STATS_TEAM_COLS.map((c) => mapped_away[c] ?? 0),
      ];
      const placeholders_away = vals.map((_, i) => `$${i + 1}`).join(", ");

      await client.query(
        `INSERT INTO stats_team_set (${cols_away.join(", ")}) VALUES (${placeholders_away})
                 ON CONFLICT (match_set_id, team_id) DO UPDATE SET
                 ${STATS_TEAM_COLS.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`,
        vals_away,
      );
    }

    // ── 4. stats_player_match ──────────────────────────────────────
    // Elimina stats precedenti per questa partita
    await client.query("DELETE FROM stats_player_match WHERE match_id = $1", [
      matchId,
    ]);

    for (const p of players) {
      if (!p.playerId || !p.teamId) continue;
      const mapped = mapStats(p.stats ?? {}, STATS_PLAYER_COLS);

      // Accumula per stats_team_match
      if (teamStatsMap[p.teamId]) teamStatsMap[p.teamId].push(mapped);

      const cols = ["match_id", "player_id", "team_id", ...STATS_PLAYER_COLS];
      const vals = [
        matchId,
        p.playerId,
        p.teamId,
        ...STATS_PLAYER_COLS.map((c) => mapped[c] ?? 0),
      ];
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");

      await client.query(
        `INSERT INTO stats_player_match (${cols.join(", ")}) VALUES (${placeholders})
                 ON CONFLICT (match_id, player_id) DO UPDATE SET
                 ${STATS_PLAYER_COLS.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`,
        vals,
      );
    }

    // ── 5. stats_team_match ────────────────────────────────────────
    await client.query("DELETE FROM stats_team_match WHERE match_id = $1", [
      matchId,
    ]);

    for (const [teamId, statsList] of Object.entries(teamStatsMap)) {
      const isHome = parseInt(teamId) === homeTeamId ? 1 : 0;
      const totals = sumStats(statsList, STATS_TEAM_COLS);

      const cols = ["match_id", "team_id", "is_home", ...STATS_TEAM_COLS];
      const vals = [
        matchId,
        parseInt(teamId),
        0, //per ora di default
        ...STATS_TEAM_COLS.map((c) => totals[c] ?? 0),
      ];
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");

      await client.query(
        `INSERT INTO stats_team_match (${cols.join(", ")}) VALUES (${placeholders})
                 ON CONFLICT (match_id, team_id) DO UPDATE SET
                 ${STATS_TEAM_COLS.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`,
        vals,
      );
    }

    await client.query("COMMIT");

    res.json({
      ok: true,
      matchId,
      sets: sets.length,
      players: players.length,
      message: "Partita salvata correttamente",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[matches] POST /:id/save", err);
    res
      .status(500)
      .json({ error: "Errore salvataggio partita", detail: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/matches/:id/timeline
// Restituisce tutti i set con i relativi eventi per la Timeline.
// ─────────────────────────────────────────────────────────────────
router.get("/:id/timeline", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    // 1. Carica tutti i set della partita
    const setsResult = await client.query(
      `SELECT id, set_number, home_score, away_score, winner_team_id
       FROM match_sets
       WHERE match_id = $1
       ORDER BY set_number ASC`,
      [id],
    );

    if (setsResult.rows.length === 0) {
      return res.json({ sets: [] });
    }

    // 2. Per ogni set, carica i relativi eventi in ordine di inserimento
    const sets = await Promise.all(
      setsResult.rows.map(async (set) => {
        const eventsResult = await client.query(
          `SELECT
             id,
             event_type,
             team_side,
             server_player_id,
             point_won_by_team,
             point_mode,
             is_ace,
             card_player_id,
             card_type,
             score_home,
             score_away,
             event_order,
             court_positions,
             created_at
           FROM match_set_events
           WHERE match_set_id = $1
           ORDER BY id ASC`,
          [set.id],
        );
        return {
          ...set,
          events: eventsResult.rows,
        };
      }),
    );

    res.json({ sets });
  } catch (err) {
    console.error("[timeline] Errore:", err.message);
    res.status(500).json({ error: "Errore caricamento timeline" });
  }
});

module.exports = router;
