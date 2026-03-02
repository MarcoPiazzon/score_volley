// ================================================================
//  server.js  —  Entry point del backend (aggiornamento parziale)
//
//  Aggiungere le righe segnate con [NUOVO] al proprio server.js
//  esistente. Le rotte già presenti (auth, players) rimangono,
//  basta puntarle alle versioni aggiornate.
// ================================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5500",
    credentials: true,
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));

// ── Routes ─────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth")); // invariato

// [MODIFICATO] punta al file teams.js aggiornato
app.use("/api/teams", require("./routes/teams"));

// [MODIFICATO] matches.js aggiornato + montaggio separato per
// le route /api/teams/:teamId/matches che vivono in matches.js
app.use("/api/matches", require("./routes/matches"));

// Il router matches espone anche /team/:teamId → montato su /api/matches
// Quindi la rotta completa è:  GET /api/matches/team/:teamId
// Se preferisci /api/teams/:id/matches, puoi rimontarlo così:
//   const matchesRouter = require('./routes/matches');
//   app.use('/api/teams',  matchesRouter);   ← aggiunge /api/teams/team/:id
// Oppure aggiungere la route direttamente in teams.js

// [MODIFICATO] players.js aggiornato
app.use("/api/players", require("./routes/players"));

// [NUOVO] competizioni (stagioni + tornei unificati)
app.use("/api/competitions", require("./routes/competitions")); // [NUOVO]

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Rotta non trovata: ${req.method} ${req.path}` });
});

// ── Global error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[server] Errore non gestito:", err);
  res.status(500).json({ error: "Errore interno del server" });
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] Avviato su http://localhost:${PORT}`);
});

module.exports = app;
process.env.JWT_SECRET = "SUPER_SECRET";
