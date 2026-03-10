// home-logica.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mostrar nome do usuário
    const nome = localStorage.getItem('dt_user_name') || "Estudante";
    document.getElementById('user-display-name').innerText = nome.split(' ')[0].toUpperCase();

    // 2. Colocar a data atual
    const hoje = new Date();
    const opcoes = { day: '2-digit', month: '2-digit' };
    document.getElementById('current-date').innerText = hoje.toLocaleDateString('pt-BR', opcoes);

    // 3. Inicializar ícones Lucide
    if (window.lucide) lucide.createIcons();

    // 4. Abrir Mural
    const btnMural = document.getElementById('btn-mural-main');
    const modalMural = document.getElementById('modal-mural');

    if (btnMural) {
        btnMural.onclick = () => {
            modalMural.style.display = 'flex';
            // Aqui você pode colocar a lógica de buscar no Firebase que fizemos antes!
        };
    }
});
