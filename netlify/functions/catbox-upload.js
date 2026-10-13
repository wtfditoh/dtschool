/**
 * Netlify Function: proxy para o catbox.moe
 * URL: /.netlify/functions/catbox-upload   (POST)
 * O catbox bloqueia uploads direto do navegador (CORS) e de servidores sem User-Agent.
 * Esta função recebe o arquivo e repassa pro catbox no servidor, "disfarçado" de navegador.
 */

const CATBOX_URL = 'https://catbox.moe/user/api.php';
const MAX_BYTES = 100 * 1024 * 1024; // 100MB

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
        const bodyBuffer = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64')
            : Buffer.from(event.body || '', 'binary');

        if (!bodyBuffer || bodyBuffer.length === 0) {
            return { statusCode: 400, headers, body: 'Arquivo vazio' };
        }
        if (bodyBuffer.length > MAX_BYTES) {
            return { statusCode: 413, headers, body: 'Arquivo grande demais (limite 100MB)' };
        }

        // Monta o FormData pro catbox
        const fd = new FormData();
        fd.append('reqtype', 'fileupload');
        const blob = new Blob([bodyBuffer], { type: contentType });
        // O nome do arquivo não importa muito para o catbox, mas é bom ter um.
        fd.append('fileToUpload', blob, 'arquivo');

        // 👇 A CORREÇÃO: Adiciona um User-Agent de navegador real
        const catboxResponse = await fetch(CATBOX_URL, {
            method: 'POST',
            body: fd,
            headers: {
                // Simula um navegador real para evitar o bloqueio
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const texto = await catboxResponse.text();

        return {
            statusCode: catboxResponse.status,
            headers: { ...headers, 'Content-Type': 'text/plain' },
            body: texto
        };
    } catch (e) {
        console.error('[catbox-upload]', e);
        return {
            statusCode: 502,
            headers,
            body: 'Falha ao falar com o catbox: ' + (e.message || 'erro')
        };
    }
};
