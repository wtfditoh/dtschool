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

// ==========================================
// FUNÇÕES DE XP E RANKING
// ==========================================
async function finalizarSimuladoXP() {
    let xpFinal = 0;
    let mensagem = "";
    let cor = "";

    if (acertosAtuais === 10) { xpFinal = 150; mensagem = "🏆 MESTRE! Gabaritou."; cor = "#8a2be2"; }
    else if (acertosAtuais >= 7) { xpFinal = 60; mensagem = "✨ Ótimo desempenho!"; cor = "#2ecc71"; }
    else if (acertosAtuais >= 5) { xpFinal = 20; mensagem = "📈 Na média."; cor = "#ffbb33"; }
    else if (acertosAtuais >= 3) { xpFinal = -30; mensagem = "⚠️ Falta de estudo!"; cor = "#ff4444"; }
    else { xpFinal = -80; mensagem = "💀 Chute ou falta de base."; cor = "#4d1b1b"; }

    if (userPhone && localStorage.getItem('dt_user_type') !== 'local') {
        try {
            const userRef = doc(db, "notas", userPhone);
            await updateDoc(userRef, { xp: increment(xpFinal) });
        } catch (e) { console.error("Erro Ranking:", e); }
    }

    const container = document.getElementById('container-questoes');
    const cardFim = document.createElement('div');
    cardFim.className = "dt-questao-card";
    cardFim.style.cssText = `border: 2px solid ${cor}; text-align: center; background: rgba(0,0,0,0.8); margin-top: 20px;`;
    cardFim.innerHTML = `
        <h2 style="color:${cor}">${acertosAtuais}/10 ACERTOS</h2>
        <p style="margin: 10px 0;">${mensagem}</p>
        <div style="font-size: 22px; font-weight: 900; color:${xpFinal > 0 ? '#2ecc71' : '#ff4444'}">
            ${xpFinal > 0 ? '+' : ''}${xpFinal} XP
        </div>
        <button onclick="location.reload()" style="margin-top:15px; padding:10px 20px; background:#8a2be2; color:white; border:none; border-radius:10px; font-weight:bold;">Reiniciar</button>
    `;
    container.prepend(cardFim);
    cardFim.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// 5. SIMULADO (Ajustado para funcionar com module)
// ==========================================
window.gerarSimulado = async function() {
    const tema = document.getElementById('campo-tema').value;
    if(!tema) return window.mostrarAviso("⚠️ Digite um tema!");
    
    acertosAtuais = 0;
    questoesRespondidas = 0;
    
    const container = document.getElementById('container-questoes');
    container.innerHTML = "<div class='dt-questao-card' style='text-align:center'>⏳ Hub Brain está gerando as questões...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 10 questões sobre ${tema}. Retorne APENAS um array JSON puro: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"EXPLICAÇÃO"}]`}]
            })
        });

        const d = await res.json();
        const content = d.choices[0].message.content;
        const json = JSON.parse(content.substring(content.indexOf("["), content.lastIndexOf("]") + 1));
        
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
                    questoesRespondidas++;

                    if (idx === q.c) {
                        acertosAtuais++;
                        btn.style.backgroundColor = '#1b4d2e';
                        btn.style.borderColor = '#2ecc71';
                    } else {
                        btn.style.backgroundColor = '#4d1b1b';
                        btn.style.borderColor = '#ff4444';
                        btns[q.c].style.border = '2px solid #2ecc71';
                    }
                    
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = `<b>🎓 Explicação:</b><br>${q.e}`;
                    div.appendChild(aula);

                    if (questoesRespondidas === 10) finalizarSimuladoXP();
                };
                div.appendChild(btn);
            });
            container.appendChild(div);
        });
        if (window.lucide) lucide.createIcons();
    } catch(e) { 
        container.innerHTML = "Erro ao carregar questões. Verifique a API Key ou o tema.";
        console.error(e);
    }
}

// ==========================================
// 6. TIRA-DÚVIDAS (Ajustado)
// ==========================================
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
    } catch(e) { box.innerHTML += `<div class="dt-bolha ia">Erro ao processar dúvida.</div>`; }
}

// Outras funções de UI (Precisam do window. para o HTML enxergar)
window.trocarAba = (aba) => {
    document.querySelectorAll('.dt-aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.dt-tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById('painel-' + aba).classList.add('active');
    document.getElementById('tab-' + aba).classList.add('active');
    document.getElementById('header-titulo').innerText = aba === 'simulado' ? 'Simulado IA' : 'Tira-Dúvidas';
};
window.abrirModalLixeira = () => document.getElementById('modal-lixeira').style.display = 'flex';
window.fecharModalLixeira = () => document.getElementById('modal-lixeira').style.display = 'none';
window.confirmarLimpeza = () => {
    localStorage.removeItem('dt_chat_hist');
    document.getElementById('chat-box').innerHTML = '<div class="dt-bolha ia">Histórico limpo!</div>';
    window.fecharModalLixeira();
};
window.mostrarAviso = (txt) => {
    document.getElementById('txt-aviso').innerText = txt;
    document.getElementById('modal-aviso').style.display = 'flex';
};
window.fecharAviso = () => document.getElementById('modal-aviso').style.display = 'none';

window.addEventListener('load', () => { if (window.lucide) lucide.createIcons(); });
