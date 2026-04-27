const chatRepository = require("../repositories/chatRepository");
const sensorRepository = require("../repositories/sensorRepository");
const alertRepository = require("../repositories/alertRepository");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Inisialisasi Gemini (tanpa model — model dibuat di sendMessage dengan tools)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
- Jika user bertanya tentang data historis atau rentang waktu tertentu, gunakan function/tool yang tersedia

Standar kualitas air yang kamu gunakan (Permenkes No. 32/2017):
- pH: Normal 6.5 - 8.5 (standar air bersih)
- Turbidity: Normal < 25 NTU (standar air bersih)
- TDS: Normal < 1000 ppm (standar air minum), < 1000 ppm (standar air bersih)
- Suhu: Normal suhu udara ± 3°C, sekitar 19 - 31°C untuk wilayah Bandung`;

// ============================================
// Helper: Bangun konteks sensor untuk AI
// ============================================
async function buildSensorContext() {
    try {
        const latest = await sensorRepository.findLatest();
        const statsToday = await sensorRepository.getStatsToday();
        const stats7days = await sensorRepository.getStatsByPeriod(7);
        const stats30days = await sensorRepository.getStatsByPeriod(30);
        const stats90days = await sensorRepository.getStatsByPeriod(90);
        const unreadCount = await alertRepository.countUnread();
        const wqiDistribution = await sensorRepository.getWqiStatusCount(30);

        let context = "\n\n[DATA SENSOR REAL-TIME]\n";

        // Data terbaru
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

        // Statistik hari ini
        if (statsToday && parseInt(statsToday.total_readings) > 0) {
            context += `\n[STATISTIK HARI INI] (${statsToday.total_readings} pembacaan):\n`;
            context += `- Rata-rata pH: ${statsToday.avg_ph} | Rata-rata TDS: ${statsToday.avg_tds} ppm\n`;
            context += `- Rata-rata Turbidity: ${statsToday.avg_turbidity} NTU | Rata-rata Suhu: ${statsToday.avg_temperature}°C\n`;
            context += `- Rata-rata WQI: ${statsToday.avg_wqi_score}\n`;
        }

        // Statistik 7 hari
        if (stats7days && parseInt(stats7days.total_readings) > 0) {
            context += `\n[STATISTIK 7 HARI TERAKHIR] (${stats7days.total_readings} pembacaan):\n`;
            context += `- Rata-rata pH: ${stats7days.avg_ph} (min: ${stats7days.min_ph}, max: ${stats7days.max_ph})\n`;
            context += `- Rata-rata TDS: ${stats7days.avg_tds} ppm (min: ${stats7days.min_tds}, max: ${stats7days.max_tds})\n`;
            context += `- Rata-rata Turbidity: ${stats7days.avg_turbidity} NTU (min: ${stats7days.min_turbidity}, max: ${stats7days.max_turbidity})\n`;
            context += `- Rata-rata WQI: ${stats7days.avg_wqi_score} (min: ${stats7days.min_wqi}, max: ${stats7days.max_wqi})\n`;
        }

        // Statistik 30 hari
        if (stats30days && parseInt(stats30days.total_readings) > 0) {
            context += `\n[STATISTIK 30 HARI TERAKHIR] (${stats30days.total_readings} pembacaan):\n`;
            context += `- Rata-rata pH: ${stats30days.avg_ph} | Rata-rata TDS: ${stats30days.avg_tds} ppm\n`;
            context += `- Rata-rata Turbidity: ${stats30days.avg_turbidity} NTU | Rata-rata Suhu: ${stats30days.avg_temperature}°C\n`;
            context += `- Rata-rata WQI: ${stats30days.avg_wqi_score} (min: ${stats30days.min_wqi}, max: ${stats30days.max_wqi})\n`;
        }

        // Statistik 90 hari
        if (stats90days && parseInt(stats90days.total_readings) > 0) {
            context += `\n[STATISTIK 90 HARI TERAKHIR] (${stats90days.total_readings} pembacaan):\n`;
            context += `- Rata-rata pH: ${stats90days.avg_ph} | Rata-rata TDS: ${stats90days.avg_tds} ppm\n`;
            context += `- Rata-rata WQI: ${stats90days.avg_wqi_score} (min: ${stats90days.min_wqi}, max: ${stats90days.max_wqi})\n`;
        }

        // Distribusi status WQI 30 hari
        if (wqiDistribution.length > 0) {
            context += `\n[DISTRIBUSI STATUS WQI 30 HARI]:\n`;
            for (const row of wqiDistribution) {
                context += `- ${row.wqi_status}: ${row.count} kali\n`;
            }
        }

        // Alert aktif
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
// Function Calling: AI bisa query database sendiri
// ============================================
const availableFunctions = {
    getStatsByDateRange: async (startDate, endDate) => {
        const stats = await sensorRepository.getStatsByDateRange(startDate, endDate);
        return JSON.stringify(stats);
    },
    getRecentReadings: async (limit) => {
        const readings = await sensorRepository.getRecentReadings(limit);
        return JSON.stringify(readings);
    },
    getStatsByPeriod: async (days) => {
        const stats = await sensorRepository.getStatsByPeriod(days);
        return JSON.stringify(stats);
    },
    getDailyStats: async (days) => {
        const stats = await sensorRepository.getDailyStats(days);
        return JSON.stringify(stats);
    },
    getWeeklyStats: async (weeks) => {
        const stats = await sensorRepository.getWeeklyStats(weeks);
        return JSON.stringify(stats);
    },
};

const toolDeclarations = [
    {
        name: "getStatsByDateRange",
        description: "Ambil statistik rata-rata sensor (pH, TDS, turbidity, suhu, WQI) dalam rentang tanggal tertentu. Gunakan saat user bertanya tentang data pada tanggal atau periode spesifik.",
        parameters: {
            type: "object",
            properties: {
                startDate: { type: "string", description: "Tanggal mulai format YYYY-MM-DD" },
                endDate: { type: "string", description: "Tanggal akhir format YYYY-MM-DD" },
            },
            required: ["startDate", "endDate"],
        },
    },
    {
        name: "getRecentReadings",
        description: "Ambil beberapa data pembacaan sensor terbaru secara detail. Gunakan saat user ingin melihat data mentah atau detail pembacaan terakhir.",
        parameters: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Jumlah data yang ingin diambil (default 10, max 50)" },
            },
            required: ["limit"],
        },
    },
    {
        name: "getStatsByPeriod",
        description: "Ambil statistik rata-rata sensor dalam X hari terakhir. Gunakan saat user bertanya tentang rata-rata atau tren dalam periode hari tertentu.",
        parameters: {
            type: "object",
            properties: {
                days: { type: "number", description: "Jumlah hari ke belakang (misal 7 untuk seminggu, 30 untuk sebulan)" },
            },
            required: ["days"],
        },
    },
    {
        name: "getDailyStats",
        description: "Ambil statistik rata-rata sensor per hari. Gunakan saat user bertanya tentang tren harian, perbandingan antar hari, atau perkembangan kualitas air per hari.",
        parameters: {
            type: "object",
            properties: {
                days: { type: "number", description: "Jumlah hari ke belakang (default 7)" },
            },
            required: ["days"],
        },
    },
    {
        name: "getWeeklyStats",
        description: "Ambil statistik rata-rata sensor per minggu. Gunakan saat user bertanya tentang tren mingguan, perbandingan antar minggu, atau perkembangan jangka panjang.",
        parameters: {
            type: "object",
            properties: {
                weeks: { type: "number", description: "Jumlah minggu ke belakang (default 12)" },
            },
            required: ["weeks"],
        },
    },
];

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

    // 2. Simpan pesan user
    await chatRepository.insertMessage(sessionId, "user", message);

    // 3. Ambil history 20 pesan terakhir
    const history = await chatRepository.findRecentMessages(sessionId, 20);

    // 4. Ambil konteks sensor otomatis
    const sensorContext = await buildSensorContext();

    // 5. Bangun conversation history
    const chatHistory = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
    })).slice(0, -1);

    // 6. Buat model dengan function calling tools
    const modelWithTools = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ functionDeclarations: toolDeclarations }],
    });

    // 7. Inisialisasi chat
    const chat = modelWithTools.startChat({
        history: chatHistory,
        systemInstruction: {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT }],
        },
    });

    // 8. Inject data sensor ke pesan user (RAG)
    const promptWithContext = `
