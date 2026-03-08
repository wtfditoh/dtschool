import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const TABELA_HORARIOS = {
    matutino: [
        { ordem: "1ª Aula", inicio: "07:00" }, { ordem: "2ª Aula", inicio: "07:50" },
        { ordem: "3ª Aula", inicio: "08:40" }, { ordem: "4ª Aula", inicio: "09:50" },
        { ordem: "5ª Aula", inicio: "10:40" }, { ordem: "6ª Aula", inicio: "11:30" }
    ],
    vespertino: [
        { ordem: "1ª Aula", inicio: "13:00" }, { ordem: "2ª Aula", inicio: "13:50" },
        { ordem: "3ª Aula", inicio: "14:40" }, { ordem: "4ª Aula", inicio: "15:50" },
        { ordem: "5ª Aula", inicio: "16:40" }, { ordem: "17:30", inicio: "17:30" }
    ]
};

let diaAtualGrade = 'segunda';
let gradeHoraria = { domingo: [], segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [] };
let indexParaExcluir = null;

const userId = localStorage.getItem('dt_user_email') || localStorage.getItem('dt_user_phone');

// --- INTERFACE (MODAIS E AVISOS) ---
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

window.abrirAjudaBateria = () => { document.getElementById('modal-ajuda-bateria').style.display = 'flex'; };
window.fecharAjudaBateria = () => { document.getElementById('modal-ajuda-bateria').style.display = 'none'; };
window.fecharModalAula = () => { document.getElementById('modal-aula').style.display = 'none'; };
window.fecharModalExcluir = () => { document.getElementById('modal-confirm-excluir').style.display = 'none'; };

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const local = localStorage.getItem('hub_brain_grade');
    if (local) { gradeHoraria = JSON.parse(local); renderizarAulas(); }
    if (userId) await carregarDadosNuvem();
    
    const dMap = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const hoje = dMap[new Date().getDay()];
    selecionarDia(hoje);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.init({ appId: "f73275cd-17ad-4963-a25b-321ce2def2ba" });
    });
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

// --- FIREBASE ---
async function carregarDadosNuvem() {
    try {
        const docSnap = await getDoc(doc(db, "grades_horarias", userId));
        if (docSnap.exists()) { 
            const data = docSnap.data();
            // Faz o merge com a estrutura inicial para não dar erro se faltar um dia
            gradeHoraria = { ...gradeHoraria, ...data.grade }; 
            if(data.whatsapp) localStorage.setItem('hub_brain_zap', data.whatsapp);
            localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
            renderizarAulas(); 
        }
    } catch (e) { console.error(e); }
}

// --- LÓGICA DA GRADE ---
window.selecionarDia = (dia) => {
    diaAtualGrade = dia;
    document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-dia') === dia));
    renderizarAulas();
};

window.renderizarAulas = () => {
    const lista = document.getElementById('lista-aulas');
    if(!lista) return;
    const aulas = gradeHoraria[diaAtualGrade] || [];
    aulas.sort((a, b) => a.hora.localeCompare(b.hora));

    lista.innerHTML = aulas.length === 0 ? 
        `<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula para ${diaAtualGrade}.</p>` :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo">
                    <span style="font-size:10px; display:block; color:#8a2be2; font-weight:bold;">${a.ordem}</span>
                    ${a.hora}
                </div>
                <div class="aula-info">
                    <b>${a.materia}</b>
                    <span><i data-lucide="user" style="width:12px;"></i> ${a.prof || 'Sem prof.'}</span>
                </div>
                <button class="btn-deletar-aula" onclick="abrirConfirmExcluir(${i})">
                    <i data-lucide="trash-2" style="width:18px;"></i>
                </button>
            </div>
        `).join('');
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

// --- MODAL DE AULA ---
window.abrirModalAula = async () => {
    document.getElementById('aula-prof').value = "";
    document.getElementById('aula-materia-custom').value = "";
    
    const zapSalvo = localStorage.getItem('hub_brain_zap');
    if(zapSalvo) {
        document.getElementById('aula-zap').value = zapSalvo.replace('55', '');
    }

    const selectMat = document.getElementById('aula-materia-select');
    selectMat.innerHTML = '<option value="">Carregando matérias...</option>';
    document.getElementById('modal-aula').style.display = 'flex';

    try {
        const docSnap = await getDoc(doc(db, "notas", userId));
        let materias = [];
        if (docSnap.exists()) materias = docSnap.data().materias || [];
        
        selectMat.innerHTML = '<option value="">Selecionar...</option>';
        materias.forEach(m => {
            const nome = m.nome || m;
            const opt = document.createElement('option');
            opt.value = nome; opt.textContent = nome;
            selectMat.appendChild(opt);
        });
    } catch (e) { selectMat.innerHTML = '<option value="">Erro ao carregar</option>'; }
};

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const prof = document.getElementById('aula-prof').value.trim();
    const zapRaw = document.getElementById('aula-zap').value.trim();
    
    const materiaFinal = matSelect || matCustom;
    
    if(!materiaFinal || !zapRaw) {
        window.mostrarAvisoCustom("⚠️ Preencha a matéria e o Zap!");
        return;
    }

    let zapFinal = zapRaw.replace(/\D/g, '');
    if(!zapFinal.startsWith('55')) zapFinal = '55' + zapFinal;

    const infoHorario = TABELA_HORARIOS[turno][nAula];
    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    
    gradeHoraria[diaAtualGrade].push({ 
        ordem: infoHorario.ordem, materia: materiaFinal, hora: infoHorario.inicio, prof: prof 
    });

    enviarAlertaOneSignal(materiaFinal);
    renderizarAulas();
    fecharModalAula();
    
    if(userId) {
        localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
        localStorage.setItem('hub_brain_zap', zapFinal);
        
        await setDoc(doc(db, "grades_horarias", userId), { 
            grade: gradeHoraria, 
            whatsapp: zapFinal,
            atualizadoEm: Date.now() 
        }, { merge: true });
    }
    window.mostrarAvisoCustom("🚀 Aula e Alerta de Zap salvos!");
};

// --- ONESIGNAL ---
async function enviarAlertaOneSignal(materia) {
    const appId = "f73275cd-17ad-4963-a25b-321ce2def2ba";
    const restKey = "Os_v2_app_64zhltixvvewhis3gioofxxsxjhcx5vbfocu4s4wq2rrsaus7edduivp3y26x4fv2qqoncgssgmitrrakiwiqog2afgj6hsxwugaeay";

    try {
        fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": "Basic " + restKey 
            },
            body: JSON.stringify({
                app_id: appId,
                contents: { "pt": `Aula de ${materia} salva! 🧠` },
                included_segments: ["Total Subscriptions"]
            })
        });
    } catch (e) { console.warn("Erro ao enviar sinal."); }
}

window.abrirConfirmExcluir = (i) => { 
    indexParaExcluir = i; 
    document.getElementById('modal-confirm-excluir').style.display = 'flex'; 
};

document.getElementById('btn-confirmar-delete').onclick = async () => {
    gradeHoraria[diaAtualGrade].splice(indexParaExcluir, 1);
    renderizarAulas();
    if(userId) {
        localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
        const zap = localStorage.getItem('hub_brain_zap');
        await setDoc(doc(db, "grades_horarias", userId), { 
            grade: gradeHoraria,
            whatsapp: zap 
        }, { merge: true });
    }
    fecharModalExcluir();
};

window.ativarNotificacoesReal = () => {
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.Notifications.requestPermission();
    });
};
