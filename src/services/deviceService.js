const deviceRepository = require("../repositories/deviceRepository");

// ============================================
// Logic bisnis untuk device
// ============================================

async function registerDevice(deviceCode, location) {
  if (!deviceCode) {
    throw { status: 400, message: "device_code wajib diisi" };
  }

  try {
    const device = await deviceRepository.insert(deviceCode, location || "Belum ditentukan");
    return device;
  } catch (err) {
    if (err.code === "23505") {
      throw { status: 409, message: "Device dengan kode tersebut sudah terdaftar" };
    }
    throw err;
  }
}

async function getAllDevices() {
  return await deviceRepository.findAll();
}

async function getDeviceById(id) {
  const device = await deviceRepository.findById(id);
  if (!device) {
    throw { status: 404, message: "Device tidak ditemukan" };
  }
  return device;
}

async function updateDevice(id, location, status) {
  const device = await deviceRepository.update(id, location, status);
  if (!device) {
    throw { status: 404, message: "Device tidak ditemukan" };
  }
  return device;
}

async function deleteDevice(id) {
  const device = await deviceRepository.remove(id);
  if (!device) {
    throw { status: 404, message: "Device tidak ditemukan" };
  }
  return device;
}

module.exports = {
  registerDevice,
  getAllDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
};