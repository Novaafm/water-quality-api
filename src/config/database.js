const { Pool, types } = require("pg");
require("dotenv").config();

// Fix: Return timestamps dengan offset WIB (+07:00) bukan UTC (Z)
types.setTypeParser(1114, (str) => str.replace(" ", "T") + "+07:00");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: "-c timezone=Asia/Jakarta",
});

// Test koneksi
pool.query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL connected | Timezone: WIB (Asia/Jakarta)");
  })
  .catch((err) => {
    console.error("Gagal konek ke PostgreSQL:", err.message);
  });

module.exports = pool;