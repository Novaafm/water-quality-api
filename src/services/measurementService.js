const measurementRepository = require("../repositories/measurementRepository");
const deviceRepository = require("../repositories/deviceRepository");

// memulai sesi pengukuran baru untuk device tertentu
async function startSession(deviceCode) {
    // 1. Validasi device
    const device = await deviceRepository.findByCode(deviceCode);
    if (!device) {
        throw { status: 404, message: "Device tidak ditemukan" };
    }

    // 2. Cek apakah sudah ada sesi aktif untuk device ini
    const activeSession = await measurementRepository.findActiveByDevice(device.id);
    if (activeSession) {
        throw { status: 409, message: "Device ini sudah memiliki sesi pengukuran yang aktif. Stop dulu sebelum mulai baru." };
    }

    // 3. Buat sesi baru
    const session = await measurementRepository.create(device.id, device.location);
    return session;
}

// menghentikan sesi pengukuran aktif untuk device tertentu
async function stopSession(deviceCode) {
    // 1. Validasi device
    const device = await deviceRepository.findByCode(deviceCode);
    if (!device) {
        throw { status: 404, message: "Device tidak ditemukan" };
    }

    // 2. Cari sesi aktif
    const activeSession = await measurementRepository.findActiveByDevice(device.id);
    if (!activeSession) {
        throw { status: 404, message: "Tidak ada sesi pengukuran aktif untuk device ini" };
    }

    // 3. Stop sesi
    const session = await measurementRepository.stop(activeSession.id);
    return session;
}

async function getAllSessions() {
    return await measurementRepository.findAll();
}

async function getSessionById(id) {
    const session = await measurementRepository.findById(id);
    if (!session) {
        throw { status: 404, message: "Sesi pengukuran tidak ditemukan" };
    }
    return session;
}

module.exports = {
    startSession,
    stopSession,
    getAllSessions,
    getSessionById,
};