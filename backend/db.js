const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "volley_app",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "volleyball",
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[db] Client error:", err.message);
});

pool
  .connect()
  .then((client) => {
    console.log("[db] Connessione a PostgreSQL OK");
    client.release();
  })
  .catch((err) => console.error("[db] Connessione fallita:", err.message));

module.exports = pool;
