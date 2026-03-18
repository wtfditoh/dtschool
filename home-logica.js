import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBh3wsAGXY-03HtT47TFlAZGWrusNtjTrc",
    authDomain: "dt-scho0l.firebaseapp.com",
    projectId: "dt-scho0l",
    storageBucket: "dt-scho0l.firebasestorage.app",
    messagingSenderId: "78578509391",
    appId: "1:78578509391:web:7f5ede4f967ca8ce292c3a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const emailMestre = "ditoh2008@gmail.com";
const emailLogado = (localStorage.getItem('dt_user_email') || "").toLowerCase();

// ==========================================
// WIDGET DE MOTIVAÇÃO INTELIGENTE
// ==========================================
function gerarFraseInteligente(ctx) {
    const hora = new Date().getHours();
    const nome = ctx.nome.split(' ')[0];
    const temMeta = ctx.metaMin > 0;
    const metaBatida = ctx.pctMeta >= 100;
    const quaseNaMeta = ctx.pctMeta >= 70 && ctx.pctMeta < 100;
    const semEstudo = ctx.estudadoHoje === 0;
    const temTarefas = ctx.tarefasPendentes > 0;
    const streak = ctx.streak;
    const rank = ctx.rankPos;
    const xp = ctx.xp;

    // Banco de frases por contexto
    const frases = [];

    // META BATIDA
    if (metaBatida) {
        frases.push(...[
            `🎯 Meta batida, ${nome}! Você é imparável hoje.`,
            `🔥 ${nome}, meta concluída! Que dia absurdo de foco.`,
            `🏆 Missão cumprida, ${nome}! Agora descansa ou vai além?`,
            `⚡ Meta no bolso, ${nome}! O ranking vai sentir isso.`,
        ]);
    }

    // QUASE NA META
    else if (quaseNaMeta && temMeta) {
        const faltaStr = formatarTempo(ctx.metaMin - ctx.estudadoHoje);
        frases.push(...[
            `💪 Quase lá, ${nome}! Faltam só ${faltaStr} pra bater a meta.`,
            `⚡ ${nome}, ${faltaStr} e você zera a meta hoje!`,
            `🎯 Reta final, ${nome}! ${faltaStr} de foco e acabou.`,
        ]);
    }

    // SEM ESTUDO + TEM META
    else if (semEstudo && temMeta && hora >= 12) {
        frases.push(...[
            `😴 Dia parado, ${nome}? A meta tá te esperando.`,
            `⏰ ${nome}, o dia tá passando e a meta tá zerada.`,
            `🧠 ${nome}, uma sessão rápida de foco já muda o dia.`,
        ]);
    }

    // STREAK
    if (streak >= 7) {
        frases.push(...[
            `🔥 ${streak} dias seguidos, ${nome}! Isso é consistência de verdade.`,
            `⚡ ${nome}, ${streak} dias sem parar. Você tá em chamas!`,
        ]);
    } else if (streak >= 3) {
        frases.push(`🔥 ${streak} dias seguidos, ${nome}! Não para agora.`);
    }

    // RANKING
    if (rank === 1) {
        frases.push(...[
            `👑 Líder do ranking, ${nome}! Defende o trono.`,
            `🏆 ${nome}, você tá no topo. Mas alguém tá de olho.`,
        ]);
    } else if (rank <= 3) {
        frases.push(`🥇 Top 3, ${nome}! O 1º lugar tá ao alcance.`);
    } else if (rank <= 10) {
        frases.push(`📈 Top 10, ${nome}! Você tá subindo forte.`);
    }

    // TAREFAS PENDENTES
    if (temTarefas) {
        frases.push(...[
            `📋 ${nome}, você tem ${ctx.tarefasPendentes} tarefa${ctx.tarefasPendentes > 1 ? 's' : ''} pendente${ctx.tarefasPendentes > 1 ? 's' : ''} hoje.`,
            `⏳ ${nome}, não deixa a agenda virar bola de neve.`,
        ]);
    }

    // XP MILESTONES
    if (xp >= 1000 && xp < 1100) {
        frases.push(`🎉 ${nome}, você passou de 1000 XP! Que evolução.`);
    } else if (xp >= 500 && xp < 600) {
        frases.push(`⚡ ${nome}, meio caminho andado pro Veterano!`);
    }

    // HORÁRIO DO DIA (fallback)
    if (hora >= 5 && hora < 12) {
        frases.push(...[
            `🌅 Bom dia, ${nome}! Quem começa cedo sai na frente.`,
            `☀️ ${nome}, a manhã é sua. Aproveita!`,
            `🧠 Bom dia, ${nome}! O cérebro tá fresco. Bora estudar.`,
        ]);
    } else if (hora >= 12 && hora < 18) {
        frases.push(...[
            `⚡ Boa tarde, ${nome}! Foco total agora.`,
            `📚 ${nome}, tarde produtiva começa com uma decisão.`,
            `🎯 ${nome}, a tarde é longa. Usa ela bem.`,
        ]);
    } else if (hora >= 18 && hora < 23) {
        frases.push(...[
            `🌙 Boa noite, ${nome}! Ainda dá tempo de estudar.`,
            `🔥 ${nome}, final de dia. Vai fechar com chave de ouro?`,
            `⭐ ${nome}, o dia não acabou ainda. Bora!`,
        ]);
    } else {
        frases.push(...[
            `🌙 ${nome}, você ainda tá aqui? Dedicação total!`,
            `🦉 Madrugada de estudos, ${nome}? Isso é nível elite.`,
        ]);
    }

    // Escolhe uma frase aleatória do banco gerado
    return frases[Math.floor(Math.random() * frases.length)];
}

