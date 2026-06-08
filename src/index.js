const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const sensorRoutes = require("./routes/sensorRoutes");
const chatRoutes = require("./routes/chatRoutes");
const thresholdRoutes = require("./routes/thresholdRoutes");
const alertRoutes = require("./routes/alertRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const deviceRepository = require("./repositories/deviceRepository");

// Import MQTT
const connectMQTT = require("./config/mqtt");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Trust proxy (Railway pakai reverse proxy)
// Trust 1 hop saja agar express-rate-limit bisa baca IP asli
// JANGAN pakai `true` tanpa angka — bisa di-spoof attacker via X-Forwarded-For
// ============================================
app.set("trust proxy", 1);

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// Routes
// ============================================
app.use("/api/sensors", sensorRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/threshold", thresholdRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/devices", deviceRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "running",
    name: "Water Quality Monitoring API - UniFlow",
    version: "2.0.0",
    endpoints: {
      // ... (sama persis seperti punya Anda, tidak perlu diubah)
      sensors: {
        "POST /api/sensors": "Simpan data sensor (+ WQI + auto alert)",
        "GET /api/sensors": "Ambil data sensor (query: limit)",
        "GET /api/sensors/latest": "Data sensor terbaru",
        "GET /api/sensors/stats": "Statistik sensor hari ini",
        "GET /api/sensors/export/csv": "Download data CSV (query: days)",
      },
      devices: {
        "POST /api/devices": "Register device baru",
        "GET /api/devices": "Ambil semua device",
        "GET /api/devices/:id": "Detail device",
        "PUT /api/devices/:id": "Update device",
        "DELETE /api/devices/:id": "Hapus device",
      },
      threshold: {
        "GET /api/threshold": "Ambil threshold aktif",
        "PUT /api/threshold": "Update threshold",
        "POST /api/threshold/reset": "Reset ke standar Permenkes",
      },
      alerts: {
        "GET /api/alerts": "Ambil alerts (query: unread=true, limit)",
        "PATCH /api/alerts/:id/read": "Tandai alert sudah dibaca",
        "PATCH /api/alerts/read-all": "Tandai semua alert sudah dibaca",
      },
      chat: {
        "POST /api/chat/sessions": "Buat sesi chat baru",
        "GET /api/chat/sessions": "Ambil semua sesi",
        "GET /api/chat/sessions/:id/messages": "Ambil history pesan",
        "POST /api/chat/sessions/:id/messages": "Kirim pesan ke AI",
      },
    },
  });
});

// ============================================
// Start server + MQTT
// ============================================
app.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log(`API docs at http://localhost:${PORT}\n`);

  // Connect MQTT (untuk terima data dari ESP32)
  connectMQTT();

  setInterval(async () => {
    try {
      const staleDevices = await deviceRepository.deactivateStaleDevices(5);
      if (staleDevices.length > 0) {
        console.log(`${staleDevices.length} device(s) set to inactive (no data > 5 min)`);
      }
    } catch (err) {
      console.error("Error checking stale devices:", err.message);
    }
  }, 60000); // Cek setiap 60 detik
});