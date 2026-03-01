const API_KEY = "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";

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const salvo = localStorage.getItem('dt_chat_hist');
    if(salvo) document.getElementById('chat-box').innerHTML = salvo;
});

// 1. MENU LATERAL DO SITE (CONECTAR COM SUA FUNÇÃO EXISTENTE)
function abrirSeuMenuLateral() {
    // Tenta abrir o menu do seu site original se ele existir
    const menuOriginal = document.querySelector('.dt-sidebar'); // Ajuste a classe se for outra
    if(menuOriginal) {
        menuOriginal.classList.add('open');
    } else {
        console.log("Menu do site principal não encontrado.");
    }
}

// 2. NAVEGAÇÃO ENTRE ABAS
function trocarAba(aba) {
    document.querySelectorAll('.dt-aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.dt-tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById('painel-' + aba).classList.add('active');
    document.getElementById('tab-' + aba).classList.add('active');
    document.getElementById('header-titulo').innerText = aba === 'simulado' ? 'Simulado IA' : 'Tira-Dúvidas';
}

// 3. LIXEIRA CUSTOMIZADA
function abrirModalLixeira() { document.getElementById('modal-lixeira').style.display = 'flex'; }
function fecharModalLixeira() { document.getElementById('modal-lixeira').style.display = 'none'; }
function confirmarLimpeza() {
    localStorage.removeItem('dt_chat_hist');
    document.getElementById('container-questoes').innerHTML = "";
    document.getElementById('chat-box').innerHTML = '<div class="dt-bolha ia">Histórico limpo com sucesso!</div>';
    fecharModalLixeira();
}

// 4. AVISOS
function mostrarAviso(txt) {
    document.getElementById('txt-aviso').innerText = txt;
    document.getElementById('modal-aviso').style.display = 'flex';
}
function fecharAviso() { document.getElementById('modal-aviso').style.display = 'none'; }

// 5. GERADOR DE SIMULADO
async function gerarSimulado() {
    const tema = document.getElementById('campo-tema').value;
    if(!tema) return mostrarAviso("⚠️ Por favor, digite um tema para o simulado!");
    
    const container = document.getElementById('container-questoes');
    container.innerHTML = "<div class='dt-questao-card' style='text-align:center'>⏳ O professor IA está preparando as questões...</div>";

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 5 questões sobre ${tema}. Retorne APENAS o JSON: [{"p":"pergunta","o":["op1","op2","op3","op4"],"c":0,"e":"EXPLICAÇÃO"}]`}]
            })
        });
        const d = await res.json();
        const json = JSON.parse(d.choices[0].message.content.match(/\[.*\]/s)[0]);
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
                    btn.style.background = (idx === q.c) ? "#1b4d2e" : "#4d1b1b";
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = `<b>🎓 Mini Aula:</b><br>${q.e}`;
                    div.appendChild(aula);
                };
                div.appendChild(btn);
            });
            container.appendChild(div);
        });
    } catch(e) { container.innerHTML = "Erro ao conectar com a IA."; }
}

// 6. TIRA-DÚVIDAS (CHAT)
async function enviarMensagem() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-box');
    if(!input.value) return;

    const texto = input.value;
    input.value = "";
    box.innerHTML += `<div class="dt-bolha user">${texto}</div>`;
    box.scrollTop = box.scrollHeight;

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
}
