/* ═══════════════════════════════════════════════════════════════════════════
   THEME MANAGER - Hub Brain
   Sistema de Dark/Light Mode com localStorage
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    // ────────────────────────────────────────────────────────────────────────
    // INICIALIZAÇÃO - Aplica tema antes da página renderizar
    // ────────────────────────────────────────────────────────────────────────
    
    function initTheme() {
        // Pega tema salvo (padrão: dark)
        const savedTheme = localStorage.getItem('hub_brain_theme') || 'dark';
        
        // Aplica imediatamente
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        
        console.log('🎨 Tema carregado:', savedTheme);
    }
    
    // Aplica tema ANTES do DOM carregar (evita flash)
    initTheme();
    
    
    // ────────────────────────────────────────────────────────────────────────
    // TOGGLE - Troca entre dark e light
    // ────────────────────────────────────────────────────────────────────────
    
    window.toggleTheme = function() {
        const body = document.body;
        const isLight = body.classList.contains('light-mode');
        
        if (isLight) {
            // Muda pra dark
            body.classList.remove('light-mode');
            localStorage.setItem('hub_brain_theme', 'dark');
            console.log('🌙 Dark mode ativado');
        } else {
            // Muda pra light
            body.classList.add('light-mode');
            localStorage.setItem('hub_brain_theme', 'light');
            console.log('☀️ Light mode ativado');
        }
        
        // Atualiza UI do toggle se existir
        updateToggleUI();
        
        // Evento customizado pra outras partes do app saberem
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: isLight ? 'dark' : 'light' }
        }));
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // SETAR TEMA ESPECÍFICO
    // ────────────────────────────────────────────────────────────────────────
    
    window.setTheme = function(theme) {
        const body = document.body;
        
        if (theme === 'light') {
            body.classList.add('light-mode');
            localStorage.setItem('hub_brain_theme', 'light');
            console.log('☀️ Light mode ativado');
        } else {
            body.classList.remove('light-mode');
            localStorage.setItem('hub_brain_theme', 'dark');
            console.log('🌙 Dark mode ativado');
        }
        
        updateToggleUI();
        
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // PEGAR TEMA ATUAL
    // ────────────────────────────────────────────────────────────────────────
    
    window.getCurrentTheme = function() {
        return document.body.classList.contains('light-mode') ? 'light' : 'dark';
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // ATUALIZAR UI DO TOGGLE (se tiver botão na página)
    // ────────────────────────────────────────────────────────────────────────
    
    function updateToggleUI() {
        const toggles = document.querySelectorAll('.theme-toggle');
        const isLight = document.body.classList.contains('light-mode');
        
        toggles.forEach(toggle => {
            if (isLight) {
                toggle.setAttribute('data-theme', 'light');
                toggle.setAttribute('aria-label', 'Mudar para tema escuro');
            } else {
                toggle.setAttribute('data-theme', 'dark');
                toggle.setAttribute('aria-label', 'Mudar para tema claro');
            }
        });
    }
    
    
    // ────────────────────────────────────────────────────────────────────────
    // CRIAR TOGGLE BUTTON (HTML)
    // ────────────────────────────────────────────────────────────────────────
    
    window.createThemeToggle = function() {
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.onclick = toggleTheme;
        toggle.setAttribute('aria-label', 'Alternar tema');
        
        toggle.innerHTML = `
            <div class="theme-toggle-slider">
                <i data-lucide="moon" class="theme-toggle-icon moon"></i>
                <i data-lucide="sun" class="theme-toggle-icon sun"></i>
            </div>
        `;
        
        updateToggleUI();
        
        // Renderiza ícones do Lucide se disponível
        if (window.lucide) {
            setTimeout(() => lucide.createIcons(), 100);
        }
        
        return toggle;
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // AUTO-ATUALIZAR TOGGLES QUANDO DOM CARREGAR
    // ────────────────────────────────────────────────────────────────────────
    
    document.addEventListener('DOMContentLoaded', function() {
        // Atualiza UI de todos os toggles existentes
        updateToggleUI();
        
        // Adiciona evento de click em todos os toggles
        document.querySelectorAll('.theme-toggle').forEach(toggle => {
            toggle.addEventListener('click', toggleTheme);
        });
        
        console.log('🎨 Theme Manager inicializado');
    });
    
    
    // ────────────────────────────────────────────────────────────────────────
    // LISTENER - Detecta mudanças de tema do sistema (opcional)
    // ────────────────────────────────────────────────────────────────────────
    
    window.enableSystemTheme = function() {
        // Verifica se navegador suporta
        if (!window.matchMedia) return;
        
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        function handleThemeChange(e) {
            // Só muda se não tiver preferência salva
            if (!localStorage.getItem('hub_brain_theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        }
        
        // Listener de mudança
        darkModeQuery.addEventListener('change', handleThemeChange);
        
        // Aplica tema do sistema se não tiver salvo
        if (!localStorage.getItem('hub_brain_theme')) {
            setTheme(darkModeQuery.matches ? 'dark' : 'light');
        }
        
        console.log('🎨 Sincronização com tema do sistema ativada');
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // EXPORT - Torna funções acessíveis globalmente
    // ────────────────────────────────────────────────────────────────────────
    
    window.ThemeManager = {
        toggle: toggleTheme,
        set: setTheme,
        get: getCurrentTheme,
        createToggle: createThemeToggle,
        enableSystemSync: enableSystemTheme
    };
    
})();
