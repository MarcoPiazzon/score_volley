if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const app = express();

// ── Security headers ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabilitato per CSP custom (React inline scripts)
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────
// In sviluppo: accetta tutto. In produzione: solo l'origin del dominio.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, cb) => {
      // Permetti richieste senza origin (es. curl, Postman) + origins consentiti
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin non consentito — ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Body parser ───────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));

// ── Request logger (solo sviluppo) ───────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    );
    next();
  });
}

app.get("/health", (req, res) => res.json({ status: "ok" }));
// ── Health check (Railway lo usa per verificare che il server sia up)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ── Routes API ───────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/matches", require("./routes/matches"));
app.use("/api/players", require("./routes/players"));
app.use("/api/competitions", require("./routes/competitions"));

// ── 404 per rotte /api/* non trovate ─────────────────────────────
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ error: `Rotta non trovata: ${req.method} ${req.path}` });
});

// ── Serve React build in produzione ───────────────────────────────
// In produzione Express serve i file buildati da Vite.
// In sviluppo Vite dev server gira su porta 5173 separatamente.
if (process.env.NODE_ENV === "production") {
  const CLIENT_BUILD = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(CLIENT_BUILD));
  // SPA fallback: qualsiasi rotta non-API ritorna index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(CLIENT_BUILD, "index.html"));
  });
}

// ── Error handler ────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[server] Errore non gestito:", err.message);
  res.status(500).json({ error: "Errore interno del server" });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const env = process.env.NODE_ENV || "development";
  console.log(`[server] Avviato su http://localhost:${PORT}  (${env})`);
});

module.exports = app;
