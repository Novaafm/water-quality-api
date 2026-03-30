const mqtt = require("mqtt");
const sensorService = require("../services/sensorService");
require("dotenv").config();

const connectMQTT = () => {
  const client = mqtt.connect(process.env.MQTT_BROKER);

  client.on("connect", () => {
    console.log("✅ MQTT connected to", process.env.MQTT_BROKER);

    client.subscribe(process.env.MQTT_TOPIC, (err) => {
      if (err) {
        console.error("❌ MQTT subscribe error:", err.message);
      } else {
        console.log("✅ MQTT subscribed to:", process.env.MQTT_TOPIC);
      }
    });
  });

  client.on("message", async (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      console.log("📡 Data sensor diterima:", data);

      const deviceCode = data.device_code || "esp32-01";

      // Pakai service yang sama dengan POST endpoint
      const result = await sensorService.saveSensorData(
        deviceCode, data.ph, data.turbidity, data.tds, data.temperature
      );

      console.log("💾 Data tersimpan | WQI:", result.wqi.score, "| Status:", result.wqi.status);

      if (result.alerts) {
        console.log("🚨 " + result.alerts.length + " alert(s) generated");
      }
    } catch (err) {
      console.error("❌ Error proses MQTT:", err.message || err);
    }
  });

  client.on("error", (err) => {
    console.error("❌ MQTT error:", err.message);
  });

  return client;
};

module.exports = connectMQTT;