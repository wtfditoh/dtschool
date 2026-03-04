const API_KEY = "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";

// Garante que tudo carregue, inclusive os ícones
window.addEventListener('load', () => {
    if (window.lucide) lucide.createIcons();
    const salvo = localStorage.getItem('dt_chat_hist');
    if(salvo && document.getElementById('chat-box')) {
        document.getElementById('chat-box').innerHTML = salvo;
    }
});

// 1. MENU LATERAL (Conecta com os 3 traços)
function abrirSeuMenuLateral() {
    const menu = document.querySelector('.dt-sidebar') || document.querySelector('nav');
    if(menu) menu.classList.toggle('open');
}

// 2. NAVEGAÇÃO DE ABAS
function trocarAba(aba) {
    document.querySelectorAll('.dt-aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.dt-tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById('painel-' + aba).classList.add('active');
    document.getElementById('tab-' + aba).classList.add('active');
    document.getElementById('header-titulo').innerText = aba === 'simulado' ? 'Simulado IA' : 'Tira-Dúvidas';
}

// 3. LIXEIRA CUSTOMIZADA (O modal bonitão)
function abrirModalLixeira() { 
    document.getElementById('modal-lixeira').style.display = 'flex'; 
}
function fecharModalLixeira() { 
    document.getElementById('modal-lixeira').style.display = 'none'; 
}
function confirmarLimpeza() {
    localStorage.removeItem('dt_chat_hist');
    const container = document.getElementById('container-questoes');
    const chat = document.getElementById('chat-box');
    if(container) container.innerHTML = "";
    if(chat) chat.innerHTML = '<div class="dt-bolha ia">Histórico limpo!</div>';
    fecharModalLixeira();
}

// 4. AVISOS
function mostrarAviso(txt) {
    document.getElementById('txt-aviso').innerText = txt;
    document.getElementById('modal-aviso').style.display = 'flex';
}
function fecharAviso() { 
    document.getElementById('modal-aviso').style.display = 'none'; 
}

// 5. SIMULADO COM CORES (VERDE/VERMELHO)
async function gerarSimulado() {
    const tema = document.getElementById('campo-tema').value;
    if(!tema) return mostrarAviso("⚠️ Digite um tema primeiro!");
    
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
        const json = JSON.parse(d.choices[0].message.content.match(/\[.*\]/s)[0]);
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

                    // A MÁGICA DAS CORES AQUI
                    if (idx === q.c) {
                        btn.style.setProperty('background-color', '#1b4d2e', 'important');
                        btn.style.setProperty('border-color', '#2ecc71', 'important');
                        btn.style.setProperty('color', '#fff', 'important');
                    } else {
                        btn.style.setProperty('background-color', '#4d1b1b', 'important');
                        btn.style.setProperty('border-color', '#ff4444', 'important');
                        // Mostra a certa em verde
                        btns[q.c].style.setProperty('border', '2px solid #2ecc71', 'important');
                    }
                    
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = `<b>🎓 Mini Aula:</b><br>${q.e}`;
                    div.appendChild(aula);
                };
                div.appendChild(btn);
            });
            container.appendChild(div);
        });
    } catch(e) { container.innerHTML = "Erro ao gerar simulado. Tente novamente."; }
}

// 6. CHAT TIRA-DÚVIDAS
async function enviarMensagem() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-box');
    if(!input.value) return;

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
    } catch(e) { box.innerHTML += `<div class="dt-bolha ia">Erro ao responder.</div>`; }
}
