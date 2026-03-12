/* Hub Brain - Service Worker Pro (Instalável & Notificações) 🧠⏰ */

const CACHE_NAME = 'hub-brain-v1';

// 1. INSTALAÇÃO: Força o SW a assumir o controle imediatamente
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('SW: Instalado com sucesso!');
});

// 2. ATIVAÇÃO: Limpa caches antigos e assume os clientes
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('SW: Ativado e pronto!');
});

// 3. OBRIGATÓRIO PARA PWA: Escutador de Fetch (Busca)
// Sem isso aqui, o Chrome não deixa instalar o APK/PWA
self.addEventListener('fetch', (event) => {
    // Aqui poderíamos cachear arquivos, mas vamos deixar passar direto 
    // para garantir que o app sempre pegue os dados novos do Firebase.
    return; 
});

// 4. LÓGICA DO DESPERTADOR (Intervalo de vida)
setInterval(() => {
    self.registration.update(); // Mantém o SW acordado
    verificarAulas();
}, 60000);

function verificarAulas() {
    // Função mantida para lógica futura de IndexedDB
    // No SW, evite usar localStorage (não funciona aqui dentro)
}

// 5. ESCUTADOR DE MENSAGENS (Notificações Push do Alarme)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICAR_AULA') {
        const { materia, hora, tempoRestante } = event.data;
        
        const titulo = tempoRestante === 30 ? "⏳ Aula em 30 min!" : "🚀 Falta pouco!";
        
        event.waitUntil(
            self.registration.showNotification(titulo, {
                body: `Matéria: ${materia} às ${hora}.`,
                icon: './icon-514.png', // Ajustado para o nome do seu ícone no manifest
                badge: './icon-514.png',
                vibrate: [500, 110, 500, 110, 450, 110],
                tag: `aula-${materia}`, // Tag única para não empilhar mil avisos
                renotify: true,
                requireInteraction: true,
                priority: 2 // Máxima prioridade Android
            })
        );
    }
});

// 6. CLIQUE NA NOTIFICAÇÃO: Abre o app no horário
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Se o app já estiver aberto, foca nele, senão abre um novo
            for (const client of clientList) {
                if (client.url.includes('horario.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./horario.html');
            }
        })
    );
});
