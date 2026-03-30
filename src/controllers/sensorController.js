const sensorService = require("../services/sensorService");

// ============================================
// Handle request/response untuk sensor
// Tidak ada query database atau logic bisnis di sini
// ============================================

async function create(req, res) {
    try {
        const { device_code, ph, turbidity, tds, temperature } = req.body;

        if (!device_code) {
            return res.status(400).json({ error: "device_code wajib diisi" });
        }

        const result = await sensorService.saveSensorData(device_code, ph, turbidity, tds, temperature);

        res.status(201).json({
            message: "Data sensor berhasil disimpan",
            ...result,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error simpan sensor:", err.message);
        res.status(500).json({ error: "Gagal menyimpan data sensor" });
    }
}

async function getAll(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const data = await sensorService.getAllSensorData(limit);

        res.json({ count: data.length, data });
    } catch (err) {
        console.error("Error ambil sensor:", err.message);
        res.status(500).json({ error: "Gagal mengambil data sensor" });
    }
}

async function getLatest(req, res) {
    try {
        const data = await sensorService.getLatestSensorData();

        if (!data) {
            return res.status(404).json({ error: "Belum ada data sensor" });
        }

        res.json({ data });
    } catch (err) {
        console.error("Error ambil latest:", err.message);
        res.status(500).json({ error: "Gagal mengambil data terbaru" });
    }
}

async function getStats(req, res) {
    try {
        const data = await sensorService.getTodayStats();
        res.json({ data });
    } catch (err) {
        console.error("Error ambil stats:", err.message);
        res.status(500).json({ error: "Gagal mengambil statistik" });
    }
}

async function exportCSV(req, res) {
    try {
        const days = parseInt(req.query.days) || 90;
        const csv = await sensorService.exportCSV(days);

        if (!csv) {
            return res.status(404).json({ error: "Tidak ada data dalam rentang waktu tersebut" });
        }

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=data_kualitas_air.csv");
        res.send(csv);
    } catch (err) {
        console.error("Error export CSV:", err.message);
        res.status(500).json({ error: "Gagal mengekspor data CSV" });
    }
}

module.exports = {
    create,
    getAll,
    getLatest,
    getStats,
    exportCSV,
};