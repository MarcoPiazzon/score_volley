// ================================================================
//  db.js  —  Pool PostgreSQL condiviso da tutti i routes
//
//  Variabili d'ambiente attese in .env:
//    DATABASE_URL   oppure   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
//
//  Railway fornisce automaticamente DATABASE_URL — ha priorità.
// ================================================================

const { Pool } = require("pg");

let pool;

if (process.env.DATABASE_URL) {
  // Produzione (Railway / Neon / Supabase)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  });
} else {
  // Sviluppo locale
  pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "volleyball",
  });
}

// Health-check all'avvio
pool
  .connect()
  .then((client) => {
    console.log("[db] Connessione PostgreSQL OK");
    client.release();
  })
  .catch((err) => {
    console.error("[db] Impossibile connettersi al database:", err.message);
  });

module.exports = pool;
