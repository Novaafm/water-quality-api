const thresholdService = require("../services/thresholdService");

// ============================================
// Handle request/response untuk threshold
// ============================================

async function getActive(req, res) {
    try {
        const data = await thresholdService.getActiveThreshold();
        res.json({ data });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error ambil threshold:", err.message);
        res.status(500).json({ error: "Gagal mengambil threshold" });
    }
}

async function update(req, res) {
    try {
        const { ph_min, ph_max, temp_min, temp_max, tds_min, tds_max, tss_min, tss_max } = req.body;

        const data = await thresholdService.updateThreshold(
            ph_min, ph_max, temp_min, temp_max, tds_min, tds_max, tss_min, tss_max
        );

        res.json({
            message: "Threshold berhasil diperbarui",
            data,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error update threshold:", err.message);
        res.status(500).json({ error: "Gagal memperbarui threshold" });
    }
}

async function reset(req, res) {
    try {
        const data = await thresholdService.resetThreshold();

        res.json({
            message: "Threshold direset ke standar Permenkes No. 32/2017",
            data,
        });
    } catch (err) {
        console.error("Error reset threshold:", err.message);
        res.status(500).json({ error: "Gagal mereset threshold" });
    }
}

module.exports = {
    getActive,
    update,
    reset,
};