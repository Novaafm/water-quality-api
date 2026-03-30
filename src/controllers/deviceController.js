const deviceService = require("../services/deviceService");

// ============================================
// Handle request/response untuk device
// ============================================

async function create(req, res) {
    try {
        const { device_code, location } = req.body;
        const device = await deviceService.registerDevice(device_code, location);

        res.status(201).json({
            message: "Device berhasil diregistrasi",
            data: device,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error register device:", err.message);
        res.status(500).json({ error: "Gagal meregistrasi device" });
    }
}

async function getAll(req, res) {
    try {
        const data = await deviceService.getAllDevices();
        res.json({ count: data.length, data });
    } catch (err) {
        console.error("Error ambil devices:", err.message);
        res.status(500).json({ error: "Gagal mengambil data device" });
    }
}

async function getById(req, res) {
    try {
        const data = await deviceService.getDeviceById(req.params.id);
        res.json({ data });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error ambil device:", err.message);
        res.status(500).json({ error: "Gagal mengambil data device" });
    }
}

async function update(req, res) {
    try {
        const { location, status } = req.body;
        const data = await deviceService.updateDevice(req.params.id, location, status);

        res.json({
            message: "Device berhasil diperbarui",
            data,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error update device:", err.message);
        res.status(500).json({ error: "Gagal memperbarui device" });
    }
}

async function remove(req, res) {
    try {
        const data = await deviceService.deleteDevice(req.params.id);

        res.json({
            message: "Device berhasil dihapus",
            data,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error("Error hapus device:", err.message);
        res.status(500).json({ error: "Gagal menghapus device" });
    }
}

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove,
};