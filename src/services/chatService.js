const chatRepository = require("../repositories/chatRepository");
const sensorRepository = require("../repositories/sensorRepository");
const alertRepository = require("../repositories/alertRepository");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Inisialisasi Gemini (tanpa model — model dibuat di sendMessage dengan tools)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-3-flash", "gemini-3.5-flash"];
let currentModelIndex = 0;

function getNextModel() {
    const model = GEMINI_MODELS[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    return model;
}

function getOtherModel(currentModel) {
    return GEMINI_MODELS.find(m => m !== currentModel) || GEMINI_MODELS[0];
}

// 🔒 SAFETY NET: Konstanta batas aman
const MAX_FUNCTION_CALL_ITERATIONS = 5;

// Helper: clamp angka dalam rentang aman
const clamp = (value, min, max) => {
    const num = parseInt(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
};

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
- Saat memberikan data rata-rata atau statistik, SELALU tampilkan keempat parameter (pH, Turbidity, TDS, Suhu) dan WQI secara lengkap. Jangan pernah melewatkan parameter apapun.
- Jika ditanya di luar topik kualitas air, kamu mengarahkan kembali ke topik utama
- Jika user bertanya tentang data historis atau rentang waktu tertentu, gunakan function/tool yang tersedia
- Jika user menyebutkan zona/lokasi tertentu, gunakan parameter zone pada function yang tersedia

Standar kualitas air yang kamu gunakan (Permenkes No. 32/2017):
- pH: Normal 6.5 - 8.5 (standar air bersih)
- Turbidity: Normal < 25 NTU (standar air bersih)
- TDS: Normal < 1000 ppm (standar Permenkes No. 32/2017)
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

        // Daftar lokasi tersedia
        const locations = await sensorRepository.getAvailableLocations();
        if (locations.length > 0) {
            context += `\n[LOKASI TERSEDIA]:\n`;
            for (const loc of locations) {
                context += `- ${loc.location} (${loc.total_readings} pembacaan)\n`;
            }
        }

        return context;
    } catch (err) {
        console.error("Error bangun sensor context:", err.message);
        return "\n\n[DATA SENSOR TIDAK TERSEDIA]\n";
    }
}

// ============================================
// Function Calling: AI bisa query database sendiri
// 🔒 SAFETY NET: Semua parameter di-clamp ke rentang aman
// ============================================
const availableFunctions = {
    getStatsByDateRange: async (startDate, endDate, zone) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return JSON.stringify({ error: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD HH:mm:ss" });
        }

        if (start > end) {
            return JSON.stringify({ error: "Tanggal mulai harus lebih awal dari tanggal akhir" });
        }

        const stats = await sensorRepository.getStatsByDateRange(startDate, endDate, zone || null);
        return JSON.stringify(stats);
    },
    getRecentReadings: async (limit) => {
        const safeLimit = clamp(limit, 1, 50);
        const readings = await sensorRepository.getRecentReadings(safeLimit);
        return JSON.stringify(readings);
    },
    getStatsByPeriod: async (days, zone) => {
        const safeDays = clamp(days, 1, 90);
        const stats = await sensorRepository.getStatsByPeriod(safeDays, zone || null);
        return JSON.stringify(stats);
    },
    getDailyStats: async (days) => {
        const safeDays = clamp(days, 1, 90);
        const stats = await sensorRepository.getDailyStats(safeDays);
        return JSON.stringify(stats);
    },
    getWeeklyStats: async (weeks) => {
        const safeWeeks = clamp(weeks, 1, 13);
        const stats = await sensorRepository.getWeeklyStats(safeWeeks);
        return JSON.stringify(stats);
    },
};

