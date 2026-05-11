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
                
                <!-- SUB-MENU QUÍMICA -->
                <div class="menu-item-expandable" id="quimica-expandable">
                    <div class="menu-item-header" onclick="toggleSubMenu('quimica')">
                        <div class="menu-item-content">
                            <i data-lucide="flask-conical"></i>
                            <span>Química</span>
                        </div>
                        <i data-lucide="chevron-down" class="menu-chevron" id="chevron-quimica"></i>
                    </div>
                    <div class="sub-menu" id="submenu-quimica">
                        <a href="quimica.html" id="link-quimica-geral" class="sub-menu-link">
                            <i data-lucide="atom"></i> Química Geral
                        </a>
                        <a href="rgb-roi.html" id="link-rgb" class="sub-menu-link">
                            <i data-lucide="scan-eye"></i> RGB & ROI
                        </a>
                        <a href="laboratorio.html" id="link-laboratorio" class="sub-menu-link">
                            <i data-lucide="microscope"></i> Laboratório
                        </a>
                        <a href="banco-amostras.html" id="link-banco-amostras" class="sub-menu-link">
                            <i data-lucide="database"></i> Banco de Amostras
                        </a>
                    </div>
                </div>

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

    // TOGGLE SUB-MENU
    window.toggleSubMenu = function(menuId) {
        const submenu = document.getElementById(`submenu-${menuId}`);
        const chevron = document.getElementById(`chevron-${menuId}`);
        const expandable = document.getElementById(`${menuId}-expandable`);
        
        if (submenu.classList.contains('open')) {
            submenu.classList.remove('open');
            chevron.style.transform = 'rotate(0deg)';
            expandable.classList.remove('active');
        } else {
            submenu.classList.add('open');
            chevron.style.transform = 'rotate(180deg)';
            expandable.classList.add('active');
        }
        
        if (window.lucide) lucide.createIcons();
    };

    // MARCAR LINK ATIVO
    const path = window.location.pathname;
    const paginasQuimica = ['quimica', 'rgb-roi', 'rgb', 'laboratorio', 'banco-amostras'];
    
    // Se tá em alguma página de química, abre o submenu automaticamente
    if (paginasQuimica.some(pg => path.includes(pg))) {
        const submenu = document.getElementById('submenu-quimica');
        const chevron = document.getElementById('chevron-quimica');
        const expandable = document.getElementById('quimica-expandable');
        
        if (submenu) submenu.classList.add('open');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (expandable) expandable.classList.add('active');
    }

    // Marcar página ativa
    if (path === '/' || path.endsWith('index.html')) {
        document.getElementById('link-home')?.classList.add('active');
    }

    const paginas = [
        'home', 'perfil', 'notas', 'agenda', 'estudos', 'horario',
        'ranking', 'foco', 'admin', 'configuracoes'
    ];

    paginas.forEach(pg => {
        if (path.includes(pg)) {
            document.getElementById(`link-${pg}`)?.classList.add('active');
        }
    });

    // Marcar sub-links de química
    if (path.includes('quimica') && !path.includes('rgb')) {
        document.getElementById('link-quimica-geral')?.classList.add('active');
    } else if (path.includes('rgb')) {
        document.getElementById('link-rgb')?.classList.add('active');
    } else if (path.includes('laboratorio')) {
        document.getElementById('link-laboratorio')?.classList.add('active');
    } else if (path.includes('banco-amostras')) {
        document.getElementById('link-banco-amostras')?.classList.add('active');
    }

    // FADE ENTRADA
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 50);

    // FADE SAÍDA
    document.querySelectorAll('.menu-links a, .sub-menu-link').forEach(link => {
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
