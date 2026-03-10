// menu.js - O Coração da Navegação do Hub Brain com PWA
const criarMenuGlobal = () => {
    const menuHTML = `
        <div id="side-menu" class="side-menu">
            <div class="menu-header">
                <span class="menu-title">HUB <span class="purple">BRAIN</span></span>
                <button id="close-menu"><i data-lucide="x"></i></button>
            </div>
            <nav class="menu-links" id="nav-links-container">
                <a href="home.html" id="link-home"><i data-lucide="home"></i> Início</a>
                
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
                <button id="install-app-btn" class="btn-install-menu" style="display: none;">
                    <i data-lucide="download-cloud"></i> Baixar App
                </button>
                
                <button id="btn-logout-sidebar" class="btn-logout-menu">
                    <i data-lucide="log-out"></i> Sair da Conta
                </button>
            </div>
        </div>
        <div id="menu-overlay" class="menu-overlay"></div>
    `;

    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const btnOpen = document.getElementById('open-menu');
    const btnClose = document.getElementById('close-menu');
    const btnLogout = document.getElementById('btn-logout-sidebar');
    const btnInstall = document.getElementById('install-app-btn');
    const navLinks = document.getElementById('nav-links-container');

    // --- LOGICA DE ADMIN (ACESSO EXCLUSIVO) ---
    const emailMestre = "ditoh2008@gmail.com";
    const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

    if (emailLogado === emailMestre && navLinks) {
        const adminLink = document.createElement('a');
        adminLink.href = "admin.html";
        adminLink.id = "link-admin";
        adminLink.style.color = "#a052ff"; // Roxo diferente para destacar
        adminLink.style.borderLeft = "4px solid #a052ff";
        adminLink.innerHTML = `<i data-lucide="shield-check"></i> Painel do Mestre`;
        navLinks.appendChild(adminLink);
    }

    const abrirMenu = () => { sideMenu.classList.add('open'); menuOverlay.classList.add('active'); };
    const fecharMenu = () => { sideMenu.classList.remove('open'); menuOverlay.classList.remove('active'); };

    if (btnOpen) btnOpen.onclick = abrirMenu;
    if (btnClose) btnClose.onclick = fecharMenu;
    if (menuOverlay) menuOverlay.onclick = fecharMenu;

    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.clear();
            window.location.href = 'login.html';
        };
    }

    // --- LÓGICA DE INSTALAÇÃO DO APP ---
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (btnInstall) btnInstall.style.display = 'flex'; 
    });

    if (btnInstall) {
        btnInstall.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') btnInstall.style.display = 'none';
                deferredPrompt = null;
            }
        };
    }

    // Marcar link ativo (ADICIONADO 'home' na lista)
    const path = window.location.pathname;
    const paginas = ['home', 'index', 'agenda', 'estudos', 'horario', 'perfil', 'ranking', 'foco', 'admin'];
    paginas.forEach(pg => {
        if (path.includes(pg)) {
            const link = document.getElementById(`link-${pg}`);
            if (link) link.classList.add('active');
        }
    });

    if (window.lucide) lucide.createIcons();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarMenuGlobal);
} else {
    criarMenuGlobal();
}
