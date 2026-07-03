const thresholdRepository = require("../repositories/thresholdRepository");

// mengambil threshold aktif dari database
async function getActiveThreshold() {
  const threshold = await thresholdRepository.findActive();
  if (!threshold) {
    throw { status: 404, message: "Threshold belum dikonfigurasi" };
  }
  return threshold;
}

// update threshold di database
async function updateThreshold(phMin, phMax, tempMin, tempMax, tdsMin, tdsMax, tssMin, tssMax) {
  // Validasi: min harus lebih kecil dari max
  if (phMin >= phMax) throw { status: 400, message: "ph_min harus lebih kecil dari ph_max" };
  if (tempMin >= tempMax) throw { status: 400, message: "temp_min harus lebih kecil dari temp_max" };
  if (tdsMin >= tdsMax) throw { status: 400, message: "tds_min harus lebih kecil dari tds_max" };
  if (tssMin >= tssMax) throw { status: 400, message: "tss_min harus lebih kecil dari tss_max" };

  const threshold = await thresholdRepository.update(
    phMin, phMax, tempMin, tempMax, tdsMin, tdsMax, tssMin, tssMax
  );
  return threshold;
}

// reset threshold ke default (Permenkes No. 32/2017)
async function resetThreshold() {
  const threshold = await thresholdRepository.reset();
  return threshold;
}

module.exports = {
  getActiveThreshold,
  updateThreshold,
  resetThreshold,
};