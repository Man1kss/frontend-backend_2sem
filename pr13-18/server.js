const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const vapidKeys = {
    publicKey: 'BILgc35gMSJ0yJ_SaFr7LH4gbb5gc-IG2Rfzs1ufso2_7v3mzpAqFgie9VTtchVK1kDlCiZfoa8_NZgdWKb_S9M',
    privateKey: '2tU-KvFZuOr2ChsulbMy07oDfAcT0_TagLbEKoaGN40'
};

webpush.setVapidDetails('mailto:student@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

let subscriptions = [];
const reminders = new Map(); // Хранилище активных напоминаний

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    console.log('🔌 Клиент подключён:', socket.id);
    
    socket.on('newTask', (task) => {
        io.emit('taskAdded', task);
    });
    
    socket.on('newReminder', (reminder) => {
        const { id, text, reminderTime } = reminder;
        const delay = reminderTime - Date.now();
        
        if (delay <= 0) return;
        
        console.log(`⏰ Напоминание запланировано через ${Math.round(delay / 1000)} сек: ${text}`);
        
        const timeoutId = setTimeout(() => {
            const payload = JSON.stringify({
                title: '⏰ Напоминание',
                body: text,
                reminderId: id
            });
            
            subscriptions.forEach(sub => {
                webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
            });
            
            reminders.delete(id);
            console.log('📱 Push-уведомление отправлено для:', text);
        }, delay);
        
        reminders.set(id, { timeoutId, text, reminderTime });
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключён:', socket.id);
    });
});

// Эндпоинты push
app.post('/subscribe', (req, res) => {
    if (!subscriptions.find(s => s.endpoint === req.body.endpoint)) {
        subscriptions.push(req.body);
    }
    res.status(201).json({ message: 'OK' });
});

app.post('/unsubscribe', (req, res) => {
    subscriptions = subscriptions.filter(s => s.endpoint !== req.body.endpoint);
    res.status(200).json({ message: 'OK' });
});

// Эндпоинт для откладывания напоминания
app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    
    if (!reminderId || !reminders.has(reminderId)) {
        return res.status(400).json({ error: 'Reminder not found' });
    }
    
    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);
    
    const newDelay = 5 * 60 * 1000; // 5 минут
    
    const newTimeoutId = setTimeout(() => {
        const payload = JSON.stringify({
            title: '⏰ Напоминание (отложено)',
            body: reminder.text,
            reminderId: reminderId
        });
        
        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
        });
        
        reminders.delete(reminderId);
    }, newDelay);
    
    reminders.set(reminderId, {
        timeoutId: newTimeoutId,
        text: reminder.text,
        reminderTime: Date.now() + newDelay
    });
    
    console.log(`⏰ Напоминание отложено на 5 минут: ${reminder.text}`);
    res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

const PORT = 3001;
try {
    const options = { key: fs.readFileSync('localhost-key.pem'), cert: fs.readFileSync('localhost.pem') };
    require('https').createServer(options, app).listen(PORT, () => console.log(`🔒 https://localhost:${PORT}`));
} catch (e) {
    server.listen(PORT, () => console.log(`🌐 http://localhost:${PORT}`));
}