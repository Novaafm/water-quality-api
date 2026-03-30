const alertService = require("../services/alertService");

// ============================================
// Handle request/response untuk alert
// ============================================

async function getAll(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const unreadOnly = req.query.unread === "true";

        const result = await alertService.getAlerts(limit, unreadOnly);
        res.json(result);
    } catch (err) {
        console.error("Error ambil alerts:", err.message);
        res.status(500).json({ error: "Gagal mengambil alerts" });
    }
}

async function markRead(req, res) {
    try {
        const data = await alertService.readAlert(req.params.id);

        res.json({
            message: "Alert ditandai sebagai sudah dibaca",
            data,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error update alert:", err.message);
        res.status(500).json({ error: "Gagal mengupdate alert" });
    }
}

async function markAllRead(req, res) {
    try {
        const count = await alertService.readAllAlerts();

        res.json({
            message: count + " alert ditandai sebagai sudah dibaca",
            count,
        });
    } catch (err) {
        console.error("Error read all alerts:", err.message);
        res.status(500).json({ error: "Gagal mengupdate alerts" });
    }
}

module.exports = {
    getAll,
    markRead,
    markAllRead,
};