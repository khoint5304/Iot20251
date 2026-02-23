#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <RTClib.h>
#include <PubSubClient.h>
#include <time.h>

// Cấu hình NTP để lấy thời gian thực
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600; // GMT+7 (Việt Nam)
const int daylightOffset_sec = 0;    // Không có DST

// =================== CẤU HÌNH ===================
// Để kết nối với LOCAL SERVER:
// 1. Thay đổi mqtt_server thành IP máy chạy server (VD: "192.168.1.100")
// 2. Đổi USE_LOCAL_SERVER = true
// 3. Chạy server: cd mqtt-server && npm start

const char *ssid = "KNT"; // Đổi tên hotspot không có khoảng trắng
const char *password = "123456789";

// Chọn server (local hoặc cloud)
const bool USE_LOCAL_SERVER = true;

// Local Server (không TLS) - IP của Mobile Hotspot
const char *local_mqtt_server = "192.168.137.1"; // IP Mobile Hotspot
const int local_mqtt_port = 1883;

// Cloud Server (HiveMQ - có TLS)
const char *cloud_mqtt_server = "beef441362934e51ba18727f8ae7f97b.s1.eu.hivemq.cloud";
const int cloud_mqtt_port = 8883;

// Credentials
const char *mqtt_user = "admin";
const char *mqtt_pass = "Admin123";

// Tự động chọn config
const char *mqtt_server = USE_LOCAL_SERVER ? local_mqtt_server : cloud_mqtt_server;
const int mqtt_port = USE_LOCAL_SERVER ? local_mqtt_port : cloud_mqtt_port;

WiFiClient espClient;
PubSubClient client(espClient);
RTC_DS1307 rtc;
bool rtcAvailable = false;

const int relayPin = 23;

int onHour = -1;
int onMinute = -1;
bool onTriggered = false;

int offHour = -1;
int offMinute = -1;
bool offTriggered = false;

void callback(char *topic, byte *payload, unsigned int length)
{
  String message;
  for (int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }

  if (String(topic) == "nha_toi/binh_nong_lanh/lenh")
  {
    if (message == "ON")
    {
      digitalWrite(relayPin, HIGH);
      client.publish("nha_toi/binh_nong_lanh/trang_thai", "DA BAT");
    }
    else if (message == "OFF")
    {
      digitalWrite(relayPin, LOW);
      client.publish("nha_toi/binh_nong_lanh/trang_thai", "DA TAT");
    }
  }

  if (String(topic) == "nha_toi/binh_nong_lanh/dat_lich_bat")
  {
    int separatorIndex = message.indexOf(':');
    if (separatorIndex != -1)
    {
      onHour = message.substring(0, separatorIndex).toInt();
      onMinute = message.substring(separatorIndex + 1).toInt();
      onTriggered = false;
      String msg = "DA DAT LICH BAT: " + String(onHour) + ":" + String(onMinute);
      client.publish("nha_toi/binh_nong_lanh/trang_thai", msg.c_str());
    }
  }

  if (String(topic) == "nha_toi/binh_nong_lanh/dat_lich_tat")
  {
    int separatorIndex = message.indexOf(':');
    if (separatorIndex != -1)
    {
      offHour = message.substring(0, separatorIndex).toInt();
      offMinute = message.substring(separatorIndex + 1).toInt();
      offTriggered = false;
      String msg = "DA DAT LICH TAT: " + String(offHour) + ":" + String(offMinute);
      client.publish("nha_toi/binh_nong_lanh/trang_thai", msg.c_str());
    }
  }
}

void reconnect()
{
  while (!client.connected())
  {
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass))
    {
      client.subscribe("nha_toi/binh_nong_lanh/lenh");
      client.subscribe("nha_toi/binh_nong_lanh/dat_lich_bat");
      client.subscribe("nha_toi/binh_nong_lanh/dat_lich_tat");
    }
    else
    {
      delay(5000);
    }
  }
}

