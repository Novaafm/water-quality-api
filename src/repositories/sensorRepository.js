const pool = require("../config/database");

// ============================================
// Semua query database untuk tabel sensor_data
// ============================================

async function insert(deviceId, location, ph, turbidity, tds, temperature, wqiScore, wqiStatus) {
  const result = await pool.query(
    `INSERT INTO sensor_data 
      (device_id, location, ph, turbidity, tds, temperature, wqi_score, wqi_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [deviceId, location, ph, turbidity, tds, temperature, wqiScore, wqiStatus]
  );
  return result.rows[0];
}

async function findAll(limit = 50) {
  const result = await pool.query(
    `SELECT s.*, d.device_code
     FROM sensor_data s
     LEFT JOIN devices d ON s.device_id = d.id
     ORDER BY s.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function findLatest() {
  const result = await pool.query(
    `SELECT s.*, d.device_code
     FROM sensor_data s
     LEFT JOIN devices d ON s.device_id = d.id
     ORDER BY s.created_at DESC LIMIT 1`
  );
  return result.rows[0] || null;
}

async function getStatsToday() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_readings,
      ROUND(AVG(ph)::numeric, 2) as avg_ph,
      ROUND(AVG(turbidity)::numeric, 2) as avg_turbidity,
      ROUND(AVG(tds)::numeric, 2) as avg_tds,
      ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
      ROUND(AVG(wqi_score)::numeric, 2) as avg_wqi_score,
      ROUND(MIN(ph)::numeric, 2) as min_ph,
      ROUND(MAX(ph)::numeric, 2) as max_ph,
      ROUND(MIN(tds)::numeric, 2) as min_tds,
      ROUND(MAX(tds)::numeric, 2) as max_tds
    FROM sensor_data
    WHERE created_at >= CURRENT_DATE
  `);
  return result.rows[0];
}

async function findForExport({ days, zone, start, end } = {}) {
  let query = `
    SELECT 
      s.id,
      d.device_code,
      s.location,
      s.ph,
      s.turbidity AS tss_ntu,
      s.tds,
      s.temperature,
      s.wqi_score,
      s.wqi_status,
      s.created_at
    FROM sensor_data s
    LEFT JOIN devices d ON s.device_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by date range
  if (start && end) {
    params.push(start, end);
    query += ` AND s.created_at >= $${params.length - 1} AND s.created_at <= $${params.length}`;
  } else {
    const d = days || 90;
    params.push(d);
    query += ` AND s.created_at >= NOW() - INTERVAL '1 day' * $${params.length}`;
  }

  // Filter by zone/location
  if (zone) {
    params.push(zone);
    query += ` AND s.location = $${params.length}`;
  }

  query += ` ORDER BY s.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

// ============================================
// Fungsi untuk AI Chatbot (Function Calling)
// ============================================

async function getStatsByPeriod(days) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_readings,
      ROUND(AVG(ph)::numeric, 2) as avg_ph,
      ROUND(AVG(turbidity)::numeric, 2) as avg_turbidity,
      ROUND(AVG(tds)::numeric, 2) as avg_tds,
      ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
      ROUND(AVG(wqi_score)::numeric, 2) as avg_wqi_score,
      ROUND(MIN(wqi_score)::numeric, 2) as min_wqi,
      ROUND(MAX(wqi_score)::numeric, 2) as max_wqi,
      ROUND(MIN(ph)::numeric, 2) as min_ph,
      ROUND(MAX(ph)::numeric, 2) as max_ph,
      ROUND(MIN(tds)::numeric, 2) as min_tds,
      ROUND(MAX(tds)::numeric, 2) as max_tds,
      ROUND(MIN(turbidity)::numeric, 2) as min_turbidity,
      ROUND(MAX(turbidity)::numeric, 2) as max_turbidity
    FROM sensor_data
    WHERE created_at >= NOW() - INTERVAL '1 day' * $1
  `, [days]);
  return result.rows[0];
}

async function getStatsByDateRange(startDate, endDate) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_readings,
      ROUND(AVG(ph)::numeric, 2) as avg_ph,
      ROUND(AVG(turbidity)::numeric, 2) as avg_turbidity,
      ROUND(AVG(tds)::numeric, 2) as avg_tds,
      ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
      ROUND(AVG(wqi_score)::numeric, 2) as avg_wqi_score,
      ROUND(MIN(wqi_score)::numeric, 2) as min_wqi,
      ROUND(MAX(wqi_score)::numeric, 2) as max_wqi
    FROM sensor_data
    WHERE created_at >= $1 AND created_at <= $2
  `, [startDate, endDate]);
  return result.rows[0];
}

async function getRecentReadings(limit = 10) {
  const result = await pool.query(
    `SELECT s.ph, s.turbidity, s.tds, s.temperature, s.wqi_score, s.wqi_status, s.created_at,
            s.location, d.device_code
     FROM sensor_data s
     LEFT JOIN devices d ON s.device_id = d.id
     ORDER BY s.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getWqiStatusCount(days) {
  const result = await pool.query(`
    SELECT wqi_status, COUNT(*) as count
    FROM sensor_data
    WHERE created_at >= NOW() - INTERVAL '1 day' * $1
    GROUP BY wqi_status
    ORDER BY count DESC
  `, [days]);
  return result.rows;
}

async function getDailyStats(days = 7) {
  const result = await pool.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as total_readings,
      ROUND(AVG(ph)::numeric, 2) as avg_ph,
      ROUND(AVG(turbidity)::numeric, 2) as avg_turbidity,
      ROUND(AVG(tds)::numeric, 2) as avg_tds,
      ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
      ROUND(AVG(wqi_score)::numeric, 2) as avg_wqi_score
    FROM sensor_data
    WHERE created_at >= NOW() - INTERVAL '1 day' * $1
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [days]);
  return result.rows;
}

async function getWeeklyStats(weeks = 12) {
  const result = await pool.query(`
    SELECT
      DATE_TRUNC('week', created_at)::date as week_start,
      COUNT(*) as total_readings,
      ROUND(AVG(ph)::numeric, 2) as avg_ph,
      ROUND(AVG(turbidity)::numeric, 2) as avg_turbidity,
      ROUND(AVG(tds)::numeric, 2) as avg_tds,
      ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
      ROUND(AVG(wqi_score)::numeric, 2) as avg_wqi_score
    FROM sensor_data
    WHERE created_at >= NOW() - INTERVAL '1 week' * $1
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week_start DESC
  `, [weeks]);
  return result.rows;
}

module.exports = {
  insert,
  findAll,
  findLatest,
  getStatsToday,
  findForExport,
  getStatsByPeriod,
  getStatsByDateRange,
  getRecentReadings,
  getWqiStatusCount,
  getDailyStats,
  getWeeklyStats,
};