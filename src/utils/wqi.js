// ============================================
// Water Quality Index (WQI) Calculator
// Sesuai CD-2 B-03:
// - Pembobotan parameter (TDS & Kekeruhan bobot tinggi)
// - Menghasilkan skor 0-100 dan status (Baik/Sedang/Buruk)
// ============================================

/**
 * Hitung sub-index per parameter
 * Dalam range normal = skor tinggi (75-100)
 * Di luar range = skor rendah (0-74)
 */
function calculateSubIndex(value, min, max) {
    if (value === null || value === undefined) return null;

    const val = parseFloat(value);
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);

    // Dalam rentang normal
    if (val >= minVal && val <= maxVal) {
        const mid = (minVal + maxVal) / 2;
        const range = (maxVal - minVal) / 2;
        const deviation = Math.abs(val - mid);
        const score = 100 - (deviation / range) * 25;
        return Math.max(0, Math.min(100, score));
    }

    // Di bawah batas minimum
    if (val < minVal) {
        const deviation = minVal - val;
        const tolerance = minVal * 0.5 || 5;
        const score = 75 - (deviation / tolerance) * 75;
        return Math.max(0, Math.min(74, score));
    }

    // Di atas batas maksimum
    if (val > maxVal) {
        const deviation = val - maxVal;
        const tolerance = maxVal * 0.5 || 5;
        const score = 75 - (deviation / tolerance) * 75;
        return Math.max(0, Math.min(74, score));
    }

    return 0;
}

/**
 * Hitung WQI keseluruhan
 * Bobot sesuai CD-2 B-03:
 * - pH: 0.20
 * - Suhu: 0.10
 * - TDS: 0.35 (bobot tinggi)
 * - TSS/Turbidity: 0.35 (bobot tinggi)
 */
function calculateWQI(sensorData, threshold) {
    const weights = {
        ph: 0.20,
        temp: 0.10,
        tds: 0.35,
        tss: 0.35,
    };

    const subIndex = {
        ph: calculateSubIndex(sensorData.ph, threshold.ph_min, threshold.ph_max),
        temp: calculateSubIndex(sensorData.temperature, threshold.temp_min, threshold.temp_max),
        tds: calculateSubIndex(sensorData.tds, threshold.tds_min, threshold.tds_max),
        tss: calculateSubIndex(sensorData.turbidity, threshold.tss_min, threshold.tss_max),
    };

    let totalWeight = 0;
    let totalScore = 0;

    for (const param of Object.keys(weights)) {
        if (subIndex[param] !== null) {
            totalScore += subIndex[param] * weights[param];
            totalWeight += weights[param];
        }
    }

    const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;

    let status;
    if (score >= 80) {
        status = "Baik";
    } else if (score >= 50) {
        status = "Sedang";
    } else {
        status = "Buruk";
    }

    return {
        wqi_score: score,
        wqi_status: status,
        detail: subIndex,
    };
}

/**
 * Cek parameter yang melewati threshold, generate alerts
 */
function checkThresholdAlerts(sensorData, threshold) {
    const alerts = [];

    const parameters = [
        { name: "ph", value: sensorData.ph, min: threshold.ph_min, max: threshold.ph_max, unit: "pH" },
        { name: "temperature", value: sensorData.temperature, min: threshold.temp_min, max: threshold.temp_max, unit: "°C" },
        { name: "tds", value: sensorData.tds, min: threshold.tds_min, max: threshold.tds_max, unit: "ppm" },
        { name: "tss", value: sensorData.turbidity, min: threshold.tss_min, max: threshold.tss_max, unit: "NTU" },
    ];

    for (const param of parameters) {
        if (param.value === null || param.value === undefined) continue;

        const val = parseFloat(param.value);
        const min = parseFloat(param.min);
        const max = parseFloat(param.max);

        if (val < min) {
            const deviation = ((min - val) / min) * 100;
            const severity = deviation > 30 ? "danger" : "warning";

            alerts.push({
                parameter: param.name,
                value: val,
                threshold_min: min,
                threshold_max: max,
                severity,
                message: `${param.name.toUpperCase()} (${val} ${param.unit}) di bawah batas minimum (${min} ${param.unit})`,
            });
        }

        if (val > max) {
            const deviation = ((val - max) / max) * 100;
            const severity = deviation > 30 ? "danger" : "warning";

            alerts.push({
                parameter: param.name,
                value: val,
                threshold_min: min,
                threshold_max: max,
                severity,
                message: `${param.name.toUpperCase()} (${val} ${param.unit}) melewati batas maksimum (${max} ${param.unit})`,
            });
        }
    }

    return alerts;
}

module.exports = { calculateWQI, checkThresholdAlerts };