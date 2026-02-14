import express from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

//prendo un player dato id
router.get("/:id", auth, async (req, res) => {
  const playerId = req.params.id;

  const allowed = await pool.query(
    `
    SELECT 1
    FROM players p
    JOIN team_coaches tc ON tc.team_id = p.team_id
    WHERE p.id=$1 AND tc.user_id=$2
  `,
    [playerId, req.user.id],
  );

  if (!allowed.rowCount) return res.sendStatus(403);

  const { rows } = await pool.query(
    `
    SELECT id, number, first_name, last_name, role, stats
    FROM players WHERE id=$1
  `,
    [playerId],
  );

  res.json(rows[0]);
});

export default router;
