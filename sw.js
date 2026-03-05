/* Hub Brain - Service Worker Oficial */

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Hub Brain SW: Instalado');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('Hub Brain SW: Ativado');
});

// ESCUTADOR DE MENSAGENS (Aqui acontece a mágica dos 30 e 5 min)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICAR_AULA') {
        const { materia, hora, tempoRestante } = event.data;
        let frases = [];
        let titulo = "🔔 Hub Brain";

        // Variações para 30 minutos
        if (tempoRestante === "30_MIN") {
            titulo = "⏳ Aula em 30 min!";
            frases = [
                `Sua aula de ${materia} começa às ${hora}. Dá tempo de um café! ☕`,
                `Faltam 30 min para ${materia}. Já separou o material? 📓`,
                `Em 30 minutos começa ${materia} (${hora}). Fica esperto! ⏰`,
                `Prepare-se! ${materia} está chegando em 30 min. 🧠`
            ];
        } 
        // Variações para 5 minutos
        else {
            titulo = "🚀 Falta pouco!";
            frases = [
                `Bora! ${materia} começa em 5 min (${hora}). Já pro lugar! 🏃‍♂️`,
                `Não se atrasa! ${materia} começa agorinha, às ${hora}. ✍️`,
                `Foco total! ${materia} em 5 minutos. Tudo pronto? 🧪`,
                `Última chamada para ${materia} às ${hora}! 🌟`
            ];
        }

        // Sorteia uma das frases da lista escolhida
        const msgSorteada = frases[Math.floor(Math.random() * frases.length)];

        const options = {
            body: msgSorteada,
            icon: '/icon-512.png',  // Seu ícone oficial
            badge: '/icon-512.png', 
            vibrate: [200, 100, 200, 100, 200],
            tag: `aula-${materia}-${tempoRestante}`, 
            renotify: true,
            requireInteraction: true,
            data: { url: '/horario.html' }
        };

        event.waitUntil(
            self.registration.showNotification(titulo, options)
        );
    }
});

// AÇÃO AO CLICAR NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
