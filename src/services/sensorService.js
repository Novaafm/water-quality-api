const sensorRepository = require("../repositories/sensorRepository");
const deviceRepository = require("../repositories/deviceRepository");
const thresholdRepository = require("../repositories/thresholdRepository");
const alertRepository = require("../repositories/alertRepository");
const { calculateWQI, checkThresholdAlerts } = require("../utils/wqi");

// ============================================
// Logic bisnis untuk sensor
// Tidak kenal req/res, cuma terima data dan return hasil
// ============================================

async function saveSensorData(deviceCode, ph, turbidity, tds, temperature) {
  // 1. Validasi device terdaftar
  const device = await deviceRepository.findByCode(deviceCode);
  if (!device) {
    throw { status: 403, message: "Device tidak terdaftar atau tidak aktif" };
  }

  // 2. Ambil threshold
  const threshold = await thresholdRepository.findActive();
  if (!threshold) {
    throw { status: 500, message: "Threshold belum dikonfigurasi" };
  }

  // 3. Hitung WQI
  const wqi = calculateWQI({ ph, turbidity, tds, temperature }, threshold);

  // 4. Simpan data sensor
  const savedData = await sensorRepository.insert(
    device.id, ph, turbidity, tds, temperature, wqi.wqi_score, wqi.wqi_status
  );

  // 5. Cek threshold & simpan alerts
  const alertList = checkThresholdAlerts({ ph, turbidity, tds, temperature }, threshold);
  const savedAlerts = [];

  for (const alert of alertList) {
    const saved = await alertRepository.insert(
      savedData.id,
      alert.parameter,
      alert.value,
      alert.threshold_min,
      alert.threshold_max,
      alert.severity,
      alert.message
    );
    savedAlerts.push(saved);
  }

  // 6. Return hasil
  return {
    data: savedData,
    wqi: {
      score: wqi.wqi_score,
      status: wqi.wqi_status,
      detail: wqi.detail,
    },
    alerts: savedAlerts.length > 0 ? savedAlerts : null,
  };
}

async function getAllSensorData(limit) {
  return await sensorRepository.findAll(limit);
}

async function getLatestSensorData() {
  return await sensorRepository.findLatest();
}

async function getTodayStats() {
  return await sensorRepository.getStatsToday();
}

async function exportCSV(days) {
  const rows = await sensorRepository.findForExport(days);

  if (rows.length === 0) return null;

  const headers = [
    "ID", "Device Code", "Lokasi", "pH", "TSS (NTU)",
    "TDS (ppm)", "Suhu (°C)", "Skor WQI", "Status WQI", "Waktu Pengukuran"
  ];

  const csvRows = rows.map((row) => [
    row.id,
    row.device_code || "",
    row.location || "",
    row.ph,
    row.tss_ntu,
    row.tds,
    row.temperature,
    row.wqi_score || "",
    row.wqi_status || "",
    row.created_at
  ]);

  const csv = [
    headers.join(","),
    ...csvRows.map((row) => row.join(","))
  ].join("\n");

  return csv;
}

module.exports = {
  saveSensorData,
  getAllSensorData,
  getLatestSensorData,
  getTodayStats,
  exportCSV,
};