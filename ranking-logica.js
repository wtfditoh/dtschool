import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const userPhone = localStorage.getItem('dt_user_phone');

// 1. CARREGAR O RANKING GERAL
export async function carregarRankingReal() {
    const listaGeral = document.getElementById('lista-ranking-geral');
    const podioContainer = document.getElementById('podio-container');
    if (!listaGeral || !podioContainer) return;

    listaGeral.innerHTML = "<p style='text-align:center; opacity:0.5;'>Buscando campeões...</p>";

    try {
        const q = query(collection(db, "usuarios"), orderBy("pontos", "desc"), limit(20));
        const snap = await getDocs(q);
        
        let users = [];
        snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

        podioContainer.innerHTML = "";
        listaGeral.innerHTML = "";

        users.forEach((user, index) => {
            const pos = index + 1;
            const nome = user.nome || "Estudante";
            const pontos = user.pontos || 0;

            if (pos <= 3) {
                podioContainer.innerHTML += `
                    <div class="podio-item pos-${pos}">
                        <div style="font-size: 24px;">${pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}</div>
                        <div style="font-weight:bold; font-size:12px; margin-top:5px; color:white;">${nome.split(' ')[0]}</div>
                        <div style="color:#8a2be2; font-size:11px;">${pontos} XP</div>
                    </div>
                `;
            } else {
                listaGeral.innerHTML += `
                    <div class="card-rank">
                        <span class="rank-num">${pos}</span>
                        <span class="rank-name">${nome}</span>
                        <span class="rank-score">${pontos}<span>XP</span></span>
                    </div>
                `;
            }
        });
    } catch (e) {
        console.error("Erro no ranking:", e);
        listaGeral.innerHTML = "<p>Erro ao carregar dados.</p>";
    }
}

// 2. CARREGAR DADOS DO PERFIL (POSIÇÃO E XP)
export async function carregarDadosPessoaisRanking() {
    if (!userPhone) return;

    try {
        const q = query(collection(db, "usuarios"), orderBy("pontos", "desc"));
        const snap = await getDocs(q);
        
        let rankingGeral = [];
        snap.forEach(d => rankingGeral.push({ id: d.id, ...d.data() }));

        const index = rankingGeral.findIndex(u => u.id === userPhone);
        const dadosUser = rankingGeral[index] || { nome: "", pontos: 0 };

        if (document.getElementById('input-nome-usuario')) {
            document.getElementById('input-nome-usuario').value = dadosUser.nome || "";
            document.getElementById('user-rank-xp').innerText = dadosUser.pontos || 0;
            document.getElementById('user-rank-pos').innerText = index !== -1 ? `#${index + 1}` : "--";
        }
    } catch (e) {
        console.error("Erro ao carregar perfil:", e);
    }
}

// 3. SALVAR NOME
export async function salvarNomePerfil() {
    const novoNome = document.getElementById('input-nome-usuario').value.trim();
    if (!novoNome || !userPhone) return alert("Digite um nome válido!");

    try {
        await setDoc(doc(db, "usuarios", userPhone), { nome: novoNome }, { merge: true });
        alert("Nome atualizado com sucesso!");
        carregarDadosPessoaisRanking();
    } catch (e) {
        alert("Erro ao salvar nome.");
    }
}

// --- ESSENCIAL: EXPOR PARA O WINDOW (PARA OS BOTÕES FUNCIONAREM) ---
window.carregarRankingReal = carregarRankingReal;
window.carregarDadosPessoaisRanking = carregarDadosPessoaisRanking;
window.salvarNomePerfil = salvarNomePerfil;
