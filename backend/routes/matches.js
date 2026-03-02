import express from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";
import { sumStats } from "../utils/stats.js";

const router = express.Router();

/**
 * GET
 */
router.get("/", auth, async (req, res) => {
  try {
    const coachId = req.user.id;

    console.log(coachId);
    // Prendi match + squadre
    const result = await pool.query(
      `
      SELECT 
        m.id,
        m.match_json,
        m.team_a_id,
        m.team_b_id,
        m.isMatchFinished
      FROM matches m
      WHERE m.team_a_id = $1 OR m.team_b_id = $1
    `,
      [coachId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    const match = result.rows;

    //console.log(match);
    /*
    // Verifica che il coach alleni entrambe le squadre
    const check = await pool.query(
      `
      SELECT team_id 
      FROM coach_teams
      WHERE coach_id = $1 AND team_id IN ($2, $3)
    `,
      [coachId, match.team_a_id, match.team_b_id],
    );

    if (check.rows.length !== 2) {
      return res.status(403).json({ error: "Not authorized" });
    }*/

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const matchId = req.params.id;
    const coachId = req.user.id;

    // Prendi match + squadre
    const result = await pool.query(
      `
      SELECT 
        m.match_json,
        m.team_a_id,
        m.team_b_id
      FROM matches m
      WHERE m.id = $1
    `,
      [matchId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    const match = result.rows[0];

    /*
    // Verifica che il coach alleni entrambe le squadre
    const check = await pool.query(
      `
      SELECT team_id 
      FROM coach_teams
      WHERE coach_id = $1 AND team_id IN ($2, $3)
    `,
      [coachId, match.team_a_id, match.team_b_id],
    );

    if (check.rows.length !== 2) {
      return res.status(403).json({ error: "Not authorized" });
    }*/

    res.json(match.match_json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST
 */

router.post("/", auth, async (req, res) => {
  const json = req.body;
  console.log(json);
  const { teamAId, teamBId, match } = json;

  /*
  const allowed = await pool.query(
    `
    SELECT 1 FROM team_coaches
    WHERE user_id=$1 AND team_id IN ($2,$3)
  `,
    [req.user.id, teamA.id, teamB.id],
  );

  if (!allowed.rowCount) return res.sendStatus(403);
*/
  //console.log(match);

  await pool.query(
    `
    INSERT INTO matches (team_a_id, team_b_id, match_json, created_by)
    VALUES ($1,$2,$3,$4)
  `,
    [teamAId, teamBId, match, req.user.id],
  );
  /*
  for (const p of json.players) {
    const { rows } = await pool.query("SELECT stats FROM players WHERE id=$1", [
      p.id,
    ]);

    const merged = sumStats(rows[0].stats, p.stats);

    await pool.query("UPDATE players SET stats=$1 WHERE id=$2", [merged, p.id]);
  }
*/
  res.json({ ok: true });
});

export default router;
