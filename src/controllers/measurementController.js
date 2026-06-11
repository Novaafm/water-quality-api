const measurementService = require("../services/measurementService");

// ============================================
// Handle request/response untuk measurement sessions
// ============================================

async function start(req, res) {
    try {
        const { device_code } = req.body;

        if (!device_code) {
            return res.status(400).json({ error: "device_code wajib diisi" });
        }

        const session = await measurementService.startSession(device_code);

        res.status(201).json({
            message: "Sesi pengukuran dimulai",
            data: session,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error start measurement:", err.message);
        res.status(500).json({ error: "Gagal memulai sesi pengukuran" });
    }
}

async function stop(req, res) {
    try {
        const { device_code } = req.body;

        if (!device_code) {
            return res.status(400).json({ error: "device_code wajib diisi" });
        }

        const session = await measurementService.stopSession(device_code);

        res.json({
            message: "Sesi pengukuran selesai",
            data: session,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error stop measurement:", err.message);
        res.status(500).json({ error: "Gagal menghentikan sesi pengukuran" });
    }
}

async function getAll(req, res) {
    try {
        const data = await measurementService.getAllSessions();
        res.json({ count: data.length, data });
    } catch (err) {
        console.error("Error ambil measurements:", err.message);
        res.status(500).json({ error: "Gagal mengambil data sesi pengukuran" });
    }
}

async function getById(req, res) {
    try {
        const data = await measurementService.getSessionById(req.params.id);
        res.json({ data });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error ambil measurement:", err.message);
        res.status(500).json({ error: "Gagal mengambil data sesi pengukuran" });
    }
}

module.exports = {
    start,
    stop,
    getAll,
    getById,
};