// menu.js - O Coração da Navegação do Hub Brain com PWA
const criarMenuGlobal = () => {
    const menuHTML = `
        <div id="side-menu" class="side-menu">
            <div class="menu-header">
                <span class="menu-title">HUB <span class="purple">BRAIN</span></span>
                <button id="close-menu"><i data-lucide="x"></i></button>
            </div>
            <nav class="menu-links" id="nav-links-container">
                <div class="menu-section-label">GERAL</div>
                <a href="index.html" id="link-home"><i data-lucide="home"></i> Início</a>
                <a href="perfil.html" id="link-perfil"><i data-lucide="user"></i> Perfil</a>
                <a href="ranking.html" id="link-ranking"><i data-lucide="trophy"></i> Ranking</a>

                <div class="menu-section-label">ESTUDOS</div>
                <a href="notas.html" id="link-notas"><i data-lucide="layout-dashboard"></i> Notas</a>
                <a href="agenda.html" id="link-agenda"><i data-lucide="list-todo"></i> Agenda</a>
                <a href="horario.html" id="link-horario"><i data-lucide="clock"></i> Horários</a>
                <a href="caderno.html" id="link-caderno"><i data-lucide="notebook-pen"></i> Caderno</a>
                <a href="cronograma.html" id="link-cronograma"><i data-lucide="calendar-days"></i> Cronograma</a>

                <div class="menu-section-label">PRODUTIVIDADE</div>
                <a href="foco.html" id="link-foco"><i data-lucide="timer"></i> Modo Foco <small class="xp-badge">+XP</small></a>
                <a href="estudos.html" id="link-estudos"><i data-lucide="brain-circuit"></i> Estudos & IA</a>
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

    // --- LOGICA DE ADMIN ---
    const emailMestre = "ditoh2008@gmail.com";
    const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

    if (emailLogado === emailMestre && navLinks) {
        const adminLink = document.createElement('a');
        adminLink.href = "admin.html";
        adminLink.id = "link-admin";
        adminLink.style.color = "#a052ff";
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

    // --- INSTALAÇÃO DO APP ---
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

    // --- MARCAR LINK ATIVO ---
    const pathAtivo = window.location.pathname;
    if (pathAtivo === "/" || pathAtivo.endsWith("index.html")) {
        const linkHome = document.getElementById('link-home');
        if (linkHome) linkHome.classList.add('active');
    }
    const paginas = ['notas', 'agenda', 'estudos', 'horario', 'perfil', 'ranking', 'foco', 'admin', 'caderno', 'cronograma'];
    paginas.forEach(pg => {
        if (pathAtivo.includes(pg)) {
            const link = document.getElementById(`link-${pg}`);
            if (link) link.classList.add('active');
        }
    });

    // --- TRANSIÇÕES ENTRE PÁGINAS ---
    // Fade de entrada — página aparece suavemente ao carregar
    var path = window.location.pathname;
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    var fadeDelay = path.includes('caderno') ? 300 : 50;
    setTimeout(function() {
        document.body.style.opacity = '1';
    }, fadeDelay);

    // Fade de saída — intercepta todos os links do menu
    document.querySelectorAll('.menu-links a').forEach(function(link) {
        link.addEventListener('click', function(e) {
            var href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
            e.preventDefault();
            document.body.style.opacity = '0';
            setTimeout(function() {
                window.location.href = href;
            }, 280);
        });
    });

    if (window.lucide) lucide.createIcons();
};

// Função global de navegação com fade (usada nos botões das páginas)
window.navegarPara = function(url) {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.25s ease';
    setTimeout(function() {
        window.location.href = url;
    }, 250);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarMenuGlobal);
} else {
    criarMenuGlobal();
                              }
