const CACHE_NAME = 'app-shell-v4';
const DYNAMIC_CACHE = 'dynamic-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.json',
    '/content/home.html',
    '/content/about.html'
];

// Установка
self.addEventListener('install', event => {
    console.log('Service Worker: Установка');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Активация
self.addEventListener('activate', event => {
    console.log('Service Worker: Активация');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch 
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Пропускаем запросы к другим источникам
    if (url.origin !== location.origin) return;
    
    // Динамический контент - Network First
    if (url.pathname.startsWith('/content/')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Кэшируем ответ (без clone, просто сохраняем)
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, networkResponse);
                    });
                    // Возвращаем оригинал
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request)
                        .then(cached => cached || caches.match('/content/home.html'));
                })
        );
        return;
    }
    
    // Статика - Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});

// Push-уведомления
self.addEventListener('push', event => {
    console.log('📱 Push получен');
    let data = { title: 'Новое уведомление', body: '', reminderId: null };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: '/icons/launchericon-192x192.png',
        badge: '/icons/launchericon-48x48.png',
        data: { reminderId: data.reminderId },
        vibrate: [200, 100, 200],
        tag: 'reminder-' + data.reminderId
    };
    
    if (data.reminderId) {
        options.actions = [
            { action: 'snooze', title: '⏰ Отложить на 5 минут' }
        ];
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
    const notification = event.notification;
    const action = event.action;
    
    if (action === 'snooze') {
        const reminderId = notification.data.reminderId;
        event.waitUntil(
            fetch(`/snooze?reminderId=${reminderId}`, { method: 'POST' })
                .then(() => notification.close())
                .catch(err => console.error('Snooze failed:', err))
        );
    } else {
        notification.close();
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});