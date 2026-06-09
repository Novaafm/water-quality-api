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
        const zone = req.query.zone || null;
        let start = req.query.start || null;
        let end = req.query.end || null;

        // Auto-append waktu jika user cuma kirim tanggal
        if (start && !start.includes(" ") && !start.includes("T")) {
            start = start + " 00:00:00";
        }
        if (end && !end.includes(" ") && !end.includes("T")) {
            end = end + " 23:59:59";
        }

        const csv = await sensorService.exportCSV({ days, zone, start, end });

        if (!csv) {
            return res.status(404).json({ error: "Tidak ada data dalam rentang waktu tersebut" });
        }

        const now = new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false
        }).replace(/[/:]/g, "-").replace(/, /g, "_");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=data_kualitas_air_${now}.csv`);
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