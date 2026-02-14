import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  //console.log(email);
  //console.log(password);

  const result = await pool.query(
    "SELECT id, name,password FROM users WHERE email=$1",
    [email],
  );

  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  //console.log(user);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });

  res.json({ token, user });
});

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, surname, email, password } = req.body;

    if (!email || !password || !name || !surname) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Email già esistente?
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
      email,
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, surname, email, password)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [name, surname, email, hash],
    );

    const userId = result.rows[0].id;

    // Autologin
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