const formatarTempo = (min) => {
    if (min <= 0) return '0min';
    if (min < 60) return min + 'min';
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? h + 'h ' + m + 'min' : h + 'h';
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Interface básica
    const nome = localStorage.getItem('dt_user_name') || "ESTUDANTE";
    const nomeDisplay = document.getElementById('user-display-name');
    if (nomeDisplay) nomeDisplay.innerText = nome.split(' ')[0].toUpperCase();

    const dataEl = document.getElementById('current-date');
    if (dataEl) dataEl.innerText = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

    // Frase simples enquanto carrega os dados
    const fraseEl = document.getElementById('frase-ia');
    if (fraseEl) fraseEl.innerText = '...';

    // 2. Status de Manutenção
    onSnapshot(doc(db, "config", "status_sistema"), (s) => {
        if (s.exists()) {
            const d = s.data();
            const telaM = document.getElementById('manutencao-screen');
            if (telaM) telaM.style.display = (d.emManutencao && emailLogado !== emailMestre) ? 'flex' : 'none';
        }
    });

    // 3. Busca de dados do usuário
    if (emailLogado) {
        try {
            const userSnap = await getDoc(doc(db, "notas", emailLogado));
            if (userSnap.exists()) {
                const dados = userSnap.data();
                const xp = dados.xp || 0;

                // XP display
                const xpDisplay = document.getElementById('xp-display');
                if (xpDisplay) xpDisplay.innerText = `+${xp} XP`;

                // Dados pra frase inteligente
                const historico = dados.historico_foco || [];
                const hoje = new Date().toISOString().split('T')[0];
                const estudadoHoje = historico.filter(s => s.data === hoje).reduce((a, s) => a + s.minutos, 0);
                const metaMin = dados.meta_minutos || 0;
                const pctMeta = metaMin > 0 ? Math.min(Math.round((estudadoHoje / metaMin) * 100), 100) : 0;

                // Streak
                let streak = 0;
                const dias = [...new Set(historico.map(s => s.data))].sort().reverse();
                let dCheck = new Date();
                for (const dia of dias) {
                    if (dia === dCheck.toISOString().split('T')[0]) { streak++; dCheck.setDate(dCheck.getDate() - 1); }
                    else break;
                }

                // Rank (busca posição no ranking)
                let rankPos = 999;
                try {
                    const rankSnap = await getDocs(collection(db, "notas"));
                    const todos = [];
                    rankSnap.forEach(d => { if (d.data().email) todos.push({ id: d.data().email.toLowerCase(), xp: d.data().xp || 0 }); });
                    todos.sort((a, b) => b.xp - a.xp);
                    const pos = todos.findIndex(u => u.id === emailLogado);
                    if (pos !== -1) rankPos = pos + 1;
                } catch(e) {}

                // Tarefas pendentes hoje (aproximação local)
                const tarefasPendentes = 0; // sem busca extra pro Firestore

                // Gera frase inteligente com contexto completo
                if (fraseEl) {
                    fraseEl.innerText = gerarFraseInteligente({
                        nome, metaMin, estudadoHoje, pctMeta,
                        streak, rankPos, xp, tarefasPendentes
                    });
                }

                // META DIÁRIA
                if (metaMin > 0) {
                    const section = document.getElementById('meta-progress-section');
                    if (section) section.style.display = 'block';

                    const fill = document.getElementById('meta-progress-fill');
                    const falta = metaMin - estudadoHoje;

                    document.getElementById('meta-progress-time').innerText = formatarTempo(estudadoHoje) + ' de ' + formatarTempo(metaMin);
                    document.getElementById('meta-progress-pct').innerText = pctMeta + '%';
                    if (fill) fill.style.width = pctMeta + '%';

                    if (pctMeta >= 100) {
                        if (fill) fill.classList.add('completa');
                        document.getElementById('meta-progress-falta').innerText = 'Meta batida! 🎉';
                        document.getElementById('meta-progress-falta').style.color = '#00c851';
                        const shareBtn = document.getElementById('meta-share-btn');
                        if (shareBtn) {
                            shareBtn.style.display = 'flex';
                            shareBtn.onclick = () => compartilharMeta(estudadoHoje, metaMin);
                        }
                    } else {
                        document.getElementById('meta-progress-falta').innerText = falta > 0 ? 'Faltam ' + formatarTempo(falta) : 'Bora estudar! 💪';
                        const shareBtn = document.getElementById('meta-share-btn');
                        if (shareBtn) shareBtn.style.display = 'none';
                    }
                }
            } else {
                // Sem dados — frase genérica por horário
                if (fraseEl) fraseEl.innerText = gerarFraseInteligente({ nome, metaMin: 0, estudadoHoje: 0, pctMeta: 0, streak: 0, rankPos: 999, xp: 0, tarefasPendentes: 0 });
            }
        } catch (e) {
            console.error(e);
            if (fraseEl) fraseEl.innerText = gerarFraseInteligente({ nome, metaMin: 0, estudadoHoje: 0, pctMeta: 0, streak: 0, rankPos: 999, xp: 0, tarefasPendentes: 0 });
        }
    } else {
        // Sem login — frase genérica
        if (fraseEl) fraseEl.innerText = gerarFraseInteligente({ nome, metaMin: 0, estudadoHoje: 0, pctMeta: 0, streak: 0, rankPos: 999, xp: 0, tarefasPendentes: 0 });
    }

    // 4. MURAL DINÂMICO
    onSnapshot(doc(db, "config", "mural"), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            const preview = document.getElementById('mural-preview');
            const cardMural = document.getElementById('btn-mural-main');
            const iconMural = cardMural?.querySelector('i[data-lucide="megaphone"]');
            const strongMural = cardMural?.querySelector('strong');

            const cores = {
                purple: { hex: "#8a2be2", shadow: "rgba(138,43,226,0.5)" },
                danger: { hex: "#ff3b30", shadow: "rgba(255,59,48,0.5)" },
                gold:   { hex: "#ffcc00", shadow: "rgba(255,204,0,0.5)" }
            };

            const corAtual = cores[d.cor] || cores.purple;
            if (preview) preview.innerText = d.texto;

            if (cardMural && d.texto !== "Nenhum aviso no momento.") {
                cardMural.classList.add('mural-animado');
                cardMural.style.setProperty('--glow-color', corAtual.shadow);
                cardMural.style.setProperty('--border-color', corAtual.hex);
                if (iconMural) iconMural.style.color = corAtual.hex;
                if (strongMural) strongMural.style.color = corAtual.hex;
            } else if (cardMural) {
                cardMural.classList.remove('mural-animado');
                cardMural.style.borderColor = "#1a1a1a";
                if (iconMural) iconMural.style.color = "#8a2be2";
                if (strongMural) strongMural.style.color = "white";
            }

            if (cardMural) {
                cardMural.onclick = () => {
                    const modal = document.getElementById('modal-mural');
                    const msg = document.getElementById('mural-msg');
                    if (modal && msg) {
                        msg.innerHTML = `
                            <p style="white-space:pre-wrap; word-break:break-word; color:#eee; line-height:1.6; text-align:left;">${d.texto}</p>
                            <div style="margin-top:25px; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px; text-align:right;">
                                <small style="color:${corAtual.hex}; font-weight:bold; text-transform:uppercase;">BY: ${d.autor}</small>
                            </div>
                        `;
                        modal.style.display = 'flex';
                    }
                };
            }
        }
    });

    if (window.lucide) lucide.createIcons();
});

