const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "volleyball",

  // Pool settings
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Restituisce sempre rows come array plain object
  namedPlaceholders: true,
  dateStrings: true,
  timezone: "+00:00",
});

// Quick health-check all'avvio (non blocca se fallisce)
pool
  .getConnection()
  .then((conn) => {
    console.log("[db] Connessione al database OK");
    conn.release();
  })
  .catch((err) => {
    console.error("[db] Impossibile connettersi al database:", err.message);
  });

module.exports = pool;
