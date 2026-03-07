import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
  authDomain: "dt-scho0l.firebaseapp.com",
  projectId: "dt-scho0l",
  storageBucket: "dt-scho0l.firebasestorage.app",
  messagingSenderId: "78578509391",
  appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a",
  measurementId: "G-F7TG23TBTL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userPhone = localStorage.getItem('dt_user_phone');
const API_KEY = "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";

let acertosAtuais = 0;
let questoesRespondidas = 0;

// --- FUNÇÕES DE NAVEGAÇÃO ---
window.trocarAba = (aba) => {
    document.querySelectorAll('.dt-aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.dt-tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById('painel-' + aba).classList.add('active');
    document.getElementById('tab-' + aba).classList.add('active');
    const header = document.getElementById('header-titulo');
    if(header) header.innerText = aba === 'simulado' ? 'Simulado IA' : 'Tira-Dúvidas';
};

window.mostrarAviso = (txt) => {
    const el = document.getElementById('txt-aviso');
    if(el) el.innerText = txt;
    document.getElementById('modal-aviso').style.display = 'flex';
};
window.fecharAviso = () => document.getElementById('modal-aviso').style.display = 'none';

// --- LOGICA DE XP ---
async function finalizarSimuladoXP() {
    let xpFinal = 0;
    if (acertosAtuais === 10) xpFinal = 150;
    else if (acertosAtuais >= 7) xpFinal = 60;
    else if (acertosAtuais >= 5) xpFinal = 20;
    else if (acertosAtuais >= 3) xpFinal = -30;
    else xpFinal = -80;

    if (userPhone) {
        try {
            await updateDoc(doc(db, "notas", userPhone), { xp: increment(xpFinal) });
        } catch (e) { console.error(e); }
    }
    window.mostrarAviso(`Simulado Finalizado! Acertos: ${acertosAtuais}/10. XP: ${xpFinal > 0 ? '+' : ''}${xpFinal}`);
    setTimeout(() => location.reload(), 3000);
}

// --- CORE: GERAR SIMULADO ---
async function dispararSimulado() {
    const tema = document.getElementById('campo-tema').value;
    if(!tema) return window.mostrarAviso("⚠️ Digite um tema!");
    
    const container = document.getElementById('container-questoes');
    container.innerHTML = "<div class='dt-questao-card'>⏳ Gerando questões...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Responda APENAS JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"explicação"}]`}]
            })
        });
        const d = await res.json();
        const content = d.choices[0].message.content;
        const json = JSON.parse(content.substring(content.indexOf("["), content.lastIndexOf("]") + 1));
        
        container.innerHTML = "";
        json.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "dt-questao-card";
            div.innerHTML = `<p><b>${i+1}.</b> ${q.p}</p>`;
            q.o.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "dt-opt-btn";
                btn.innerText = opt;
                btn.onclick = () => {
                    div.querySelectorAll('.dt-opt-btn').forEach(b => b.disabled = true);
                    questoesRespondidas++;
                    if (idx === q.c) { acertosAtuais++; btn.style.background = '#1b4d2e'; } 
                    else { btn.style.background = '#4d1b1b'; }
                    if (questoesRespondidas === 10) finalizarSimuladoXP();
                };
                div.appendChild(btn);
            });
            container.appendChild(div);
        });
    } catch(e) { container.innerHTML = "Erro ao carregar."; }
}

// --- CORE: TIRA DÚVIDAS ---
async function dispararDuvida() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-box');
    if(!input.value) return;
    const txt = input.value;
    input.value = "";
    box.innerHTML += `<div class="dt-bolha user">${txt}</div>`;
    
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: txt}]
            })
        });
        const d = await res.json();
        box.innerHTML += `<div class="dt-bolha ia">${d.choices[0].message.content}</div>`;
        box.scrollTop = box.scrollHeight;
    } catch(e) { box.innerHTML += "Erro na IA."; }
}

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    // Liga os botões via ID (mais seguro que onclick no HTML)
    const btnGerar = document.getElementById('btn-gerar');
    if(btnGerar) btnGerar.addEventListener('click', dispararSimulado);

    const btnEnviar = document.getElementById('btn-enviar');
    if(btnEnviar) btnEnviar.addEventListener('click', dispararDuvida);

    const btnLimpar = document.getElementById('btn-limpar');
    if(btnLimpar) btnLimpar.addEventListener('click', () => {
        localStorage.removeItem('dt_chat_hist');
        location.reload();
    });

    if (window.lucide) lucide.createIcons();
});
