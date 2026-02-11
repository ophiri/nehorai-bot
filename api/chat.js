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

    // Origin check
    if (!ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({ error: 'Unauthorized origin' });
    }

    try {
        const { messages, model, max_tokens, temperature } = req.body;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
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
