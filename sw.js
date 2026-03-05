/* Hub Brain - Service Worker Oficial */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// ESCUTADOR DE MENSAGENS (A mágica dos 30 e 5 min com suas frases)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICAR_AULA') {
        const { materia, hora, tempoRestante } = event.data;
        let frases = [];
        let titulo = "🔔 Hub Brain";

        // Verifica se veio "30_MIN" ou o número 30
        if (tempoRestante === "30_MIN" || tempoRestante === 30) {
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

        const msgSorteada = frases[Math.floor(Math.random() * frases.length)];

        const options = {
            body: msgSorteada,
            // AJUSTE: Removi a / inicial e usei ./ para garantir que ache o ícone na mesma pasta
            icon: './icon-512.png',  
            badge: './icon-512.png', 
            vibrate: [200, 100, 200, 100, 200],
            tag: `aula-${materia}-${tempoRestante}`, 
            renotify: true,
            requireInteraction: true,
            data: { url: './horario.html' }
        };

        event.waitUntil(
            self.registration.showNotification(titulo, options)
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('horario.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