void checkSchedule()
{
  int currentHour, currentMinute;

  if (rtcAvailable)
  {
    DateTime now = rtc.now();
    currentHour = now.hour();
    currentMinute = now.minute();
  }
  else
  {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo))
    {
      return; // Không có thời gian, bỏ qua check
    }
    currentHour = timeinfo.tm_hour;
    currentMinute = timeinfo.tm_min;
  }

  if (onHour != -1)
  {
    if (currentHour == onHour && currentMinute == onMinute)
    {
      if (!onTriggered)
      {
        digitalWrite(relayPin, HIGH);
        client.publish("nha_toi/binh_nong_lanh/trang_thai", "DA BAT THEO LICH");
        onTriggered = true;
      }
    }
    else
    {
      onTriggered = false;
    }
  }

  if (offHour != -1)
  {
    if (currentHour == offHour && currentMinute == offMinute)
    {
      if (!offTriggered)
      {
        digitalWrite(relayPin, LOW);
        client.publish("nha_toi/binh_nong_lanh/trang_thai", "DA TAT THEO LICH");
        offTriggered = true;
      }
    }
    else
    {
      offTriggered = false;
    }
  }
}

void setup()
{
  Serial.begin(115200);
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);

  Serial.println("Dang khoi dong...");

  // Bỏ qua RTC check nếu không có module RTC
  if (!rtc.begin())
  {
    Serial.println("CANH BAO: Khong tim thay RTC! Se dung thoi gian tu NTP...");
    rtcAvailable = false;
  }
  else
  {
    Serial.println("RTC da san sang!");
    rtcAvailable = true;
  }

  Serial.print("Dang ket noi WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi da ket noi!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Đồng bộ thời gian từ NTP server
  Serial.println("Dang dong bo thoi gian tu NTP server...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // Chờ lấy thời gian từ NTP
  struct tm timeinfo;
  int retry = 0;
  while (!getLocalTime(&timeinfo) && retry < 10)
  {
    Serial.println("Dang cho thoi gian tu NTP...");
    delay(1000);
    retry++;
  }

  if (getLocalTime(&timeinfo))
  {
    Serial.println("Da dong bo thoi gian thanh cong!");
    Serial.print("Thoi gian hien tai: ");
    Serial.printf("%02d/%02d/%04d %02d:%02d:%02d\n",
                  timeinfo.tm_mday, timeinfo.tm_mon + 1, timeinfo.tm_year + 1900,
                  timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);

    // Cập nhật thời gian cho RTC nếu có
    if (rtcAvailable)
    {
      rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1,
                          timeinfo.tm_mday, timeinfo.tm_hour,
                          timeinfo.tm_min, timeinfo.tm_sec));
      Serial.println("Da cap nhat thoi gian cho RTC!");
    }
  }
  else
  {
    Serial.println("CANH BAO: Khong the lay thoi gian tu NTP!");
  }

  // Chỉ set insecure nếu dùng cloud server với TLS
  if (!USE_LOCAL_SERVER)
  {
    // Cloud server cần TLS - tạm bỏ qua verify cert
    WiFiClientSecure *secureClient = new WiFiClientSecure();
    secureClient->setInsecure();
    client.setClient(*secureClient);
  }

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.println("HE THONG DA SAN SANG!");
  Serial.print("Ket noi toi MQTT Server: ");
  Serial.println(mqtt_server);
  Serial.print("Port: ");
  Serial.println(mqtt_port);
}

void loop()
{
  if (!client.connected())
  {
    reconnect();
  }
  client.loop();
  checkSchedule();

  // In thời gian hiện tại mỗi 5 giây
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 5000)
  {
    if (rtcAvailable)
    {
      DateTime now = rtc.now();
      Serial.print("Thoi gian hien tai (RTC): ");
      Serial.printf("%02d:%02d:%02d\n", now.hour(), now.minute(), now.second());
    }
    else
    {
      struct tm timeinfo;
      if (getLocalTime(&timeinfo))
      {
        Serial.print("Thoi gian hien tai (NTP): ");
        Serial.printf("%02d:%02d:%02d\n", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
      }
    }
    lastPrint = millis();
  }

  delay(100);
}