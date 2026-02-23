const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

let schedule = {
  on: null,
  off: null
};

// ===== MQTT CONFIG =====
const MQTT_BROKER = "mqtt://localhost:1883"; // hoặc IP broker
const mqttClient = mqtt.connect(MQTT_BROKER, {
  username: 'admin',
  password: 'Admin123'
});

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT broker");

  mqttClient.subscribe("nha_toi/binh_nong_lanh/trang_thai");
});

// Nhận trạng thái từ ESP32
let lastStatus = "CHUA CO DU LIEU";

mqttClient.on("message", (topic, message) => {
  if (topic === "nha_toi/binh_nong_lanh/trang_thai") {
    lastStatus = message.toString();
    console.log("Trang thai:", lastStatus);
  }
});

// ===== HTTP API =====

// Bật bình
app.post("/api/on", (req, res) => {
  mqttClient.publish("nha_toi/binh_nong_lanh/lenh", "ON");
  res.json({ success: true });
});

// Tắt bình
app.post("/api/off", (req, res) => {
  mqttClient.publish("nha_toi/binh_nong_lanh/lenh", "OFF");
  res.json({ success: true });
});

// Đặt lịch bật
app.post("/api/schedule/on", (req, res) => {
  const { hour, minute } = req.body;
  schedule.on = `${hour}:${minute}`;
  mqttClient.publish(
    "nha_toi/binh_nong_lanh/dat_lich_bat",
    `${hour}:${minute}`
  );
  res.json({ success: true });
});

// Đặt lịch tắt
app.post("/api/schedule/off", (req, res) => {
  const { hour, minute } = req.body;
  schedule.off = `${hour}:${minute}`;
  mqttClient.publish(
    "nha_toi/binh_nong_lanh/dat_lich_tat",
    `${hour}:${minute}`
  );
  res.json({ success: true });
});

// Lấy trạng thái mới nhất
app.get("/api/status", (req, res) => {
  res.json({
    status: lastStatus,
    onTime: schedule.on,
    offTime: schedule.off
  });
});

// ===== START SERVER =====
const PORT = 3000;
const HOST = '0.0.0.0'; // Cho phép truy cập từ mọi thiết bị trong mạng

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://localhost:${PORT}`);

  // Hiển thị IP để truy cập từ máy khác
  const os = require('os');
  const interfaces = os.networkInterfaces();
  console.log('\n📱 Truy cập từ thiết bị khác trong mạng:');
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   http://${iface.address}:${PORT}`);
      }
    });
  });
  console.log('');
});