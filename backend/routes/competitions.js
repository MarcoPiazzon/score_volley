// ================================================================
//  routes/competitions.js  —  NUOVO FILE
//
//  Endpoint unificati per stagioni (campionati) e tornei.
//  Necessario per il dropdown "Competizione" della dashboard.
//
//  Rotte:
//    GET /api/competitions                → tutte (seasons + tournaments)
//    GET /api/competitions/seasons        → solo campionati
//    GET /api/competitions/seasons/:id    → dettaglio stagione
//    GET /api/competitions/tournaments    → solo tornei
//    GET /api/competitions/tournaments/:id → dettaglio torneo
// ================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

// Tutte le route richiedono autenticazione
router.use(authenticate);

// ----------------------------------------------------------------
//  GET /api/competitions
//  Restituisce seasons + tournaments in un array unificato,
//  ordinati per is_active DESC, poi per anno DESC.
//  Usato per popolare il dropdown della dashboard.
// ----------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
            SELECT
                'season'                                    AS competition_type,
                s.id                                        AS competition_id,
                s.name                                      AS competition_name,
                CONCAT(s.year_start, '/', s.year_end)       AS edition,
                s.year_start                                AS year,
                s.is_active
            FROM seasons s

            UNION ALL

            SELECT
                'tournament'                                AS competition_type,
                t.id                                        AS competition_id,
                t.name                                      AS competition_name,
                COALESCE(t.edition, CAST(t.year AS CHAR))   AS edition,
                t.year                                      AS year,
                t.is_active
            FROM tournaments t

            ORDER BY is_active DESC, year DESC, competition_name ASC
        `);

    res.json(rows);
  } catch (err) {
    console.error("[competitions] GET /", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ----------------------------------------------------------------
//  GET /api/competitions/seasons
//  Lista di tutti i campionati.
// ----------------------------------------------------------------
router.get("/seasons", async (req, res) => {
  try {
    const [rows] = await pool.query(`
            SELECT
                s.id,
                s.name,
                s.year_start,
                s.year_end,
                s.is_active,
                COUNT(DISTINCT ct.team_id) AS teams_count
            FROM seasons s
            LEFT JOIN championship_teams ct ON ct.season_id = s.id
            GROUP BY s.id
            ORDER BY s.is_active DESC, s.year_start DESC
        `);
    res.json(rows);
  } catch (err) {
    console.error("[competitions] GET /seasons", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ----------------------------------------------------------------
//  GET /api/competitions/seasons/:id
//  Dettaglio di un campionato: info + squadre partecipanti.
// ----------------------------------------------------------------
router.get("/seasons/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Info stagione
    const [[season]] = await pool.query("SELECT * FROM seasons WHERE id = ?", [
      id,
    ]);
    if (!season) return res.status(404).json({ error: "Stagione non trovata" });

    // Squadre iscritte
    const [teams] = await pool.query(
      `
            SELECT t.id, t.name, t.short_name, t.city, t.logo_url
            FROM championship_teams ct
            JOIN teams t ON t.id = ct.team_id
            WHERE ct.season_id = ?
            ORDER BY t.name
        `,
      [id],
    );

    res.json({ ...season, teams });
  } catch (err) {
    console.error("[competitions] GET /seasons/:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ----------------------------------------------------------------
//  GET /api/competitions/tournaments
//  Lista di tutti i tornei.
// ----------------------------------------------------------------
router.get("/tournaments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
            SELECT
                t.id,
                t.name,
                t.edition,
                t.type,
                t.year,
                t.is_active,
                COUNT(DISTINCT tt.team_id) AS teams_count
            FROM tournaments t
            LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
            GROUP BY t.id
            ORDER BY t.is_active DESC, t.year DESC
        `);
    res.json(rows);
  } catch (err) {
    console.error("[competitions] GET /tournaments", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ----------------------------------------------------------------
//  GET /api/competitions/tournaments/:id
//  Dettaglio di un torneo: info + squadre partecipanti.
// ----------------------------------------------------------------
router.get("/tournaments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [[tournament]] = await pool.query(
      "SELECT * FROM tournaments WHERE id = ?",
      [id],
    );
    if (!tournament)
      return res.status(404).json({ error: "Torneo non trovato" });

    const [teams] = await pool.query(
      `
            SELECT t.id, t.name, t.short_name, t.city, t.logo_url
            FROM tournament_teams tt
            JOIN teams t ON t.id = tt.team_id
            WHERE tt.tournament_id = ?
            ORDER BY t.name
        `,
      [id],
    );

    res.json({ ...tournament, teams });
  } catch (err) {
    console.error("[competitions] GET /tournaments/:id", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
