/*import express from "express";
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
});*/

// ================================================================
//  routes/auth.js  —  Autenticazione completa
//
//  Rotte:
//    POST /api/auth/login     → login con username + password
//    POST /api/auth/logout    → logout (invalida lato client)
//    GET  /api/auth/me        → profilo utente corrente (richiede token)
//    POST /api/auth/refresh   → rinnova il token (opzionale)
//
//  Flusso login:
//    1. Cerca l'utente in `users` per username
//    2. Verifica la password con bcrypt
//    3. Aggiorna last_login
//    4. Recupera il profilo esteso (coaches o collaborators)
//       → se collaborator, include team_id nel token
//    5. Genera JWT con payload: { id, username, role, team_id? }
//    6. Restituisce { token, user }
// ================================================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

// ================================================================
//  Durata del token  (modificabile via .env)
// ================================================================
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || "8h";

// ================================================================
//  HELPER: costruisce il payload JWT completo
//
//  Per i COLLABORATORI include team_id (vincola l'accesso alla
//  sola squadra di appartenenza nel middleware requireTeamAccess).
//  Per i COACH team_id è null (accesso libero a tutte le squadre).
// ================================================================
async function buildTokenPayload(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role, // 'coach' | 'collaborator'
    team_id: null, // default: nessuna restrizione
  };

  if (user.role === "collaborator") {
    // Recupera il team_id dal profilo collaboratore
    const [[collaborator]] = await pool.query(
      "SELECT team_id FROM collaborators WHERE user_id = ?",
      [user.id],
    );
    payload.team_id = collaborator?.team_id ?? null;
  }

  // Per i coach potremmo aggiungere coach_id utile per altre route
  if (user.role === "coach") {
    const [[coach]] = await pool.query(
      "SELECT id FROM coaches WHERE user_id = ?",
      [user.id],
    );
    payload.coach_id = coach?.id ?? null;
  }

  return payload;
}

// ================================================================
//  POST /api/auth/login
//  Body: { username: string, password: string }
//
//  Response 200:
//  {
//    token: string,
//    user: {
//      id, username, role,
//      team_id?,    ← solo per collaboratori
//      coach_id?,   ← solo per coach
//      name, surname, photo_url?
//    }
//  }
// ================================================================
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Validazione input
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username e password sono obbligatori" });
  }

  try {
    // 1. Cerca utente attivo
    const [[user]] = await pool.query(
      `SELECT id, username, password_hash, email, role, is_active
             FROM users
             WHERE username = ?
             LIMIT 1`,
      [username.trim()],
    );

    if (!user) {
      // Risposta volutamente generica per non rivelare se l'utente esiste
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    if (!user.is_active) {
      return res
        .status(403)
        .json({ error: "Account disattivato. Contatta l'amministratore." });
    }

    // 2. Verifica password
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // 3. Aggiorna last_login (fire-and-forget, non blocca la risposta)
    pool
      .query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])
      .catch((err) =>
        console.error("[auth] Errore aggiornamento last_login:", err),
      );

    // 4. Costruisce payload JWT (include team_id per collaboratori)
    const payload = await buildTokenPayload(user);

    // 5. Genera token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    // 6. Recupera i dati del profilo da mostrare nel frontend
    const profile = await getProfile(user.id, user.role);

    // 7. Risposta
    return res.json({
      token,
      user: {
        ...payload,
        name: profile?.name ?? null,
        surname: profile?.surname ?? null,
        photo_url: profile?.photo_url ?? null,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("[auth] POST /login:", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  GET /api/auth/me
//  Richiede token valido. Restituisce il profilo aggiornato.
//
//  Utile per:
//    - Verificare che il token sia ancora valido al caricamento pagina
//    - Rileggere team_id / coach_id se qualcosa è cambiato
// ================================================================
router.get("/me", authenticate, async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT id, username, email, role, is_active, last_login FROM users WHERE id = ?",
      [req.user.id],
    );

    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ error: "Utente non trovato o disattivato" });
    }

    const profile = await getProfile(user.id, user.role);
    const payload = await buildTokenPayload(user);

    return res.json({
      ...payload,
      name: profile?.name ?? null,
      surname: profile?.surname ?? null,
      photo_url: profile?.photo_url ?? null,
      email: user.email,
      last_login: user.last_login,
    });
  } catch (err) {
    console.error("[auth] GET /me:", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  POST /api/auth/logout
//  Il JWT è stateless: il vero logout avviene lato client
//  eliminando il token da localStorage. Questa rotta esiste
//  per compatibilità e per future implementazioni di blacklist.
// ================================================================
router.post("/logout", authenticate, (req, res) => {
  // In futuro: aggiungere il token a una blacklist su Redis/DB
  return res.json({ ok: true, message: "Logout effettuato" });
});

// ================================================================
//  POST /api/auth/refresh
//  Rinnova il token se quello attuale è ancora valido
//  (e mancano meno di 2h alla scadenza).
// ================================================================
router.post("/refresh", authenticate, async (req, res) => {
  try {
    // Ricostruisce il payload aggiornato dal DB
    // (utile se team_id o role sono cambiati dall'ultimo login)
    const [[user]] = await pool.query(
      "SELECT id, username, role, is_active FROM users WHERE id = ?",
      [req.user.id],
    );

    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ error: "Utente non trovato o disattivato" });
    }

    const payload = await buildTokenPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    return res.json({ token });
  } catch (err) {
    console.error("[auth] POST /refresh:", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
});

// ================================================================
//  HELPER PRIVATO: recupera il profilo esteso (coach o collaborator)
// ================================================================
async function getProfile(userId, role) {
  if (role === "coach") {
    const [[coach]] = await pool.query(
      "SELECT id, name, surname, photo_url FROM coaches WHERE user_id = ?",
      [userId],
    );
    return coach ?? null;
  }

  if (role === "collaborator") {
    const [[collab]] = await pool.query(
      "SELECT id, name, surname FROM collaborators WHERE user_id = ?",
      [userId],
    );
    return collab ?? null;
  }

  return null;
}

module.exports = router;
/*
/* REGISTER da aggiornare 
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
*/
