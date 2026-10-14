/**
 * Netlify Function: proxy pro 0x0.st
 * URL: /.netlify/functions/arquivo-upload   (POST)
 */

const UP_URL = 'https://0x0.st';
const MAX_BYTES = 100 * 1024 * 1024; // 100MB

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Nome-Arquivo',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Use POST' };
    }

    try {
        const contentType = event.headers['content-type'] || 'application/octet-stream';
        // Nome original vem no header custom (0x0.st precisa da extensão pra servir certo)
        let nome = event.headers['x-nome-arquivo'] || 'arquivo.bin';
        try { nome = decodeURIComponent(nome); } catch (e) {}

        const bodyBuffer = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64')
            : Buffer.from(event.body || '', 'binary');

        if (!bodyBuffer || bodyBuffer.length === 0) {
            return { statusCode: 400, headers, body: 'Arquivo vazio' };
        }
        if (bodyBuffer.length > MAX_BYTES) {
            return { statusCode: 413, headers, body: 'Arquivo grande demais (limite 100MB)' };
        }

        const fd = new FormData();
        const blob = new Blob([bodyBuffer], { type: contentType });
        fd.append('file', blob, nome);

        const r = await fetch(UP_URL, {
            method: 'POST',
            body: fd,
            headers: {
                // 0x0.st EXIGE um User-Agent que NÃO seja de navegador.
                // Tem que identificar o app.
                'User-Agent': 'HubBrain/1.0 (+https://hubbrain.netlify.app)'
            }
        });

        const texto = await r.text();

        return {
            statusCode: r.status,
            headers: { ...headers, 'Content-Type': 'text/plain' },
            body: texto
        };
    } catch (e) {
        console.error('[arquivo-upload]', e);
        return {
            statusCode: 502,
            headers,
            body: 'Falha ao falar com 0x0.st: ' + (e.message || 'erro')
        };
    }
};
