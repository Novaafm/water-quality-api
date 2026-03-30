const pool = require("../config/database");

// ============================================
// Semua query database untuk tabel devices
// ============================================

async function findByCode(deviceCode) {
  const result = await pool.query(
    "SELECT * FROM devices WHERE device_code = $1 AND status = 'active'",
    [deviceCode]
  );
  return result.rows[0] || null;
}

async function findAll() {
  const result = await pool.query(
    "SELECT * FROM devices ORDER BY id ASC"
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    "SELECT * FROM devices WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

async function insert(deviceCode, location) {
  const result = await pool.query(
    `INSERT INTO devices (device_code, location)
     VALUES ($1, $2)
     RETURNING *`,
    [deviceCode, location]
  );
  return result.rows[0];
}

async function update(id, location, status) {
  const result = await pool.query(
    `UPDATE devices 
     SET location = COALESCE($1, location),
         status = COALESCE($2, status)
     WHERE id = $3
     RETURNING *`,
    [location, status, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query(
    "DELETE FROM devices WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByCode,
  findAll,
  findById,
  insert,
  update,
  remove,
};