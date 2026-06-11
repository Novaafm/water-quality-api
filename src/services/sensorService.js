const sensorRepository = require("../repositories/sensorRepository");
const deviceRepository = require("../repositories/deviceRepository");
const thresholdRepository = require("../repositories/thresholdRepository");
const alertRepository = require("../repositories/alertRepository");
const measurementRepository = require("../repositories/measurementRepository");
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

  // 4. Cek apakah ada sesi pengukuran aktif untuk device ini
  const activeSession = await measurementRepository.findActiveByDevice(device.id);
  const sessionId = activeSession ? activeSession.id : null;

  // 5. Simpan data sensor (dengan session_id jika ada)
  const savedData = await sensorRepository.insert(
    device.id, device.location, sessionId, ph, turbidity, tds, temperature, wqi.wqi_score, wqi.wqi_status
  );

  // 5.5 Update last_seen device
  await deviceRepository.updateLastSeen(device.id);

  // 6. Cek threshold & simpan alerts
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

  // 7. Return hasil
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

async function exportCSV({ days, zone, start, end } = {}) {
  const rows = await sensorRepository.findForExport({ days, zone, start, end });

  if (rows.length === 0) return null;

  // Ambil info measurement sessions untuk marker
  let sessions = [];
  if (start && end) {
    sessions = await measurementRepository.findByTimeRange(start, end);
  } else {
    const d = days || 90;
    const startDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    sessions = await measurementRepository.findByTimeRange(startDate, endDate);
  }

  // Buat lookup session by id
  const sessionMap = {};
  for (const s of sessions) {
    sessionMap[s.id] = s;
  }

  const headers = [
    "ID", "Device Code", "Lokasi", "pH", "TSS (NTU)",
    "TDS (ppm)", "Suhu (°C)", "Skor WQI", "Status WQI", "Waktu Pengukuran"
  ];

  const csvLines = [headers.join(",")];

  // Track session markers yang sudah ditulis
  const startedSessions = new Set();
  const endedSessions = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prevRow = i > 0 ? rows[i - 1] : null;

    // Cek apakah perlu tambah marker MULAI
    if (row.session_id && !startedSessions.has(row.session_id)) {
      const session = sessionMap[row.session_id];
      if (session) {
        const startTime = new Date(session.start_time).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        csvLines.push(`--- MULAI PENGUKURAN: ${session.location || "Unknown"} (${startTime} WIB) ---`);
      }
      startedSessions.add(row.session_id);
    }

    // Tambah data row
    csvLines.push([
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
    ].join(","));

    // Cek apakah perlu tambah marker SELESAI
    const nextRow = i < rows.length - 1 ? rows[i + 1] : null;
    if (row.session_id && !endedSessions.has(row.session_id)) {
      // Selesai jika: row berikutnya beda session, atau ini row terakhir
      if (!nextRow || nextRow.session_id !== row.session_id) {
        const session = sessionMap[row.session_id];
        if (session && session.end_time) {
          const endTime = new Date(session.end_time).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
          csvLines.push(`--- SELESAI PENGUKURAN: ${session.location || "Unknown"} (${endTime} WIB) ---`);
        }
        endedSessions.add(row.session_id);
      }
    }
  }

  return csvLines.join("\n");
}

module.exports = {
  saveSensorData,
  getAllSensorData,
  getLatestSensorData,
  getTodayStats,
  exportCSV,
};