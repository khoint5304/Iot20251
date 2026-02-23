# 🧪 Hướng dẫn Test MQTT Server Local với ESP32

## 📋 Chuẩn bị

### 1. Cài đặt và chạy server

```bash
cd "mqtt-server"
npm install
npm start
```

Server sẽ hiển thị:
```
🚀 MQTT Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MQTT Port: 1883
   WebSocket Port: 8080
   Authentication: Enabled
   Username: admin
   Password: ********
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Waiting for clients...

Local IP addresses:
   - 192.168.1.100  <-- Dùng IP này cho ESP32
   - localhost (127.0.0.1)
```

### 2. Cập nhật ESP32 code

Mở file `src/sketch.ino` và chỉnh:

```cpp
// Dòng 11: Đổi thành true
const bool USE_LOCAL_SERVER = true;

// Dòng 14: Thay IP máy của bạn
const char *local_mqtt_server = "192.168.1.100";  // IP từ console server
```

### 3. Upload code lên ESP32

```bash
# Với PlatformIO
pio run --target upload

# Hoặc dùng Arduino IDE
```

## 🧪 Test Cases

### Test 1: Kiểm tra kết nối

**Mong đợi:**
- Console server hiển thị: `🔌 Client connected: ESP32Client-XXXX`
- Serial ESP32: `Ket noi toi MQTT Server: 192.168.1.100`

### Test 2: Bật/Tắt thiết bị từ MQTT Client

Mở terminal khác và test:

```bash
# Test BẬT
mosquitto_pub -h localhost -t "nha_toi/binh_nong_lanh/lenh" -m "ON" -u admin -P Admin123

# Test TẮT
mosquitto_pub -h localhost -t "nha_toi/binh_nong_lanh/lenh" -m "OFF" -u admin -P Admin123
```

**Mong đợi:**
- Server log: `📨 Message published: Topic: nha_toi/binh_nong_lanh/lenh, Message: ON`
- ESP32 relay bật/tắt
- Server nhận message từ ESP32: `nha_toi/binh_nong_lanh/trang_thai: DA BAT`

### Test 3: Đặt lịch

```bash
# Đặt lịch bật lúc 14:30
mosquitto_pub -h localhost -t "nha_toi/binh_nong_lanh/dat_lich_bat" -m "14:30" -u admin -P Admin123

# Đặt lịch tắt lúc 15:00
mosquitto_pub -h localhost -t "nha_toi/binh_nong_lanh/dat_lich_tat" -m "15:00" -u admin -P Admin123
```

**Mong đợi:**
- Server nhận message và forward đến ESP32
- ESP32 phản hồi: `DA DAT LICH BAT: 14:30`

### Test 4: Subscribe tất cả messages

```bash
mosquitto_sub -h localhost -t "nha_toi/binh_nong_lanh/#" -u admin -P Admin123
```

Bạn sẽ thấy realtime tất cả messages từ ESP32.

## 📊 Monitoring

### Xem logs server
Server tự động hiển thị:
- ✅ Clients kết nối/ngắt kết nối
- ✅ Topics được subscribe
- ✅ Messages được publish
- ✅ Thống kê mỗi 30 giây

### Debug với MQTT Explorer

1. Tải: https://mqtt-explorer.com/
2. Kết nối:
   - Host: `localhost` (hoặc IP máy)
   - Port: `1883`
   - Username: `admin`
   - Password: `Admin123`
3. Xem cây topics và test publish/subscribe

## 🐛 Troubleshooting

### ESP32 không kết nối được

**Nguyên nhân 1:** Firewall chặn port 1883
```bash
# Windows: Tắt firewall tạm hoặc thêm rule
netsh advfirewall firewall add rule name="MQTT" dir=in action=allow protocol=TCP localport=1883
```

**Nguyên nhân 2:** Sai IP
- Kiểm tra IP bằng `ipconfig` (Windows) hoặc `ip addr` (Linux)
- ESP32 và máy chạy server phải cùng mạng WiFi

**Nguyên nhân 3:** WiFi credentials sai
```cpp
// Đổi thành WiFi của bạn
const char *ssid = "Ten_WiFi_Cua_Ban";
const char *password = "Mat_Khau_WiFi";
```

### Server báo "Authentication failed"

Kiểm tra username/password trong:
- File `mqtt-server/.env`
- Code ESP32 (dòng 23-24)

### Test không có mosquitto_pub/sub

Dùng **MQTT.js** (Node.js):

```javascript
// test-publish.js
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'admin',
  password: 'Admin123'
});

client.on('connect', () => {
  console.log('Connected!');
  client.publish('nha_toi/binh_nong_lanh/lenh', 'ON');
  setTimeout(() => client.end(), 1000);
});
```

Chạy: `node test-publish.js`

## 🎯 So sánh Local vs Cloud

| Tính năng | Local Server | HiveMQ Cloud |
|-----------|--------------|--------------|
| Tốc độ | ⚡ Nhanh (< 10ms) | 🐢 Phụ thuộc Internet |
| Bảo mật | 🔓 Không TLS (chưa config) | 🔐 TLS mặc định |
| Ổn định | 💻 Phụ thuộc máy của bạn | ☁️ Uptime 99.9% |
| Chi phí | ✅ Miễn phí | ⚠️ Giới hạn free tier |
| Truy cập từ xa | ❌ Cần VPN/Port forwarding | ✅ Sẵn sàng |

## 🔐 Nâng cấp bảo mật

Để thêm TLS cho local server, xem: `mqtt-server/README.md`

## ✅ Checklist Test

- [ ] Server chạy thành công
- [ ] ESP32 kết nối được với server
- [ ] Test ON/OFF hoạt động
- [ ] Test đặt lịch hoạt động
- [ ] Server log hiển thị đầy đủ
- [ ] Không có lỗi trong Serial Monitor

## 📝 Notes

**Lưu ý quan trọng:**
- Wokwi Simulator **KHÔNG** connect được local server (chỉ test với ESP32 thật)
- Để test trên Wokwi, giữ `USE_LOCAL_SERVER = false`
- Để test với ESP32 thật, đổi `USE_LOCAL_SERVER = true`
