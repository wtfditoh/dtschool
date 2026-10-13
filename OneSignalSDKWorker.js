// OneSignal (obrigatório)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ─── Web Share Target ───
// Intercepta o POST que o Android manda quando você compartilha uma foto
// do WhatsApp pro Hub Brain. Guarda o arquivo num cache e redireciona
// pra página /share-target.html.
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname === '/share-target.html' && event.request.method === 'POST') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const arquivo = formData.get('image');
                if (arquivo && arquivo.size > 0) {
                    const cache = await caches.open('share-target-files');
                    await cache.put('/shared-file', new Response(arquivo));
                }
            } catch (e) { console.error('[SW share]', e); }
            return Response.redirect('/share-target.html', 303);
        })());
    }
});

// Hub Brain SW
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

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
