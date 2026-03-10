import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... sua config do firebase ...

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Busca os dados do aluno no Firestore
        onSnapshot(doc(db, "notas", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                document.getElementById('user-display-name').innerText = dados.nome || "ALUNO";
                document.getElementById('user-xp').innerText = dados.xp || 0;
                document.getElementById('user-mats').innerText = dados.materias?.length || 0;
            }
        });
    } else {
        window.location.href = "login.html";
    }
});

document.getElementById('logout-btn').onclick = () => signOut(auth);
if(window.lucide) lucide.createIcons();
