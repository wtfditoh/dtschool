// netlify/functions/arquivo-upload.js
const GOFILE_SERVER_API = 'https://api.gofile.io/servers';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Use POST' };
    }

    try {
        // Descobre qual servidor de upload usar
        const serverRes = await fetch(GOFILE_SERVER_API);
        const serverData = await serverRes.json();
        if (serverData.status !== 'ok' || !serverData.data.servers.length) {
            throw new Error('Não foi possível obter um servidor do GoFile.');
        }
        const uploadServer = serverData.data.servers[0].name;
        const uploadUrl = `https://${uploadServer}.gofile.io/uploadFile`;

        // Repassa o arquivo que veio do seu app
        const fileBuffer = Buffer.from(event.body, 'binary');
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]), 'arquivo');

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        const result = await uploadRes.json();

        if (result.status !== 'ok' || !result.data || !result.data.downloadPage) {
            throw new Error('Falha no upload para o GoFile.');
        }

        // Retorna apenas a URL direta do arquivo
        return {
            statusCode: 200,
            body: result.data.downloadPage,
        };

    } catch (error) {
        console.error('[GoFile Proxy]', error);
        return {
            statusCode: 500,
            body: `Erro no proxy: ${error.message}`,
        };
    }
};
