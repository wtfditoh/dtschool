const CACHE_NAME = 'hubbrain-v1';

// Instalação e Cache básico
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./', './index.html']);
    })
  );
});

// Escuta notificações push vindas do sistema
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Hub Brain', body: 'Foco nos estudos! 🧠' };
  const options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100]
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
