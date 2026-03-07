import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { /* SEU CONFIG AQUI */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const monster = document.getElementById('monster-ui');
const status = document.getElementById('login-status');

// 1. FAZER O BICHO PISCAR SOZINHO (Dando vida)
setInterval(() => {
    monster.classList.add('blinking');
    setTimeout(() => monster.classList.remove('blinking'), 150);
}, 4000);

// 2. SEGUIR O MOUSE COM O CORPO TODO (Inclinação)
document.addEventListener('mousemove', (e) => {
    if (!monster.classList.contains('shame')) {
        const pupils = document.querySelectorAll('.pupil');
        const x = (e.clientX / window.innerWidth - 0.5) * 15;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        
        // Move as pupilas
        pupils.forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
        // Inclina o monstro sutilmente na direção do mouse
        monster.style.transform = `rotate(${x/2}deg) translateY(${y/2}px)`;
    }
});

// 3. REAÇÕES DE INPUT
const emailIn = document.getElementById('user-email');
const passIn = document.getElementById('user-pass');

passIn.addEventListener('focus', () => monster.classList.add('shame'));
passIn.addEventListener('blur', () => monster.classList.remove('shame'));

// Função de erro turbinada
function mostrarErro(msg) {
    status.innerText = "⚠ " + msg;
    status.style.opacity = "1";
    monster.classList.add('angry');
    setTimeout(() => {
        monster.classList.remove('angry');
        status.style.opacity = "0";
    }, 3000);
}

// Suas funções tentarLogar e realizarCadastro aqui embaixo...
window.tentarLogar = async () => { /* lógica igual */ };
window.entrarComoVisitante = () => { /* lógica igual */ };
