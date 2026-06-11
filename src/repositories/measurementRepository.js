const pool = require("../config/database");

// ============================================
// Query database untuk tabel measurement_sessions
// ============================================

async function create(deviceId, location) {
    const result = await pool.query(
        `INSERT INTO measurement_sessions (device_id, location)
     VALUES ($1, $2)
     RETURNING *`,
        [deviceId, location]
    );
    return result.rows[0];
}

async function findActiveByDevice(deviceId) {
    const result = await pool.query(
        "SELECT * FROM measurement_sessions WHERE device_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1",
        [deviceId]
    );
    return result.rows[0] || null;
}

async function stop(id) {
    const result = await pool.query(
        `UPDATE measurement_sessions 
     SET end_time = NOW(), status = 'completed'
     WHERE id = $1
     RETURNING *`,
        [id]
    );
    return result.rows[0] || null;
}

async function findAll() {
    const result = await pool.query(
        `SELECT ms.*, d.device_code
     FROM measurement_sessions ms
     LEFT JOIN devices d ON ms.device_id = d.id
     ORDER BY ms.created_at DESC`
    );
    return result.rows;
}

async function findById(id) {
    const result = await pool.query(
        `SELECT ms.*, d.device_code
     FROM measurement_sessions ms
     LEFT JOIN devices d ON ms.device_id = d.id
     WHERE ms.id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

async function findByTimeRange(startTime, endTime) {
    const result = await pool.query(
        `SELECT ms.*, d.device_code
     FROM measurement_sessions ms
     LEFT JOIN devices d ON ms.device_id = d.id
     WHERE (ms.start_time <= $2) AND (ms.end_time >= $1 OR ms.end_time IS NULL)
     ORDER BY ms.start_time ASC`,
        [startTime, endTime]
    );
    return result.rows;
}

module.exports = {
    create,
    findActiveByDevice,
    stop,
    findAll,
    findById,
    findByTimeRange,
};