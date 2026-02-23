const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("ESP32 giả lập đã kết nối MQTT");

  client.subscribe("nha_toi/binh_nong_lanh/#");
});

client.on("message", (topic, message) => {
  console.log(topic, message.toString());

  if (topic === "nha_toi/binh_nong_lanh/lenh") {
    if (message.toString() === "ON") {
      client.publish(
        "nha_toi/binh_nong_lanh/trang_thai",
        "DA BAT (GIẢ LAP)"
      );
    } else {
      client.publish(
        "nha_toi/binh_nong_lanh/trang_thai",
        "DA TAT (GIẢ LAP)"
      );
    }
  }
});
