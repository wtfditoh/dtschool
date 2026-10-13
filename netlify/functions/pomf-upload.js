/**
 * Netlify Function: proxy para o Pomf.lain.la
 * URL: /.netlify/functions/pomf-upload   (POST)
 */

const POMF_URL = 'https://pomf.lain.la/upload.php';
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

        // Monta o FormData pro Pomf
        const fd = new FormData();
        const blob = new Blob([bodyBuffer], { type: contentType });
        fd.append('files[]', blob, 'arquivo');

        const r = await fetch(POMF_URL, {
            method: 'POST',
            body: fd,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const texto = await r.text();

        return {
            statusCode: r.status,
            headers: { ...headers, 'Content-Type': 'text/plain' },
            body: texto
        };
    } catch (e) {
        console.error('[pomf-upload]', e);
        return {
            statusCode: 502,
            headers,
            body: 'Falha ao falar com o Pomf: ' + (e.message || 'erro')
        };
    }
};
