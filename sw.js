/* Hub Brain - Service Worker Despertador ⏰ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// O segredo: Manter o SW vivo com um intervalo que o sistema respeite
setInterval(() => {
    self.registration.update(); // Força o SW a checar se há algo novo
    verificarAulas();
}, 60000);

function verificarAulas() {
    // No Service Worker, não temos acesso direto ao localStorage da página às vezes
    // Por isso, usamos o indexedDB ou uma mensagem de sincronização.
    // MAS, para resolver agora, vamos tentar ler o que estiver disponível:
    
    // Tentar recuperar a grade (isso depende do navegador permitir acesso ao storage no SW)
    // Se falhar, o app envia a mensagem quando está aberto.
}

// ESCUTADOR DE MENSAGENS (Aqui está o reforço)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICAR_AULA') {
        const { materia, hora, tempoRestante } = event.data;
        
        // O waitUntil avisa ao Android: "Não me mate agora, estou processando algo importante!"
        event.waitUntil(
            self.registration.showNotification(tempoRestante === 30 ? "⏳ Aula em 30 min!" : "🚀 Falta pouco!", {
                body: `Matéria: ${materia} às ${hora}.`,
                icon: './icon-512.png',
                badge: './icon-512.png',
                vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
                tag: `aula-${materia}-${tempoRestante}`,
                renotify: true,
                requireInteraction: true, // A notificação FICA na tela até você tocar
                priority: 2 // Prioridade Máxima no Android
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('./horario.html')
    );
});
