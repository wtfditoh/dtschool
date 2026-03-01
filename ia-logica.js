const API_KEY = "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";

// Forçar carregamento manual dos ícones
setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 1000);

function trocarAba(aba) {
    document.getElementById('painel-simulado').classList.remove('active');
    document.getElementById('painel-chat').classList.remove('active');
    document.getElementById('tab-simulado').classList.remove('active');
    document.getElementById('tab-chat').classList.remove('active');
    
    document.getElementById('painel-' + aba).classList.add('active');
    document.getElementById('tab-' + aba).classList.add('active');
}

function abrirModalLixeira() { document.getElementById('modal-lixeira').style.display = 'flex'; }
function fecharModalLixeira() { document.getElementById('modal-lixeira').style.display = 'none'; }
function fecharAviso() { document.getElementById('modal-aviso').style.display = 'none'; }

function confirmarLimpeza() {
    localStorage.clear();
    location.reload();
}

async function gerarSimulado() {
    const t = document.getElementById('campo-tema').value;
    if(!t) {
        document.getElementById('txt-aviso').innerText = "Digite um tema!";
        document.getElementById('modal-aviso').style.display = 'flex';
        return;
    }

    const cont = document.getElementById('container-questoes');
    cont.innerHTML = "<p style='text-align:center; padding:20px;'>⏳ Gerando...</p>";

    try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {"Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json"},
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{role: "user", content: `Gere 5 questões sobre ${t} em JSON: [{"p":"pergunta","o":["a","b","c","d"],"c":0,"e":"explicacao"}]`}]
            })
        });
        const d = await r.json();
        const qts = JSON.parse(d.choices[0].message.content.match(/\[.*\]/s)[0]);
        cont.innerHTML = "";

        qts.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = "dt-questao-card";
            card.innerHTML = `<p><b>${i+1}.</b> ${q.p}</p>`;
            
            q.o.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "dt-opt-btn";
                btn.innerText = opt;
                btn.onclick = function() {
                    const btns = card.querySelectorAll('.dt-opt-btn');
                    btns.forEach(b => b.disabled = true);
                    
                    if(idx === q.c) {
                        this.style.setProperty('background', '#1b4d2e', 'important');
                        this.style.setProperty('border', '1px solid #2ecc71', 'important');
                    } else {
                        this.style.setProperty('background', '#4d1b1b', 'important');
                        this.style.setProperty('border', '1px solid #ff4444', 'important');
                        btns[q.c].style.setProperty('border', '2px solid #2ecc71', 'important');
                    }
                    const aula = document.createElement('div');
                    aula.className = "dt-mini-aula";
                    aula.innerHTML = q.e;
                    card.appendChild(aula);
                };
                card.appendChild(btn);
            });
            cont.appendChild(card);
        });
    } catch(e) { cont.innerHTML = "Erro ao carregar."; }
}
