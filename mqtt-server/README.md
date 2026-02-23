# 🐝 MQTT Server Tự Build cho ESP32

Server MQTT đơn giản được xây dựng bằng Node.js và Aedes, hoàn toàn chạy local.

## 🚀 Cài đặt

### Yêu cầu
- Node.js (v14 trở lên)
- npm hoặc yarn

### Các bước

1. **Cài đặt dependencies:**
```bash
cd mqtt-server
npm install
```

2. **Cấu hình (tùy chọn):**
Chỉnh file `.env` nếu cần thay đổi cổng hoặc bật/tắt xác thực

3. **Chạy server:**
```bash
npm start

# Hoặc chạy với auto-reload (development)
npm run dev
```

## 📡 Kết nối

### Từ ESP32
```
Server: [IP máy của bạn]
Port: 1883
Username: admin (nếu bật authentication)
Password: Admin123
```

### Test với MQTT Client
```bash
# Publish
mosquitto_pub -h localhost -t "nha_toi/binh_nong_lanh/lenh" -m "ON" -u admin -P Admin123

# Subscribe
mosquitto_sub -h localhost -t "nha_toi/binh_nong_lanh/#" -u admin -P Admin123
```

## 🔐 Bảo mật

- **Username/Password**: Đặt trong file `.env`
- **TLS/SSL**: Chưa cấu hình (có thể thêm sau)
- **ACL**: Chưa có phân quyền topic (có thể mở rộng)

## 📊 Tính năng

✅ MQTT Protocol (TCP) - Port 1883
✅ WebSocket - Port 8080
✅ Authentication (Username/Password)
✅ Logging chi tiết
✅ Monitoring clients
✅ QoS 0, 1, 2
✅ Retained messages
✅ Will messages

## 🛠️ Mở rộng

Server này có thể mở rộng thêm:
- TLS/SSL encryption
- Database persistence (MongoDB, Redis)
- Access Control Lists (ACL)
- Rate limiting
- Web dashboard
- Webhooks

## 📝 Log Files

Server hiển thị log realtime trong console:
- 🔌 Client connections/disconnections
- 📥 Topic subscriptions
- 📨 Published messages
- ❌ Errors
- 📊 Statistics

## 🐛 Debug

Nếu không kết nối được:
1. Kiểm tra firewall cho port 1883
2. Dùng `ipconfig` (Windows) hoặc `ifconfig` (Linux/Mac) để xem IP
3. Test với MQTT Explorer hoặc mosquitto_pub/sub
4. Kiểm tra username/password trong `.env`

## 📚 Dependencies

- **aedes**: MQTT broker engine
- **aedes-persistence-memory**: In-memory storage
- **chalk**: Terminal colors
- **dotenv**: Environment variables
- **websocket-stream**: WebSocket support
