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
        { ordem: "5ª Aula", inicio: "16:40" }, { ordem: "6ª Aula", inicio: "17:30" }
    ]
};

let diaAtualGrade = 'segunda';
let gradeHoraria = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [] };
let indexParaExcluir = null;
const userPhone = localStorage.getItem('dt_user_phone');

// --- INTERFACE ---
window.mostrarAvisoCustom = (msg) => {
    const toast = document.getElementById('custom-toast');
    if(toast) {
        document.getElementById('toast-message').innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
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
    if (userPhone) await carregarDadosNuvem();
    
    const dMap = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const d = dMap[new Date().getDay()];
    selecionarDia(d === 'domingo' || d === 'sabado' ? 'segunda' : d);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.init({ appId: "f73275cd-17ad-4963-a25b-321ce2def2ba" });
    });
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
});

async function carregarDadosNuvem() {
    try {
        const docSnap = await getDoc(doc(db, "grades_horarias", userPhone));
        if (docSnap.exists()) { 
            gradeHoraria = docSnap.data().grade; 
            renderizarAulas(); 
        }
    } catch (e) { console.error(e); }
}

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
        '<p style="text-align:center;color:#444;margin-top:50px;">Nenhuma aula para hoje.</p>' :
        aulas.map((a, i) => `
            <div class="card-aula">
                <div class="aula-tempo"><span style="font-size:10px; display:block; color:#8a2be2;">${a.ordem}</span>${a.hora}</div>
                <div class="aula-info"><b>${a.materia}</b><span>${a.prof || 'Sem prof.'}</span></div>
                <button class="btn-deletar-aula" onclick="abrirConfirmExcluir(${i})">X</button>
            </div>
        `).join('');
};

window.abrirModalAula = async () => {
    document.getElementById('aula-prof').value = "";
    document.getElementById('modal-aula').style.display = 'flex';
};

window.salvarAula = async () => {
    const turno = document.getElementById('aula-turno').value;
    const nAula = document.getElementById('aula-numero').value;
    const matSelect = document.getElementById('aula-materia-select').value;
    const matCustom = document.getElementById('aula-materia-custom').value.trim();
    const prof = document.getElementById('aula-prof').value.trim();
    const materiaFinal = matSelect || matCustom;
    
    if(!materiaFinal) return window.mostrarAvisoCustom("⚠️ Nome da matéria?");

    const info = TABELA_HORARIOS[turno][nAula];
    if(!gradeHoraria[diaAtualGrade]) gradeHoraria[diaAtualGrade] = [];
    gradeHoraria[diaAtualGrade].push({ ordem: info.ordem, materia: materiaFinal, hora: info.inicio, prof: prof });

    // TENTAR ENVIAR E MOSTRAR O ERRO SE HOUVER
    await enviarNotificacaoTest(materiaFinal);

    renderizarAulas();
    fecharModalAula();
    if(userPhone) {
        localStorage.setItem('hub_brain_grade', JSON.stringify(gradeHoraria));
        await setDoc(doc(db, "grades_horarias", userPhone), { grade: gradeHoraria });
    }
};

async function enviarNotificacaoTest(materia) {
    const appId = "f73275cd-17ad-4963-a25b-321ce2def2ba";
    const restKey = "Os_v2_app_64zhltixvvewhis3gioofxxsxjhcx5vbfocu4s4wq2rrsaus7edduivp3y26x4fv2qqoncgssgmitrrakiwiqog2afgj6hsxwugaeay";

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json; charset=utf-8", 
                "Authorization": `Basic ${restKey}` 
            },
            body: JSON.stringify({
                app_id: appId,
                contents: { "pt": `Aula de ${materia} salva!` },
                included_segments: ["Total Subscriptions"]
            })
        });

        const resData = await response.json();
        if (resData.id) {
            window.mostrarAvisoCustom("✅ SINAL ENVIADO AO ONESIGNAL!");
        } else {
            // Isso vai aparecer no seu celular se o OneSignal recusar a chave
            alert("Erro OneSignal: " + (resData.errors ? resData.errors[0] : "Chave Inválida"));
        }
    } catch (e) {
        window.mostrarAvisoCustom("❌ Erro de Rede: O Chrome bloqueou o sinal.");
    }
}

window.ativarNotificacoesReal = () => {
    OneSignalDeferred.push(function(OneSignal) {
        OneSignal.Notifications.requestPermission();
    });
};
