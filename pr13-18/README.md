# Мои заметки PWA

Приложение для управления заметками с поддержкой офлайн-режима, установки как PWA, синхронизации через WebSocket и Push-уведомлений с напоминаниями.

## Выполненные практические работы

### №13. Service Worker
- Регистрация Service Worker
- Кэширование статических ресурсов
- Офлайн-режим

### №14. Web App Manifest
- Файл manifest.json
- Иконки разных размеров
- Установка приложения на устройство

### №15. HTTPS + App Shell
- Запуск по HTTPS (mkcert)
- Архитектура App Shell
- Динамическая загрузка контента

### №16. WebSocket + Push
- Сервер на Node.js + Socket.IO
- Синхронизация заметок в реальном времени
- Push-уведомления через Web Push API

### №17. Детализация Push
- Заметки с датой/временем напоминания
- Планирование уведомлений на сервере
- Кнопка "Отложить на 5 минут" в уведомлении
- Обработка snooze через Service Worker

## Установка и запуск

```bash
# Установка зависимостей
npm install express socket.io web-push body-parser cors

# Генерация VAPID ключей
npx web-push generate-vapid-keys

# Генерация HTTPS сертификатов
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Запуск сервера
node server.js