// netlify/functions/catbox-upload.js
exports.handler = async (event) => {
    // Permite que o seu site acesse esta função
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const CATBOX_URL = 'https://catbox.moe/user/api.php';
        
        // Repassa o corpo da requisição (o arquivo) para o catbox
        const response = await fetch(CATBOX_URL, {
            method: 'POST',
            headers: {
                'Content-Type': event.headers['content-type'] || 'application/octet-stream'
            },
            body: event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
        });

        const url = await response.text();

        return {
            statusCode: response.status,
            headers: { ...headers, 'Content-Type': 'text/plain' },
            body: url
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