const toolDeclarations = [
    {
        name: "getStatsByDateRange",
        description: "Ambil statistik rata-rata sensor (pH, TDS, turbidity, suhu, WQI) dalam rentang waktu tertentu. Bisa filter per zona/lokasi. Jika user bertanya tanggal spesifik (1 hari penuh), buat rentang dari 00:00:00 hingga 23:59:59.",
        parameters: {
            type: "object",
            properties: {
                startDate: { type: "string", description: "Tanggal mulai format YYYY-MM-DD HH:mm:ss (contoh: 2026-06-08 00:00:00)" },
                endDate: { type: "string", description: "Tanggal akhir format YYYY-MM-DD HH:mm:ss (contoh: 2026-06-08 23:59:59)" },
                zone: { type: "string", description: "Nama zona/lokasi pengukuran (contoh: Asrama, Saluran Air GKU). Kosongkan jika user tidak menyebut lokasi spesifik." },
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
        description: "Ambil statistik rata-rata sensor dalam X hari terakhir. Bisa filter per zona/lokasi. Gunakan saat user bertanya tentang rata-rata atau tren dalam periode hari tertentu.",
        parameters: {
            type: "object",
            properties: {
                days: { type: "number", description: "Jumlah hari ke belakang (misal 7 untuk seminggu, 30 untuk sebulan, max 90)" },
                zone: { type: "string", description: "Nama zona/lokasi pengukuran. Kosongkan jika user tidak menyebut lokasi spesifik." },
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
                days: { type: "number", description: "Jumlah hari ke belakang (default 7, max 90)" },
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
                weeks: { type: "number", description: "Jumlah minggu ke belakang (default 12, max 13 sesuai retensi data 90 hari)" },
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

    while (chatHistory.length > 0 && chatHistory[0].role === "model") {
        chatHistory.shift();
    }

    // 6. Pilih model (alternating)
    let modelName = getNextModel();
    console.log(`[Gemini] Using ${modelName}`);

    // 7. Buat model dengan function calling tools
    let modelWithTools = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: toolDeclarations }],
    });

    // 8. Inisialisasi chat
    let chat = modelWithTools.startChat({
        history: chatHistory,
        systemInstruction: {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT }],
        },
    });

    // Dapatkan waktu saat ini dalam format WIB
    const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    // 9. Inject data sensor ke pesan user (RAG)
    const promptWithContext = `
[INFORMASI SISTEM - BACA TAPI JANGAN SEBUTKAN TAG INI KEPADA USER]
Waktu saat ini adalah: ${currentTime} WIB. Gunakan ini sebagai patokan mutlak jika user bertanya "hari ini", "kemarin", "minggu lalu", dll.

Berikut adalah ringkasan data sensor dari database:
${sensorContext}
---
Jika data di atas belum cukup untuk menjawab pertanyaan user (misalnya user bertanya tentang tanggal spesifik, jam spesifik, atau zona/lokasi tertentu), gunakan function/tool yang tersedia untuk query database.
---
[PERTANYAAN USER]
${message}
`;

    // 10. Kirim dengan error handling + fallback model
    let result, response;
    try {
        result = await chat.sendMessage(promptWithContext);
        response = result.response;
    } catch (geminiError) {
        console.error(`[${modelName}] Error:`, geminiError.message);

        // Kalau 429 atau 503, coba model lain
        if (geminiError.message.includes("429") || geminiError.message.includes("503") || geminiError.message.includes("Resource has been exhausted")) {
            const fallbackModel = getOtherModel(modelName);
            console.log(`[Gemini] Fallback to ${fallbackModel}`);

            try {
                modelWithTools = genAI.getGenerativeModel({
                    model: fallbackModel,
                    tools: [{ functionDeclarations: toolDeclarations }],
                });

                chat = modelWithTools.startChat({
                    history: chatHistory,
                    systemInstruction: {
                        role: "user",
                        parts: [{ text: SYSTEM_PROMPT }],
                    },
                });

                result = await chat.sendMessage(promptWithContext);
                response = result.response;
            } catch (fallbackError) {
                console.error(`[${fallbackModel}] Fallback juga gagal:`, fallbackError.message);

                let fallbackMsg;
                if (fallbackError.message.includes("429") || fallbackError.message.includes("Resource has been exhausted")) {
                    fallbackMsg = "Maaf, batas penggunaan AI hari ini sudah tercapai. Coba lagi besok ya!";
                } else if (fallbackError.message.includes("503")) {
                    fallbackMsg = "Maaf, server AI sedang ramai. Coba lagi dalam beberapa detik ya!";
                } else {
                    fallbackMsg = "Maaf, terjadi gangguan pada sistem AI. Silakan coba lagi.";
                }

                await chatRepository.insertMessage(sessionId, "assistant", fallbackMsg);
                await chatRepository.updateSessionTimestamp(sessionId);
                return fallbackMsg;
            }
        } else if (geminiError.message.includes("400") || geminiError.message.includes("SAFETY")) {
            const fallbackMsg = "Maaf, saya tidak bisa memproses pertanyaan tersebut. Coba tanyakan tentang kualitas air ya!";
            await chatRepository.insertMessage(sessionId, "assistant", fallbackMsg);
            await chatRepository.updateSessionTimestamp(sessionId);
            return fallbackMsg;
        } else {
            const fallbackMsg = "Maaf, terjadi gangguan pada sistem AI. Silakan coba lagi.";
            await chatRepository.insertMessage(sessionId, "assistant", fallbackMsg);
            await chatRepository.updateSessionTimestamp(sessionId);
            return fallbackMsg;
        }
    }

    // 🔒 SAFETY NET: Loop dengan batas iterasi
    let iterations = 0;
    while (
        response.candidates[0].content.parts.some(part => part.functionCall) &&
        iterations < MAX_FUNCTION_CALL_ITERATIONS
    ) {
        iterations++;
        const functionCallPart = response.candidates[0].content.parts.find(part => part.functionCall);
        const functionName = functionCallPart.functionCall.name;
        const functionArgs = functionCallPart.functionCall.args;

        console.log(`[Iter ${iterations}/${MAX_FUNCTION_CALL_ITERATIONS}] AI memanggil function: ${functionName}(${JSON.stringify(functionArgs)})`);

        // Eksekusi function
        const functionToCall = availableFunctions[functionName];
        let functionResult;

        try {
            if (functionName === "getStatsByDateRange") {
                functionResult = await functionToCall(functionArgs.startDate, functionArgs.endDate, functionArgs.zone);
            } else if (functionName === "getRecentReadings") {
                functionResult = await functionToCall(functionArgs.limit || 10);
            } else if (functionName === "getStatsByPeriod") {
                functionResult = await functionToCall(functionArgs.days, functionArgs.zone);
            } else if (functionName === "getDailyStats") {
                functionResult = await functionToCall(functionArgs.days || 7);
            } else if (functionName === "getWeeklyStats") {
                functionResult = await functionToCall(functionArgs.weeks || 12);
            } else {
                functionResult = JSON.stringify({ error: `Function ${functionName} tidak tersedia` });
            }
        } catch (err) {
            functionResult = JSON.stringify({ error: "Gagal mengambil data: " + err.message });
        }

        console.log(`Hasil function: ${functionResult.substring(0, 200)}...`);

        // Kirim hasil function kembali ke AI (dengan error handling)
        try {
            result = await chat.sendMessage([{
                functionResponse: {
                    name: functionName,
                    response: { result: functionResult },
                },
            }]);
            response = result.response;
        } catch (geminiError) {
            console.error("Gemini error saat function calling:", geminiError.message);
            break;
        }
    }

    // 🔒 SAFETY NET: Log warning kalau iterasi mentok
    if (iterations >= MAX_FUNCTION_CALL_ITERATIONS) {
        console.warn(`Max function call iterations (${MAX_FUNCTION_CALL_ITERATIONS}) tercapai untuk session ${sessionId}`);
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

async function deleteSession(sessionId) {
    const session = await chatRepository.findSessionById(sessionId);
    if (!session) {
        throw { status: 404, message: "Sesi tidak ditemukan" };
    }
    return await chatRepository.deleteSession(sessionId);
}

module.exports = {
    createNewSession,
    getAllSessions,
    getSessionMessages,
    sendMessage,
    updateSessionTitle,
    deleteSession,
};