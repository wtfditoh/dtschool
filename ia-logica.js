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

// VARIÁVEIS DE CONTROLE DE XP (ADICIONADAS)
let acertosSimulado = 0;
let respondidasSimulado = 0;

// Garante que tudo carregue, inclusive os ícones
window.addEventListener('load', () => {
    if (window.lucide) lucide.createIcons();
    const salvo = localStorage.getItem('dt_chat_hist');
    if(salvo && document.getElementById('chat-box')) {
        document.getElementById('chat-box').innerHTML = salvo;
    }
});

// 1. MENU LATERAL
window.abrirSeuMenuLateral = function() {
    const menu = document.querySelector('.dt-sidebar') || document.querySelector('nav');
    if(menu) menu.classList.toggle('open');
}

// 2. NAVEGAÇÃO DE ABAS
window.trocarAba = function(aba) {
    document.querySelectorAll('.dt-aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.dt-tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById('painel-' + aba).classList.add('active');
    document.getElementById('tab-' + aba).classList.add('active');
    const header = document.getElementById('header-titulo');
    if(header) header.innerText = aba === 'simulado' ? 'Simulado IA' : 'Tira-Dúvidas';
}

// 3. LIXEIRA CUSTOMIZADA
window.abrirModalLixeira = function() { 
    document.getElementById('modal-lixeira').style.display = 'flex'; 
}
window.fecharModalLixeira = function() { 
    document.getElementById('modal-lixeira').style.display = 'none'; 
}
window.confirmarLimpeza = function() {
    localStorage.removeItem('dt_chat_hist');
    const container = document.getElementById('container-questoes');
    const chat = document.getElementById('chat-box');
    if(container) container.innerHTML = "";
    if(chat) chat.innerHTML = '<div class="dt-bolha ia">Histórico limpo!</div>';
    window.fecharModalLixeira();
}

// 4. AVISOS
window.mostrarAviso = function(txt) {
    const aviso = document.getElementById('modal-aviso');
    const txtAviso = document.getElementById('txt-aviso');
    if(aviso && txtAviso) {
        txtAviso.innerText = txt;
        aviso.style.display = 'flex';
    }
}
window.fecharAviso = function() { 
    document.getElementById('modal-aviso').style.display = 'none'; 
}

// LÓGICA DE XP (REGRAS DO USUÁRIO)
async function aplicarXPSimulado() {
    let xpFinal = 0;
    if (acertosSimulado === 10) xpFinal = 150;
    else if (acertosSimulado >= 7) xpFinal = 60;
    else if (acertosSimulado >= 5) xpFinal = 20; // Neutro/Pequeno ganho
    else if (acertosSimulado >= 3) xpFinal = -30;
    else xpFinal = -80;

    if (userPhone) {
        try {
            const userRef = doc(db, "notas", userPhone);
            await updateDoc(userRef, { xp: increment(xpFinal) });
            window.mostrarAviso(`Simulado Concluído! Acertos: ${acertosSimulado}/10. Ranking: ${xpFinal > 0 ? '+' : ''}${xpFinal} XP`);
        } catch (e) { console.error("Erro XP:", e); }
    }
}

// 5. SIMULADO COM CORES (VERDE/VERMELHO)
window.gerarSimulado = async function() {
    const tema = document.getElementById('campo-tema').value;
    if(!tema) return window.mostrarAviso("⚠️ Digite um tema primeiro!");
    
    acertosSimulado = 0;
    respondidasSimulado = 0;

    const container = document.getElementById('container-questoes');
    container.innerHTML = "<div class='dt-questao-card' style='text-align:center'>⏳ Preparando seu simulado...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Retorne apenas JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"EXPLICAÇÃO"}]`}]
            })
        });

        const d = await res.json();
        const rawContent = d.choices[0].message.content;
        const json = JSON.parse(rawContent.match(/\[.*\]/s)[0]);
        container.innerHTML = "";

        json.forEach((q, i) => {
            const div = document.createElement('div');
            div.className = "dt-questao-card";
            div.innerHTML = `<p style="margin-bottom:15px"><b>${i+1}.</b> ${q.p}</p>`;
            
            q.o.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "dt-opt-btn";
                btn.innerText = opt;
                btn.onclick = () => {
                    const btns = div.querySelectorAll('.dt-opt-btn');
                    btns.forEach(b => b.disabled = true);
                    
                    respondidasSimulado++;

                    if (idx === q.c) {
                        acertosSimulado++;
                        btn.style.setProperty('background-color', '#1b4d2e', 'important');
                        btn.style.setProperty('border-color', '#2ecc71', 'important');
                        btn.style.setProperty('color', '#fff', 'important');
                    } else {
                        btn.style.setProperty('background-color', '#4d1b1b', 'important');
                        btn.style.setProperty('border-color', '#ff4444', 'important');
                        btns[q.c].style.setProperty('border', '2px solid #2ecc71', 'important');
                    }
                    
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = `<b>🎓 Mini Aula:</b><br>${q.e}`;
                    div.appendChild(aula);

                    // VERIFICA SE CHEGOU AO FIM
                    if (respondidasSimulado === 10) {
                        aplicarXPSimulado();
                    }
                };
                div.appendChild(btn);
            });
            container.appendChild(div);
        });
    } catch(e) { 
        console.error(e);
        container.innerHTML = "Erro ao gerar simulado. Tente novamente."; 
    }
}

// 6. CHAT TIRA-DÚVIDAS
window.enviarMensagem = async function() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-box');
    if(!input || !input.value) return;

    const texto = input.value;
    input.value = "";
    box.innerHTML += `<div class="dt-bolha user">${texto}</div>`;
    box.scrollTop = box.scrollHeight;

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "system", content: "Responda de forma curta e acadêmica."}, {role: "user", content: texto}]
            })
        });
        const d = await res.json();
        const respIA = d.choices[0].message.content.replace(/\n/g, '<br>');
        box.innerHTML += `<div class="dt-bolha ia">${respIA}</div>`;
        box.scrollTop = box.scrollHeight;
        localStorage.setItem('dt_chat_hist', box.innerHTML);
    } catch(e) { 
        box.innerHTML += `<div class="dt-bolha ia">Erro ao responder.</div>`; 
    }
}
