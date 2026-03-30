const alertRepository = require("../repositories/alertRepository");

// ============================================
// Logic bisnis untuk alert
// ============================================

async function getAlerts(limit, unreadOnly) {
    const data = await alertRepository.findAll(limit, unreadOnly);
    const unreadCount = await alertRepository.countUnread();

    return {
        unread_count: unreadCount,
        count: data.length,
        data,
    };
}

async function readAlert(id) {
    const alert = await alertRepository.markAsRead(id);
    if (!alert) {
        throw { status: 404, message: "Alert tidak ditemukan" };
    }
    return alert;
}

async function readAllAlerts() {
    const count = await alertRepository.markAllAsRead();
    return count;
}

module.exports = {
    getAlerts,
    readAlert,
    readAllAlerts,
};