const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Set timezone ke WIB (Asia/Jakarta)
pool.on("connect", (client) => {
  client.query("SET timezone = 'Asia/Jakarta'");
});

// Test koneksi
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Gagal konek ke PostgreSQL:", err.message);
  } else {
    console.log("✅ PostgreSQL connected | Timezone: WIB (Asia/Jakarta)");
  }
});

module.exports = pool;