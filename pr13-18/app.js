// КОНФИГУРАЦИЯ 
const socket = io('http://localhost:3001');
const VAPID_PUBLIC_KEY = 'BILgc35gMSJ0yJ_SaFr7LH4gbb5gc-IG2Rfzs1ufso2_7v3mzpAqFgie9VTtchVK1kDlCiZfoa8_NZgdWKb_S9M';

// DOM элементы 
const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

let deferredPrompt;
let notes = [];

//  VAPID конвертация 
function urlBase64ToUint8Array(base64String) {
    if (!base64String) return null;
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

//  PUSH ПОДПИСКА 
async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        await fetch('http://localhost:3001/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        console.log('✅ Подписка на push выполнена');
        return true;
    } catch (err) {
        console.error('❌ Ошибка подписки:', err);
        return false;
    }
}

async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await fetch('http://localhost:3001/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });
            await subscription.unsubscribe();
            console.log('✅ Отписка выполнена');
        }
        return true;
    } catch (err) {
        console.error('❌ Ошибка отписки:', err);
        return false;
    }
}

//  НАВИГАЦИЯ APP SHELL 
function setActiveButton(activeId) {
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
    try {
        const response = await fetch(`/content/${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;
        
        if (page === 'home') {
            initHomePage();
        } else if (page === 'about') {
            initAboutPage();
        }
    } catch (err) {
        contentDiv.innerHTML = '<p class="is-center text-error">Ошибка загрузки страницы</p>';
    }
}

//  ГЛАВНАЯ СТРАНИЦА 
function initHomePage() {
    loadNotes();
    
    setTimeout(() => updateOnlineStatus(), 100);
    setTimeout(() => updateOnlineStatus(), 500);
    
    const noteForm = document.getElementById('note-form');
    const noteInput = document.getElementById('note-input');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderTime = document.getElementById('reminder-time');
    const installButton = document.getElementById('install-button');
    
    // Обычная заметка
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = noteInput.value.trim();
            if (text) {
                addNote(text);
                noteInput.value = '';
            }
        });
    }
    
    // Заметка с напоминанием
    if (reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = reminderText.value.trim();
            const time = reminderTime.value;
            
            if (text && time) {
                const reminderTimestamp = new Date(time).getTime();
                addNoteWithReminder(text, reminderTimestamp);
                reminderText.value = '';
                reminderTime.value = '';
            }
        });
    }
    
    // Установка PWA
    if (installButton) {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            installButton.style.display = 'none';
        } else {
            installButton.style.display = 'block';
        }
        
        installButton.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') installButton.style.display = 'none';
                deferredPrompt = null;
            }
        };
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installButton) installButton.style.display = 'block';
    });
}

//  СТРАНИЦА "О ПРИЛОЖЕНИИ" 
async function initAboutPage() {
    const enableBtn = document.getElementById('enable-push');
    const disableBtn = document.getElementById('disable-push');
    
    if (!enableBtn || !disableBtn) return;
    
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            enableBtn.style.display = 'none';
            disableBtn.style.display = 'inline-block';
        } else {
            enableBtn.style.display = 'inline-block';
            disableBtn.style.display = 'none';
        }
    } catch (err) {}
    
    enableBtn.addEventListener('click', async () => {
        if (Notification.permission === 'denied') {
            alert('❌ Уведомления заблокированы.');
            return;
        }
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }
        if (await subscribeToPush()) {
            enableBtn.style.display = 'none';
            disableBtn.style.display = 'inline-block';
        }
    });
    
    disableBtn.addEventListener('click', async () => {
        if (await unsubscribeFromPush()) {
            disableBtn.style.display = 'none';
            enableBtn.style.display = 'inline-block';
        }
    });
}

// ЗАМЕТКИ 
function loadNotes() {
    notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const list = document.getElementById('notes-list');
    const emptyMessage = document.getElementById('empty-message');
    if (!list) return;
    
    if (notes.length === 0) {
        list.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
    } else {
        list.innerHTML = notes.map((note, index) => {
            let reminderInfo = '';
            if (note.reminder) {
                const date = new Date(note.reminder);
                reminderInfo = `<br><small style="color: #4285f4;">⏰ Напоминание: ${date.toLocaleString()}</small>`;
            }
            return `
                <li style="background: #f5f5f5; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #4285f4; display: flex; justify-content: space-between; align-items: center;">
                    <span>${escapeHtml(note.text)}${reminderInfo}</span>
                    <button onclick="deleteNote(${index})" style="background: #ff4444; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer;">Удалить</button>
                </li>
            `;
        }).join('');
        if (emptyMessage) emptyMessage.style.display = 'none';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addNote(text) {
    const newNote = { id: Date.now(), text: text };
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
    socket.emit('newTask', newNote);
}

function addNoteWithReminder(text, reminderTime) {
    const newNote = { id: Date.now(), text: text, reminder: reminderTime };
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
    
    // Отправляем напоминание на сервер
    socket.emit('newReminder', { id: newNote.id, text: text, reminderTime: reminderTime });
}

function deleteNote(index) {
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

//  ИНДИКАТОР ОНЛАЙНА 
async function updateOnlineStatus() {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    
    try {
        const response = await fetch('/manifest.json?_=' + Date.now(), {
            method: 'HEAD',
            cache: 'no-store'
        });
        
        if (response.ok) {
            statusEl.textContent = '🟢 Онлайн';
            statusEl.className = 'status online';
        } else {
            statusEl.textContent = '🔴 Офлайн';
            statusEl.className = 'status offline';
        }
    } catch (err) {
        statusEl.textContent = '🔴 Офлайн';
        statusEl.className = 'status offline';
    }
}

//  WEBSOCKET 
socket.on('connect', () => console.log('🔌 WebSocket подключён'));

socket.on('taskAdded', (task) => {
    const exists = notes.some(n => n.id === task.id);
    if (!exists) {
        notes.push(task);
        localStorage.setItem('notes', JSON.stringify(notes));
        if (homeBtn.classList.contains('active')) loadNotes();
    }
    
    const notification = document.createElement('div');
    notification.textContent = `📝 Новая задача: ${task.text}`;
    notification.style.cssText = 'position:fixed; top:10px; right:10px; background:#4285f4; color:white; padding:1rem; border-radius:5px; z-index:1000;';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
});

//  ЗАПУСК 
homeBtn.addEventListener('click', () => { setActiveButton('home-btn'); loadContent('home'); });
aboutBtn.addEventListener('click', () => { setActiveButton('about-btn'); loadContent('about'); });

window.addEventListener('online', () => setTimeout(updateOnlineStatus, 100));
window.addEventListener('offline', () => setTimeout(updateOnlineStatus, 100));

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('✅ ServiceWorker зарегистрирован');
        } catch (err) {
            console.error('❌ ServiceWorker:', err);
        }
    });
}

loadContent('home');