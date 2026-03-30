const pool = require("../config/database");

// ============================================
// Semua query database untuk tabel thresholds
// ============================================

async function findActive() {
    const result = await pool.query(
        "SELECT * FROM thresholds ORDER BY id DESC LIMIT 1"
    );
    return result.rows[0] || null;
}

async function update(phMin, phMax, tempMin, tempMax, tdsMin, tdsMax, tssMin, tssMax) {
    const result = await pool.query(
        `UPDATE thresholds 
     SET ph_min = $1, ph_max = $2,
         temp_min = $3, temp_max = $4,
         tds_min = $5, tds_max = $6,
         tss_min = $7, tss_max = $8,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (SELECT id FROM thresholds ORDER BY id DESC LIMIT 1)
     RETURNING *`,
        [phMin, phMax, tempMin, tempMax, tdsMin, tdsMax, tssMin, tssMax]
    );
    return result.rows[0] || null;
}

async function reset() {
    const result = await pool.query(
        `UPDATE thresholds 
     SET ph_min = 6.5, ph_max = 8.5,
         temp_min = 25.0, temp_max = 30.0,
         tds_min = 0, tds_max = 500.0,
         tss_min = 0, tss_max = 25.0,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (SELECT id FROM thresholds ORDER BY id DESC LIMIT 1)
     RETURNING *`
    );
    return result.rows[0] || null;
}

module.exports = {
    findActive,
    update,
    reset,
};