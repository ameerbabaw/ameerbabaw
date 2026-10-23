// <!-- USED WITH [WOLF] JB -->
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const activeBots = new Map();

io.on('connection', (socket) => {
    console.log('[+] متصل جديد ببرنامج التحكم');

    // بدء تشغيل مجموعة بوتات
    socket.on('start-bots', (config) => {
        const count = parseInt(config.count) || 1;
        const delay = parseInt(config.delay) || 4000;

        for (let i = 1; i <= count; i++) {
            setTimeout(() => {
                const botName = `${config.prefix}_${i}`;
                if (activeBots.has(botName)) return;

                io.emit('log', { bot: 'SYSTEM', text: `[+] جاري تشغيل البوت ${botName}...` });

                const bot = mineflayer.createBot({
                    host: config.host,
                    port: parseInt(config.port) || 25565,
                    username: botName,
                    version: config.version || false,
                    auth: 'offline'
                });

                activeBots.set(botName, bot);

                bot.once('spawn', () => {
                    io.emit('bot-status', { bot: botName, status: 'online' });
                    io.emit('log', { bot: botName, text: `[+] البوت ${botName} دخل السيرفر بنجاح.` });

                    // تسجيل الدخول التلقائي
                    setTimeout(() => {
                        bot.chat('/register Pass123456 Pass123456');
                        bot.chat('/login Pass123456');
                    }, 1500);
                });

                bot.on('chat', (username, message) => {
                    if (username === bot.username) return;
                    io.emit('log', { bot: botName, text: `<${username}> ${message}` });
                });

                bot.on('end', (reason) => {
                    io.emit('log', { bot: botName, text: `[-] انفصل البوت: ${reason}` });
                    io.emit('bot-status', { bot: botName, status: 'offline' });
                    activeBots.delete(botName);
                });

                bot.on('error', (err) => {
                    io.emit('log', { bot: botName, text: `[!] خطأ: ${err.message}` });
                });

            }, (i - 1) * delay);
        }
    });

    // إرسال شات لبوت محدد أو للجميع
    socket.on('send-chat', (data) => {
        if (data.target === 'ALL') {
            activeBots.forEach((bot) => bot.chat(data.message));
        } else if (activeBots.has(data.target)) {
            activeBots.get(data.target).chat(data.message);
        }
    });

    // إيقاف جميع البوتات
    socket.on('stop-all', () => {
        activeBots.forEach((bot, name) => {
            bot.quit();
            io.emit('bot-status', { bot: name, status: 'offline' });
        });
        activeBots.clear();
        io.emit('log', { bot: 'SYSTEM', text: '[-] تم إيقاف جميع البوتات.' });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// <!-- USED WITH [WOLF] JB -->