// ==========================================
// COMPARTILHAR META BATIDA
// ==========================================
window.compartilharMeta = async function(estudadoHoje, metaMin) {
    const nome = localStorage.getItem('dt_user_name') || 'Estudante';
    const h = Math.floor(estudadoHoje / 60);
    const m = estudadoHoje % 60;
    const tempoStr = h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;

    let container = document.getElementById('meta-share-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'meta-share-container';
        container.style.cssText = 'position:fixed; left:-9999px; top:0;';
        document.body.appendChild(container);
    }

    container.innerHTML = `
        <div id="meta-card-vitoria" style="
            width:1080px; height:1920px; background:#060608;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            position:relative; overflow:hidden; font-family:'Inter',sans-serif;">
            <div style="position:absolute; width:700px; height:700px; background:radial-gradient(circle, rgba(138,43,226,0.3) 0%, transparent 70%); border-radius:50%; filter:blur(80px);"></div>
            <div style="position:absolute; top:10%; left:5%; width:400px; height:400px; background:radial-gradient(circle, rgba(138,43,226,0.15) 0%, transparent 70%); border-radius:50%; filter:blur(60px);"></div>
            <div style="position:absolute; bottom:10%; right:5%; width:350px; height:350px; background:radial-gradient(circle, rgba(138,43,226,0.15) 0%, transparent 70%); border-radius:50%; filter:blur(60px);"></div>
            <div style="position:relative; z-index:10; text-align:center; padding:80px;">
                <div style="font-size:120px; margin-bottom:40px;">🎯</div>
                <p style="font-size:32px; font-weight:800; letter-spacing:6px; color:#8a2be2; text-transform:uppercase; margin-bottom:20px;">META BATIDA</p>
                <h1 style="font-size:160px; font-weight:900; color:white; line-height:1; letter-spacing:-5px; margin-bottom:10px;">${tempoStr}</h1>
                <p style="font-size:36px; color:#555; font-weight:700; margin-bottom:60px;">de estudo hoje</p>
                <p style="font-size:40px; font-weight:900; color:white; margin-bottom:80px;">${nome.toUpperCase()}</p>
                <div style="width:200px; height:2px; background:rgba(138,43,226,0.3); margin:0 auto 80px;"></div>
                <div style="display:flex; align-items:center; justify-content:center; gap:20px;">
                    <div style="width:60px; height:60px; background:rgba(138,43,226,0.2); border-radius:50%; border:2px solid #8a2be2; display:flex; align-items:center; justify-content:center;">
                        <span style="font-size:30px;">🧠</span>
                    </div>
                    <div style="text-align:left;">
                        <p style="font-size:28px; font-weight:900; color:white; letter-spacing:2px;">HUB BRAIN</p>
                        <p style="font-size:20px; color:#555;">hubbrain.netlify.app</p>
                    </div>
                </div>
            </div>
        </div>`;

    if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    setTimeout(async () => {
        try {
            const canvas = await html2canvas(document.getElementById('meta-card-vitoria'), {
                backgroundColor: '#060608', width: 1080, height: 1920, scale: 1, useCORS: true
            });
            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'MetaBatida_HubBrain.png', { type: 'image/png' });
                if (navigator.share) {
                    await navigator.share({
                        title: 'Hub Brain',
                        text: `Bati minha meta de estudos hoje! ${tempoStr} de foco 🎯\n\nhttps://hubbrain.netlify.app`,
                        files: [file]
                    });
                } else {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'MetaBatida_HubBrain.png';
                    link.click();
                }
                container.innerHTML = '';
            });
        } catch(e) { console.error(e); }
    }, 300);
};
        
