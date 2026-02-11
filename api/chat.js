// ============================================================
//  Nahorai Bot — API Proxy (Vercel Serverless Function)
//  Your OpenAI key is stored as a Vercel environment variable
//  and never exposed to the frontend.
// ============================================================

const ALLOWED_ORIGINS = [
    'https://nehorai-bot.vercel.app',
    'https://ophiri.github.io',
    'http://localhost:3000',
    'http://localhost:3939',
];

module.exports = async function handler(req, res) {
    const origin = req.headers.origin || '';

    // CORS headers
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Origin check — allow same-origin (empty origin) and whitelisted origins
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({ error: 'Unauthorized origin' });
    }

    try {
        const { messages, max_tokens, temperature } = req.body;

        // Azure OpenAI endpoint
        const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://ophir-open-ai.openai.azure.com';
        const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini';
        const API_VERSION = '2024-08-01-preview';

        const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.AZURE_OPENAI_KEY,
            },
            body: JSON.stringify({
                messages: messages || [],
                max_tokens: Math.min(max_tokens || 500, 1000),
                temperature: temperature ?? 0.9,
            }),
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
