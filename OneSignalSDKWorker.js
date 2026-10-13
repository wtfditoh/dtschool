// OneSignal (obrigatório)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Hub Brain SW
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('notificationclick', (event) => {
    // Notificações da Agenda (ex.: lembrete das 21h, título "Agenda 🌙") abrem pelo `url` do próprio OneSignal.
    // Sem isto, qualquer clique acabava em horario.html.
    if (/^agenda/i.test((event.notification && event.notification.title) || '')) return;
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('horario.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow('./horario.html');
        })
    );
});
