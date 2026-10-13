// OneSignal (obrigatório)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ─── Web Share Target ───
// Pega QUALQUER arquivo que vier no FormData (o Android pode renomear o campo).
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname === '/share-target.html' && event.request.method === 'POST') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                let arquivo = null;
                let nomeArquivo = 'compartilhado';

                // Itera todos os campos e pega o primeiro que for File
                for (const [chave, valor] of formData.entries()) {
                    if (valor instanceof File && valor.size > 0) {
                        arquivo = valor;
                        nomeArquivo = valor.name || chave || 'compartilhado';
                        break;
                    }
                }

                if (arquivo) {
                    const cache = await caches.open('share-target-files');
                    // Guarda o arquivo + o nome original num Response com headers
                    await cache.put('/shared-file', new Response(arquivo, {
                        headers: {
                            'Content-Type': arquivo.type || 'application/octet-stream',
                            'X-Nome-Original': encodeURIComponent(nomeArquivo)
                        }
                    }));
                }
            } catch (e) {
                console.error('[SW share]', e);
            }
            return Response.redirect('/share-target.html', 303);
        })());
    }
});

// Hub Brain SW
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', (event) => {
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
