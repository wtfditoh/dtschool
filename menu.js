// menu.js - O Coração da Navegação do Hub Brain
const criarMenuGlobal = () => {
    // 1. Criar o HTML do Menu Lateral
    const menuHTML = `
        <div id="side-menu" class="side-menu">
            <div class="menu-header">
                <span class="menu-title">HUB <span class="purple">BRAIN</span></span>
                <button id="close-menu"><i data-lucide="x"></i></button>
            </div>
            <nav class="menu-links">
                <a href="index.html" id="link-notas"><i data-lucide="layout-dashboard"></i> Notas</a>
                <a href="perfil.html" id="link-perfil"><i data-lucide="user"></i> Perfil</a>
                <a href="ranking.html" id="link-ranking"><i data-lucide="trophy"></i> Ranking</a>
                <a href="calendario.html" id="link-cal"><i data-lucide="calendar"></i> Calendário</a>
            </nav>
            <div class="menu-footer">
                <button onclick="window.logout()" class="btn-logout-menu">
                    <i data-lucide="log-out"></i> Sair
                </button>
            </div>
        </div>
        <div id="menu-overlay" class="menu-overlay"></div>
    `;

    // 2. Injetar o menu no início do body
    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    // 3. Lógica de Abrir/Fechar
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const btnOpen = document.getElementById('open-menu');
    const btnClose = document.getElementById('close-menu');

    if (btnOpen) {
        btnOpen.onclick = () => {
            sideMenu.classList.add('open');
            menuOverlay.classList.add('active');
        };
    }

    const fechar = () => {
        sideMenu.classList.remove('open');
        menuOverlay.classList.remove('active');
    };

    if (btnClose) btnClose.onclick = fechar;
    if (menuOverlay) menuOverlay.onclick = fechar;

    // 4. Marcar link ativo baseado na página atual
    const path = window.location.pathname;
    if (path.includes('index')) document.getElementById('link-notas')?.classList.add('active');
    if (path.includes('perfil')) document.getElementById('link-perfil')?.classList.add('active');
    if (path.includes('ranking')) document.getElementById('link-ranking')?.classList.add('active');

    // Re-renderizar ícones do Lucide para o menu novo
    if (window.lucide) lucide.createIcons();
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', criarMenuGlobal);
