/* ═══════════════════════════════════════════════════════════════════════════
   THEME MANAGER - Hub Brain
   Sistema de Dark/Light Mode - COMPATÍVEL COM BOTÕES EXISTENTES
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
    // SETAR TEMA - Função chamada pelos botões
    // ────────────────────────────────────────────────────────────────────────
    
    window.setTema = function(theme) {
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
        
        // Atualiza botões ativos
        updateThemeButtons();
        
        // Evento customizado
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // ATUALIZAR BOTÕES - Marca qual tá ativo
    // ────────────────────────────────────────────────────────────────────────
    
    function updateThemeButtons() {
        const currentTheme = getCurrentTheme();
        
        // Botões de tema (se existirem na página)
        const darkBtn = document.getElementById('theme-dark');
        const lightBtn = document.getElementById('theme-light');
        
        if (darkBtn && lightBtn) {
            if (currentTheme === 'dark') {
                darkBtn.classList.add('active');
                lightBtn.classList.remove('active');
            } else {
                darkBtn.classList.remove('active');
                lightBtn.classList.add('active');
            }
        }
        
        // Toggle switches (se existirem)
        const toggles = document.querySelectorAll('.theme-toggle');
        toggles.forEach(toggle => {
            if (currentTheme === 'light') {
                toggle.setAttribute('data-theme', 'light');
            } else {
                toggle.setAttribute('data-theme', 'dark');
            }
        });
    }
    
    
    // ────────────────────────────────────────────────────────────────────────
    // TOGGLE - Troca entre dark e light
    // ────────────────────────────────────────────────────────────────────────
    
    window.toggleTheme = function() {
        const current = getCurrentTheme();
        setTema(current === 'dark' ? 'light' : 'dark');
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // PEGAR TEMA ATUAL
    // ────────────────────────────────────────────────────────────────────────
    
    window.getCurrentTheme = function() {
        return document.body.classList.contains('light-mode') ? 'light' : 'dark';
    };
    
    
    // ────────────────────────────────────────────────────────────────────────
    // AUTO-ATUALIZAR BOTÕES QUANDO DOM CARREGAR
    // ────────────────────────────────────────────────────────────────────────
    
    document.addEventListener('DOMContentLoaded', function() {
        // Atualiza estado dos botões
        updateThemeButtons();
        
        console.log('🎨 Theme Manager inicializado');
    });
    
    
    // ────────────────────────────────────────────────────────────────────────
    // EXPORT - Funções acessíveis globalmente
    // ────────────────────────────────────────────────────────────────────────
    
    window.ThemeManager = {
        set: setTema,
        toggle: toggleTheme,
        get: getCurrentTheme,
        updateButtons: updateThemeButtons
    };
    
})();
