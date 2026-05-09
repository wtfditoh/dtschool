const criarMenuGlobal = () => {
    const nome = localStorage.getItem('dt_user_name') || 'Estudante';
    const email = (localStorage.getItem('dt_user_email') || '').toLowerCase();
    const avatar = localStorage.getItem('dt_user_avatar') || 'user';
    const primeiroNome = nome.split(' ')[0];

    const menuHTML = `
        <div id="side-menu" class="side-menu">

            <!-- MINI CARD PERFIL -->
            <div class="menu-profile-card" onclick="window.location.href='perfil.html'">
                <div class="menu-avatar">
                    <i data-lucide="${avatar}" id="menu-avatar-icon"></i>
                </div>
                <div class="menu-profile-info">
                    <div class="menu-profile-nome">${primeiroNome}</div>
                    <div class="menu-profile-email">${email || 'Visitante'}</div>
                </div>
                <div class="menu-profile-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>

            <nav class="menu-links" id="nav-links-container">
                <div class="menu-section-label">GERAL</div>
                <a href="index.html" id="link-home"><i data-lucide="home"></i> Início</a>
                <a href="perfil.html" id="link-perfil"><i data-lucide="user"></i> Perfil</a>
                <a href="ranking.html" id="link-ranking"><i data-lucide="trophy"></i> Ranking</a>
                <a href="configuracoes.html" id="link-configuracoes"><i data-lucide="settings-2"></i> Configurações</a>

                <div class="menu-section-label">ESTUDOS</div>
                <a href="notas.html" id="link-notas"><i data-lucide="layout-dashboard"></i> Notas</a>
                <a href="agenda.html" id="link-agenda"><i data-lucide="list-todo"></i> Agenda</a>
                <a href="horario.html" id="link-horario"><i data-lucide="clock"></i> Horários</a>
                <a href="quimica.html" id="link-quimica"><i data-lucide="flask-conical"></i> Química</a>
                <a href="rgb-roi.html" id="link-rgb"><i data-lucide="scan-eye"></i> Análise RGB</a>
                <a href="cronograma.html" id="link-cronograma"><i data-lucide="calendar-days"></i> Cronograma</a>

                <div class="menu-section-label">PRODUTIVIDADE</div>
                <a href="foco.html" id="link-foco"><i data-lucide="timer"></i> Modo Foco <small class="xp-badge">+XP</small></a>
                <a href="estudos.html" id="link-estudos"><i data-lucide="brain-circuit"></i> Estudos & IA</a>
            </nav>

            <div class="menu-footer">
                <button id="install-app-btn" class="btn-install-menu" style="display:none;">
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

    // ADMIN
    const emailMestre = "ditoh2008@gmail.com";
    if (email === emailMestre && navLinks) {
        const adminLink = document.createElement('a');
        adminLink.href = "admin.html";
        adminLink.id = "link-admin";
        adminLink.style.cssText = "color:#a052ff;border-left:3px solid #a052ff;margin-top:4px;";
        adminLink.innerHTML = `<i data-lucide="shield-check"></i> Painel do Mestre`;
        navLinks.appendChild(adminLink);
    }

    const abrirMenu = () => { sideMenu.classList.add('open'); menuOverlay.classList.add('active'); };
    const fecharMenu = () => { sideMenu.classList.remove('open'); menuOverlay.classList.remove('active'); };

    if (btnOpen) btnOpen.onclick = abrirMenu;
    if (btnClose) btnClose.onclick = fecharMenu;
    if (menuOverlay) menuOverlay.onclick = fecharMenu;
    if (btnLogout) btnLogout.onclick = () => { localStorage.clear(); window.location.href = 'login.html'; };

    // INSTALAR APP
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e;
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

    // MARCAR LINK ATIVO
    const path = window.location.pathname;
    const paginas = [
        'home', 'perfil', 'notas', 'agenda', 'estudos', 'horario',
        'ranking', 'foco', 'admin', 'cronograma', 'quimica',
        'rgb', 'configuracoes'
    ];

    if (path === '/' || path.endsWith('index.html')) {
        document.getElementById('link-home')?.classList.add('active');
    }

    paginas.forEach(pg => {
        if (path.includes(pg)) {
            document.getElementById(`link-${pg}`)?.classList.add('active');
        }
    });

    // FADE ENTRADA
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 50);

    // FADE SAÍDA
    document.querySelectorAll('.menu-links a').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
            e.preventDefault();
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = href; }, 260);
        });
    });

    if (window.lucide) lucide.createIcons();
};

window.navegarPara = function(url) {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.25s ease';
    setTimeout(() => { window.location.href = url; }, 250);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarMenuGlobal);
} else {
    criarMenuGlobal();
}
