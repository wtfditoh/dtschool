/* offline-queue.js — fila de itens pra sincronizar quando voltar a net.
   Guarda no IndexedDB. Suporta tarefas e conteúdos (com blobs de arquivo). */

const DB_NAME = 'hubbrain-offline';
const DB_VERSION = 1;
const STORE = 'fila';

function abrirDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function transacao(modo, fn) {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, modo);
        const store = tx.objectStore(STORE);
        const resultado = fn(store);
        tx.oncomplete = () => resolve(resultado);
        tx.onerror = () => reject(tx.error);
    });
}

function gerarId() {
    return 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

export async function adicionar(item) {
    const registro = {
        id: gerarId(),
        tipo: item.tipo,
        dados: item.dados || {},
        arquivos: item.arquivos || [],
        criadoEm: Date.now()
    };
    await transacao('readwrite', (store) => store.put(registro));
    notificarMudanca();
    return registro.id;
}

export async function listar() {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await abrirDB();
            const tx = db.transaction(STORE, 'readonly');
            const store = tx.objectStore(STORE);
            const req = store.getAll();
            req.onsuccess = () => {
                const arr = (req.result || []).sort((a, b) => a.criadoEm - b.criadoEm);
                resolve(arr);
            };
            req.onerror = () => reject(req.error);
        } catch (e) { reject(e); }
    });
}

export async function contar() {
    try {
        const arr = await listar();
        return arr.length;
    } catch (e) { return 0; }
}

export async function remover(id) {
    await transacao('readwrite', (store) => store.delete(id));
    notificarMudanca();
}

export async function limpar() {
    await transacao('readwrite', (store) => store.clear());
    notificarMudanca();
}

let processando = false;

export async function processar({ processarTarefa, processarConteudo } = {}) {
    if (processando) return { ok: 0, falha: 0 };
    if (!navigator.onLine) return { ok: 0, falha: 0 };

    processando = true;
    let ok = 0, falha = 0;
    const erros = [];

    try {
        const itens = await listar();

        for (const item of itens) {
            try {
                if (item.tipo === 'tarefa' && processarTarefa) {
                    await processarTarefa(item.dados);
                } else if (item.tipo === 'conteudo' && processarConteudo) {
                    await processarConteudo(item.dados, item.arquivos);
                }
                await remover(item.id);
                ok++;
            } catch (e) {
                console.warn('[offline] falha ao sincronizar item:', e);
                falha++;
                erros.push(e && e.message);
            }
        }
    } finally {
        processando = false;
    }

    return { ok, falha, erros };
}

function notificarMudanca() {
    window.dispatchEvent(new CustomEvent('hb-fila-mudou'));
}

export function registrarAutoSync(callbacks) {
    window.addEventListener('online', async () => {
        const total = await contar();
        if (total > 0) {
            console.log('[offline] voltou online com', total, 'itens na fila');
            await processar(callbacks);
            window.dispatchEvent(new CustomEvent('hb-fila-sincronizada'));
        }
    });
}

export const estaOnline = () => navigator.onLine;
