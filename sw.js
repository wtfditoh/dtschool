/* Hub Brain - Service Worker 
   Responsável por notificações e funcionamento PWA
*/

const CACHE_NAME = 'hub-brain-v12';

// 1. Instalação: Força o novo SW a ativar imediatamente
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Hub Brain SW: Instalado');
});

// 2. Ativação: Assume o controle de todas as abas abertas
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('Hub Brain SW: Ativado e pronto');
});

// 3. ESCUTADOR DE MENSAGENS: Recebe o alerta do 'grade-logica.js'
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICAR_AULA') {
        const { materia, hora } = event.data;
        
        const title = "🔔 Hora da Aula!";
        const options = {
            body: `Sua aula de ${materia} começa às ${hora}. Foco total! 🧠`,
            icon: 'icon.png', // Substitua pelo seu ícone se tiver, ou remova
            badge: 'icon.png',
            vibrate: [200, 100, 200, 100, 200],
            tag: 'aula-notificacao', // Evita empilhar notificações da mesma aula
            renotify: true,
            requireInteraction: true, // A notificação fica na tela até o usuário clicar
            data: {
                url: '/horario.html' // Abre direto na grade ao clicar
            }
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});

// 4. CLIQUE NA NOTIFICAÇÃO: Abre o app ou foca na aba aberta
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se o site já estiver aberto, foca nele
            for (const client of clientList) {
                if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Se não estiver aberto, abre uma nova aba
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
