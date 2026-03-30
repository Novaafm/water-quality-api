const chatService = require("../services/chatService");

// ============================================
// Handle request/response untuk chat
// ============================================

async function createSession(req, res) {
    try {
        const { title } = req.body;
        const data = await chatService.createNewSession(title);

        res.status(201).json({
            message: "Sesi chat baru dibuat",
            data,
        });
    } catch (err) {
        console.error("Error buat sesi:", err.message);
        res.status(500).json({ error: "Gagal membuat sesi chat" });
    }
}

async function getAllSessions(req, res) {
    try {
        const data = await chatService.getAllSessions();
        res.json({ data });
    } catch (err) {
        console.error("Error ambil sesi:", err.message);
        res.status(500).json({ error: "Gagal mengambil sesi chat" });
    }
}

async function getMessages(req, res) {
    try {
        const data = await chatService.getSessionMessages(parseInt(req.params.id));

        res.json({
            session_id: parseInt(req.params.id),
            count: data.length,
            data,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error ambil pesan:", err.message);
        res.status(500).json({ error: "Gagal mengambil pesan" });
    }
}

async function sendMessage(req, res) {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "message wajib diisi" });
        }

        const aiResponse = await chatService.sendMessage(parseInt(req.params.id), message);

        res.json({
            session_id: parseInt(req.params.id),
            user_message: message,
            ai_response: aiResponse,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error chat:", err.message);
        res.status(500).json({ error: "Gagal memproses chat: " + err.message });
    }
}

module.exports = {
    createSession,
    getAllSessions,
    getMessages,
    sendMessage,
};