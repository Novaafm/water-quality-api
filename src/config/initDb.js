// ============================================
// Inisialisasi Database UniFlow (Fresh)
// Jalankan: npm run db:init
// PERINGATAN: Ini akan HAPUS semua tabel dan data!
// ============================================

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDB = async () => {
  try {
    console.log("🔄 Initializing UniFlow database...\n");

    // ---- Drop all existing tables ----
    await pool.query(`
      DROP TABLE IF EXISTS alerts CASCADE;
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS chat_sessions CASCADE;
      DROP TABLE IF EXISTS sensor_data CASCADE;
      DROP TABLE IF EXISTS thresholds CASCADE;
      DROP TABLE IF EXISTS devices CASCADE;
      DROP TABLE IF EXISTS ambang_batas CASCADE;
      DROP TABLE IF EXISTS perangkat_iot CASCADE;
    `);
    console.log("✅ Old tables dropped");

    // ---- 1. devices ----
    await pool.query(`
      CREATE TABLE devices (
        id SERIAL PRIMARY KEY,
        device_code VARCHAR(50) UNIQUE NOT NULL,
        location VARCHAR(255),
        installed_at DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
      );
    `);
    console.log("✅ Table devices created");

    // ---- 2. sensor_data ----
    await pool.query(`
      CREATE TABLE sensor_data (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
        ph DECIMAL(5,2),
        turbidity DECIMAL(8,2),
        tds DECIMAL(8,2),
        temperature DECIMAL(5,2),
        wqi_score DECIMAL(5,2),
        wqi_status VARCHAR(20) DEFAULT 'Not Calculated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table sensor_data created");

    // ---- 3. thresholds ----
    await pool.query(`
      CREATE TABLE thresholds (
        id SERIAL PRIMARY KEY,
        ph_min DECIMAL(5,2) DEFAULT 6.5,
        ph_max DECIMAL(5,2) DEFAULT 8.5,
        temp_min DECIMAL(5,2) DEFAULT 25.0,
        temp_max DECIMAL(5,2) DEFAULT 30.0,
        tds_min DECIMAL(8,2) DEFAULT 0,
        tds_max DECIMAL(8,2) DEFAULT 500.0,
        tss_min DECIMAL(8,2) DEFAULT 0,
        tss_max DECIMAL(8,2) DEFAULT 25.0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table thresholds created");

    // Insert default threshold (Permenkes No. 32/2017)
    await pool.query(`
      INSERT INTO thresholds 
        (ph_min, ph_max, temp_min, temp_max, tds_min, tds_max, tss_min, tss_max)
      VALUES 
        (6.5, 8.5, 19.0, 31.0, 0, 1000.0, 0, 25.0);
    `);
    console.log("✅ Default thresholds (Permenkes No. 32/2017) inserted");

    // ---- 4. alerts ----
    await pool.query(`
      CREATE TABLE alerts (
        id SERIAL PRIMARY KEY,
        sensor_data_id INTEGER REFERENCES sensor_data(id) ON DELETE CASCADE,
        parameter VARCHAR(20) NOT NULL,
        value DECIMAL(8,2) NOT NULL,
        threshold_min DECIMAL(8,2),
        threshold_max DECIMAL(8,2),
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'danger')),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table alerts created");

    // ---- 5. chat_sessions ----
    await pool.query(`
      CREATE TABLE chat_sessions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) DEFAULT 'New Session',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table chat_sessions created");

    // ---- 6. chat_messages ----
    await pool.query(`
      CREATE TABLE chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table chat_messages created");

    // ---- 7. Indexes ----
    await pool.query(`
      CREATE INDEX idx_sensor_created ON sensor_data(created_at DESC);
      CREATE INDEX idx_sensor_device ON sensor_data(device_id);
      CREATE INDEX idx_sensor_wqi ON sensor_data(wqi_status);
      CREATE INDEX idx_messages_session ON chat_messages(session_id);
      CREATE INDEX idx_alerts_read ON alerts(is_read);
      CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
      CREATE INDEX idx_devices_code ON devices(device_code);
    `);
    console.log("✅ Indexes created");

    // ---- 8. Default device ----
    await pool.query(`
      INSERT INTO devices (device_code, location)
      VALUES ('esp32-01', 'Saluran Air Telkom University');
    `);
    console.log("✅ Default device esp32-01 registered");

    console.log("\n🎉 Database initialization complete!");
    console.log("\n📋 Tables created (6):");
    console.log("   1. devices (device registry)");
    console.log("   2. sensor_data (sensor readings + WQI)");
    console.log("   3. thresholds (Permenkes standards)");
    console.log("   4. alerts (auto notifications)");
    console.log("   5. chat_sessions (AI chat sessions)");
    console.log("   6. chat_messages (AI chat messages)");

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
};

initDB();