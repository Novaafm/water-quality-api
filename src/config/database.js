const { Pool } = require("pg");
require("dotenv").config();

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
    console.log("✅ PostgreSQL connected | Timezone: WIB (Asia/Jakarta)");
  })
  .catch((err) => {
    console.error("❌ Gagal konek ke PostgreSQL:", err.message);
  });

module.exports = pool;