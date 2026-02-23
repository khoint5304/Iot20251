const aedes = require('aedes')();
const net = require('net');
const http = require('http');
const ws = require('websocket-stream');
const chalk = require('chalk');
require('dotenv').config();

// Cấu hình
const config = {
    mqttPort: process.env.MQTT_PORT || 1883,
    wsPort: process.env.MQTT_WS_PORT || 8080,
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    enableLogging: process.env.ENABLE_LOGGING === 'true',
    logSubscriptions: process.env.LOG_SUBSCRIPTIONS === 'true',
    logMessages: process.env.LOG_MESSAGES === 'true'
};

// Lưu trữ client
const clients = new Map();

// =================== XÁC THỰC ===================
aedes.authenticate = (client, username, password, callback) => {
    const authorized = (
        !config.username ||
        (username === config.username && password?.toString() === config.password)
    );

    if (authorized) {
        console.log(chalk.green(`✓ Client [${client.id}] authenticated`));
        callback(null, authorized);
    } else {
        console.log(chalk.red(`✗ Client [${client.id}] authentication failed`));
        const error = new Error('Authentication failed');
        error.returnCode = 4; // Bad username or password
        callback(error, false);
    }
};

// =================== EVENTS ===================

// Client kết nối
aedes.on('client', (client) => {
    const timestamp = new Date().toLocaleString('vi-VN');
    clients.set(client.id, { connectedAt: timestamp });
    console.log(chalk.cyan(`\n[${timestamp}] 🔌 Client connected: ${client.id}`));
    console.log(chalk.gray(`   Total clients: ${clients.size}`));
});

// Client ngắt kết nối
aedes.on('clientDisconnect', (client) => {
    const timestamp = new Date().toLocaleString('vi-VN');
    clients.delete(client.id);
    console.log(chalk.yellow(`\n[${timestamp}] 🔌 Client disconnected: ${client.id}`));
    console.log(chalk.gray(`   Total clients: ${clients.size}`));
});

// Subscribe topic
aedes.on('subscribe', (subscriptions, client) => {
    if (config.logSubscriptions) {
        const timestamp = new Date().toLocaleString('vi-VN');
        console.log(chalk.blue(`\n[${timestamp}] 📥 Client [${client.id}] subscribed:`));
        subscriptions.forEach(sub => {
            console.log(chalk.gray(`   - ${sub.topic} (QoS: ${sub.qos})`));
        });
    }
});

// Unsubscribe topic
aedes.on('unsubscribe', (subscriptions, client) => {
    if (config.logSubscriptions) {
        const timestamp = new Date().toLocaleString('vi-VN');
        console.log(chalk.magenta(`\n[${timestamp}] 📤 Client [${client.id}] unsubscribed:`));
        subscriptions.forEach(topic => {
            console.log(chalk.gray(`   - ${topic}`));
        });
    }
});

// Publish message
aedes.on('publish', (packet, client) => {
    if (config.logMessages && client) {
        const timestamp = new Date().toLocaleString('vi-VN');
        const message = packet.payload.toString();
        console.log(chalk.green(`\n[${timestamp}] 📨 Message published:`));
        console.log(chalk.gray(`   Client: ${client.id}`));
        console.log(chalk.gray(`   Topic: ${packet.topic}`));
        console.log(chalk.gray(`   Message: ${message}`));
        console.log(chalk.gray(`   QoS: ${packet.qos}, Retain: ${packet.retain}`));
    }
});

// =================== SERVER SETUP ===================

// MQTT Server (TCP)
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(config.mqttPort, () => {
    console.log(chalk.bold.green('\n🚀 MQTT Server Started!'));
    console.log(chalk.white('━'.repeat(50)));
    console.log(chalk.cyan(`   MQTT Port: ${config.mqttPort}`));
    console.log(chalk.cyan(`   WebSocket Port: ${config.wsPort}`));
    console.log(chalk.cyan(`   Authentication: ${config.username ? 'Enabled' : 'Disabled'}`));
    if (config.username) {
        console.log(chalk.gray(`   Username: ${config.username}`));
        console.log(chalk.gray(`   Password: ${'*'.repeat(config.password.length)}`));
    }
    console.log(chalk.white('━'.repeat(50)));
    console.log(chalk.yellow('\n📡 Waiting for clients...\n'));

    // Hiển thị IP để kết nối
    const os = require('os');
    const interfaces = os.networkInterfaces();
    console.log(chalk.gray('Local IP addresses:'));
    Object.keys(interfaces).forEach(name => {
        interfaces[name].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(chalk.gray(`   - ${iface.address}`));
            }
        });
    });
    console.log(chalk.gray(`   - localhost (127.0.0.1)\n`));
});

// WebSocket Server (cho web clients)
const httpServer = http.createServer();
ws.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(config.wsPort, () => {
    console.log(chalk.green(`✓ WebSocket server ready on port ${config.wsPort}\n`));
});

// =================== ERROR HANDLING ===================

aedes.on('clientError', (client, err) => {
    console.log(chalk.red(`\n❌ Client error [${client.id}]: ${err.message}`));
});

aedes.on('connectionError', (client, err) => {
    console.log(chalk.red(`\n❌ Connection error: ${err.message}`));
});

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n🛑 Shutting down server...'));
    aedes.close(() => {
        console.log(chalk.green('✓ Server closed'));
        process.exit(0);
    });
});

// =================== MONITORING ===================

// Hiển thị thống kê mỗi 30 giây
setInterval(() => {
    if (clients.size > 0) {
        console.log(chalk.blue(`\n📊 Active clients: ${clients.size}`));
        clients.forEach((info, clientId) => {
            console.log(chalk.gray(`   - ${clientId} (connected: ${info.connectedAt})`));
        });
    }
}, 30000);
