const chatRepository = require("../repositories/chatRepository");
const sensorRepository = require("../repositories/sensorRepository");
const alertRepository = require("../repositories/alertRepository");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ============================================
// System Prompt UniFlow
// ============================================
const SYSTEM_PROMPT = `Kamu adalah UniFlow, asisten AI khusus monitoring kualitas air di Telkom University.

Karakteristik kamu:
- Berbicara dalam Bahasa Indonesia yang ramah dan informatif
- Kamu memahami parameter: pH, Turbidity (kekeruhan), TDS (Total Dissolved Solids), dan Suhu
- Jika data menunjukkan anomali, kamu memberikan peringatan dan saran
- Kamu menjelaskan data sensor dengan bahasa yang mudah dipahami
- Kamu memahami Water Quality Index (WQI) dengan status: Baik (>=80), Sedang (50-79), Buruk (<50)
- Jika ditanya di luar topik kualitas air, kamu mengarahkan kembali ke topik utama

Standar kualitas air yang kamu gunakan (Permenkes No. 32/2017):
- pH: Normal 6.5 - 8.5 (standar air bersih)
- Turbidity: Normal < 25 NTU (standar air bersih)
- TDS: Normal < 500 ppm (standar air minum), < 1000 ppm (standar air bersih)
- Suhu: Normal 25 - 30°C (suhu air ambient tropis)`;

// ============================================
// Helper: Bangun konteks sensor untuk AI
// ============================================
async function buildSensorContext() {
    try {
        const latest = await sensorRepository.findLatest();
        const stats = await sensorRepository.getStatsToday();
        const unreadCount = await alertRepository.countUnread();

        let context = "\n\n[DATA SENSOR REAL-TIME]\n";

        if (latest) {
            context += `Device: ${latest.device_code || "Unknown"} (${latest.location || "Lokasi belum ditentukan"})\n`;
            context += `Data terakhir (${latest.created_at}):\n`;
            context += `- pH: ${latest.ph}\n`;
            context += `- Turbidity: ${latest.turbidity} NTU\n`;
            context += `- TDS: ${latest.tds} ppm\n`;
            context += `- Suhu: ${latest.temperature}°C\n`;
            context += `- Skor WQI: ${latest.wqi_score || "Belum dihitung"}\n`;
            context += `- Status WQI: ${latest.wqi_status || "Belum dihitung"}\n`;
        } else {
            context += "Belum ada data sensor yang tersedia.\n";
        }

        if (stats && parseInt(stats.total_readings) > 0) {
            context += `\nStatistik hari ini (${stats.total_readings} pembacaan):\n`;
            context += `- Rata-rata pH: ${stats.avg_ph}\n`;
            context += `- Rata-rata Turbidity: ${stats.avg_turbidity} NTU\n`;
            context += `- Rata-rata TDS: ${stats.avg_tds} ppm\n`;
            context += `- Rata-rata Suhu: ${stats.avg_temperature}°C\n`;
            context += `- Rata-rata WQI: ${stats.avg_wqi_score}\n`;
        }

        if (unreadCount > 0) {
            context += `\n[PERINGATAN] Ada ${unreadCount} alert aktif yang belum dibaca.\n`;
        }

        return context;
    } catch (err) {
        console.error("Error bangun sensor context:", err.message);
        return "\n\n[DATA SENSOR TIDAK TERSEDIA]\n";
    }
}

// ============================================
// Logic bisnis untuk chat
// ============================================

async function createNewSession(title) {
    return await chatRepository.createSession(title || "Sesi Baru");
}

async function getAllSessions() {
    return await chatRepository.findAllSessions();
}

async function getSessionMessages(sessionId) {
    const session = await chatRepository.findSessionById(sessionId);
    if (!session) {
        throw { status: 404, message: "Sesi tidak ditemukan" };
    }
    return await chatRepository.findMessagesBySession(sessionId);
}

async function sendMessage(sessionId, message) {
    // 1. Cek sesi ada
    const session = await chatRepository.findSessionById(sessionId);
    if (!session) {
        throw { status: 404, message: "Sesi tidak ditemukan" };
    }

    // 2. Simpan pesan user ke database PostgreSQL
    await chatRepository.insertMessage(sessionId, "user", message);

    // 3. Ambil history 20 pesan terakhir
    const history = await chatRepository.findRecentMessages(sessionId, 20);

    // 4. Ambil konteks sensor dari database
    const sensorContext = await buildSensorContext();

    // DEBUGGING: Cek terminal kamu saat hit API ini!
    console.log("=== DEBUG SENSOR CONTEXT ===");
    console.log(sensorContext);
    console.log("============================");

    // 5. Bangun conversation history untuk Gemini
    // Hapus elemen terakhir (pesan user saat ini) karena akan kita modifikasi di langkah 7
    const chatHistory = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
    })).slice(0, -1);

    // 6. Inisialisasi Chat dengan history dan System Prompt
    const chat = model.startChat({
        history: chatHistory,
        systemInstruction: {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT }],
        },
    });

    // 7. INJECT DATA SENSOR KE PESAN USER (Teknik RAG)
    const promptWithContext = `
[INFORMASI SISTEM - BACA TAPI JANGAN SEBUTKAN TAG INI KEPADA USER]
Berikut adalah data sensor real-time saat ini dari database:
${sensorContext}
---
[PERTANYAAN USER]
${message}
`;

    // Kirim pesan yang sudah digabungkan dengan konteks ke Gemini
    const result = await chat.sendMessage(promptWithContext);
    const aiResponse = result.response.text();

    // 8. Simpan balasan AI ke database
    await chatRepository.insertMessage(sessionId, "assistant", aiResponse);

    // 9. Update timestamp sesi
    await chatRepository.updateSessionTimestamp(sessionId);

    return aiResponse;
}

module.exports = {
    createNewSession,
    getAllSessions,
    getSessionMessages,
    sendMessage,
};