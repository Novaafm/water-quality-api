const pool = require("../config/database");

// ============================================
// Semua query database untuk tabel alerts
// ============================================

async function insert(sensorDataId, parameter, value, thresholdMin, thresholdMax, severity, message) {
  const result = await pool.query(
    `INSERT INTO alerts 
      (sensor_data_id, parameter, value, threshold_min, threshold_max, severity, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [sensorDataId, parameter, value, thresholdMin, thresholdMax, severity, message]
  );
  return result.rows[0];
}

async function findAll(limit = 50, unreadOnly = false) {
  let query = "SELECT * FROM alerts";
  const params = [];

  if (unreadOnly) {
    query += " WHERE is_read = false";
  }

  query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

async function countUnread() {
  const result = await pool.query(
    "SELECT COUNT(*) FROM alerts WHERE is_read = false"
  );
  return parseInt(result.rows[0].count);
}

async function markAsRead(id) {
  const result = await pool.query(
    "UPDATE alerts SET is_read = true WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

async function markAllAsRead() {
  const result = await pool.query(
    "UPDATE alerts SET is_read = true WHERE is_read = false RETURNING id"
  );
  return result.rowCount;
}

module.exports = {
  insert,
  findAll,
  countUnread,
  markAsRead,
  markAllAsRead,
};