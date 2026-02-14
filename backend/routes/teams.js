import express from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// prendo tutte le squadre di un coach
router.get("/", auth, async (req, res) => {
  console.log("test");
  const { rows } = await pool.query(
    `
    SELECT t.*
    FROM teams t
    JOIN team_coaches tc ON tc.team_id = t.id
    WHERE tc.user_id = $1
  `,
    [req.user.id],
  );

  res.json(rows);
});

// prendo tutti i match di una singola squadra
router.get("/:id/matches", auth, async (req, res) => {
  const teamId = req.params.id;

  const allowed = await pool.query(
    `
    SELECT 1 FROM team_coaches
    WHERE user_id=$1 AND team_id=$2
  `,
    [req.user.id, teamId],
  );

  if (!allowed.rowCount) return res.sendStatus(403);

  const { rows } = await pool.query(
    `
    SELECT * FROM matches
    WHERE team_a_id=$1 OR team_b_id=$1
    ORDER BY date DESC
  `,
    [teamId],
  );

  res.json(rows);
});

// prendo tutti i players di una squadra
router.get("/:id/players", auth, async (req, res) => {
  const teamId = req.params.id;

  const allowed = await pool.query(
    `
    SELECT 1 FROM team_coaches
    WHERE user_id=$1 AND team_id=$2
  `,
    [req.user.id, teamId],
  );

  if (!allowed.rowCount) return res.sendStatus(403);

  const { rows } = await pool.query(
    `
    SELECT id, number, first_name, last_name, role, stats
    FROM players WHERE team_id=$1
  `,
    [teamId],
  );

  res.json(rows);
});

/**
 * POST
 */

export default router;
