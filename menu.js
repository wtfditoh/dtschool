// menu.js - O Coração da Navegação do Hub Brain
const criarMenuGlobal = () => {
    // 1. Criar o HTML do Menu Lateral com TODAS as suas páginas
    const menuHTML = `
        <div id="side-menu" class="side-menu">
            <div class="menu-header">
                <span class="menu-title">HUB <span class="purple">BRAIN</span></span>
                <button id="close-menu"><i data-lucide="x"></i></button>
            </div>
            <nav class="menu-links">
                <a href="perfil.html" id="link-perfil"><i data-lucide="user"></i> Perfil</a>
                <a href="index.html" id="link-index"><i data-lucide="layout-dashboard"></i> Notas</a>
                <a href="agenda.html" id="link-agenda"><i data-lucide="list-todo"></i> Agenda</a>
                <a href="estudos.html" id="link-estudos"><i data-lucide="brain-circuit"></i> Estudos & IA</a>
                <a href="foco.html" id="link-foco" class="foco-highlight"><i data-lucide="timer"></i> 
                    <span>Modo Foco <small class="xp-badge">+XP</small></span></a>
                <a href="horario.html" id="link-horario"><i data-lucide="clock"></i> Horários</a>
                <a href="ranking.html" id="link-ranking"><i data-lucide="trophy"></i> Ranking</a>
            </nav>
            <div class="menu-footer">
                <button id="btn-logout-sidebar" class="btn-logout-menu">
                    <i data-lucide="log-out"></i> Sair da Conta
                </button>
            </div>
        </div>
        <div id="menu-overlay" class="menu-overlay"></div>
    `;

    // 2. Injetar o menu no início do body
    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    // 3. Seleção de elementos
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const btnOpen = document.getElementById('open-menu'); // Deve existir no Header das páginas
    const btnClose = document.getElementById('close-menu');
    const btnLogout = document.getElementById('btn-logout-sidebar');

    // 4. Lógica de Abrir/Fechar
    const abrirMenu = () => {
        sideMenu.classList.add('open');
        menuOverlay.classList.add('active');
    };

    const fecharMenu = () => {
        sideMenu.classList.remove('open');
        menuOverlay.classList.remove('active');
    };

    if (btnOpen) btnOpen.onclick = abrirMenu;
    if (btnClose) btnClose.onclick = fecharMenu;
    if (menuOverlay) menuOverlay.onclick = fecharMenu;

    // 5. Lógica de Logout (Garante que funciona em todas as telas)
    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.clear();
            window.location.href = 'login.html';
        };
    }

    // 6. Marcar link ativo baseado na URL atual
    const path = window.location.pathname;
    const paginas = ['index', 'agenda', 'estudos', 'horario', 'perfil', 'ranking'];
    
    paginas.forEach(pg => {
        if (path.includes(pg)) {
            const link = document.getElementById(`link-${pg}`);
            if (link) link.classList.add('active');
        }
    });

    // Especial para a Home caso o path seja apenas "/"
    if (path === '/' || path.endsWith('/')) {
        document.getElementById('link-index')?.classList.add('active');
    }

    // 7. Renderizar ícones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
};

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarMenuGlobal);
} else {
    criarMenuGlobal();
}
