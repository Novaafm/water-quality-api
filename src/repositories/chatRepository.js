const pool = require("../config/database");

// ============================================
// Semua query database untuk tabel chat
// ============================================

async function createSession(title) {
    const result = await pool.query(
        "INSERT INTO chat_sessions (title) VALUES ($1) RETURNING *",
        [title]
    );
    return result.rows[0];
}

async function findAllSessions() {
    const result = await pool.query(
        "SELECT * FROM chat_sessions ORDER BY updated_at DESC"
    );
    return result.rows;
}

async function findSessionById(id) {
    const result = await pool.query(
        "SELECT * FROM chat_sessions WHERE id = $1",
        [id]
    );
    return result.rows[0] || null;
}

async function findMessagesBySession(sessionId) {
    const result = await pool.query(
        `SELECT * FROM chat_messages 
     WHERE session_id = $1 
     ORDER BY created_at ASC`,
        [sessionId]
    );
    return result.rows;
}

async function findRecentMessages(sessionId, limit = 20) {
    const result = await pool.query(
        `SELECT role, content FROM chat_messages 
     WHERE session_id = $1 
     ORDER BY created_at DESC LIMIT $2`,
        [sessionId, limit]
    );
    return result.rows.reverse();
}

async function insertMessage(sessionId, role, content) {
    const result = await pool.query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *",
        [sessionId, role, content]
    );
    return result.rows[0];
}

async function updateSessionTimestamp(sessionId) {
    await pool.query(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [sessionId]
    );
}

async function updateSessionTitle(id, title) {
    const result = await pool.query(
        "UPDATE chat_sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [title, id]
    );
    return result.rows[0] || null;
}

module.exports = {
    createSession,
    findAllSessions,
    findSessionById,
    findMessagesBySession,
    findRecentMessages,
    insertMessage,
    updateSessionTimestamp,
    updateSessionTitle,
};