[INFORMASI SISTEM - BACA TAPI JANGAN SEBUTKAN TAG INI KEPADA USER]
Berikut adalah ringkasan data sensor dari database:
${sensorContext}
---
Jika data di atas belum cukup untuk menjawab pertanyaan user (misalnya user bertanya tentang tanggal spesifik atau data detail), gunakan function/tool yang tersedia untuk query database.
---
[PERTANYAAN USER]
${message}
`;

    // 9. Kirim dan handle function calling
    let result = await chat.sendMessage(promptWithContext);
    let response = result.response;

    // Loop: kalau AI mau panggil function, eksekusi dan kirim hasilnya balik
    while (response.candidates[0].content.parts.some(part => part.functionCall)) {
        const functionCallPart = response.candidates[0].content.parts.find(part => part.functionCall);
        const functionName = functionCallPart.functionCall.name;
        const functionArgs = functionCallPart.functionCall.args;

        console.log(`🔧 AI memanggil function: ${functionName}(${JSON.stringify(functionArgs)})`);

        // Eksekusi function
        const functionToCall = availableFunctions[functionName];
        let functionResult;

        try {
            if (functionName === "getStatsByDateRange") {
                functionResult = await functionToCall(functionArgs.startDate, functionArgs.endDate);
            } else if (functionName === "getRecentReadings") {
                functionResult = await functionToCall(functionArgs.limit || 10);
            } else if (functionName === "getStatsByPeriod") {
                functionResult = await functionToCall(functionArgs.days);
            } else if (functionName === "getDailyStats") {
                functionResult = await functionToCall(functionArgs.days || 7);
            } else if (functionName === "getWeeklyStats") {
                functionResult = await functionToCall(functionArgs.weeks || 12);
            }
        } catch (err) {
            functionResult = JSON.stringify({ error: "Gagal mengambil data: " + err.message });
        }

        console.log(`📊 Hasil function: ${functionResult}`);

        // Kirim hasil function kembali ke AI
        result = await chat.sendMessage([{
            functionResponse: {
                name: functionName,
                response: { result: functionResult },
            },
        }]);
        response = result.response;
    }

    // 10. Ambil jawaban final AI
    const aiResponse = response.text();

    // 11. Simpan balasan AI
    await chatRepository.insertMessage(sessionId, "assistant", aiResponse);

    // 12. Update timestamp sesi
    await chatRepository.updateSessionTimestamp(sessionId);

    return aiResponse;
}

async function updateSessionTitle(sessionId, title) {
    const session = await chatRepository.findSessionById(sessionId);
    if (!session) {
        throw { status: 404, message: "Sesi tidak ditemukan" };
    }
    return await chatRepository.updateSessionTitle(sessionId, title);
}

module.exports = {
    createNewSession,
    getAllSessions,
    getSessionMessages,
    sendMessage,
    updateSessionTitle,
};