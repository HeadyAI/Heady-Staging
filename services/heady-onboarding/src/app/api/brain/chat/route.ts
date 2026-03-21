import { NextRequest, NextResponse } from 'next/server';

// Heady CORS whitelist — mirrors shared/cors-config.js
const HEADY_ALLOWED_ORIGINS = new Set([
    'https://headyme.com', 'https://www.headyme.com',
    'https://headysystems.com', 'https://www.headysystems.com',
    'https://heady-ai.com', 'https://www.heady-ai.com',
    'https://headybuddy.com', 'https://www.headybuddy.com',
    'https://headybuddy.org', 'https://www.headybuddy.org',
    'https://headymcp.com', 'https://www.headymcp.com',
    'https://headyio.com', 'https://www.headyio.com',
    'https://headybot.com', 'https://www.headybot.com',
    'https://headyapi.com', 'https://www.headyapi.com',
    'https://headylens.com', 'https://www.headylens.com',
    'https://headyfinance.com', 'https://www.headyfinance.com',
    'https://headyconnection.org', 'https://www.headyconnection.org',
    'https://headyconnection.com', 'https://www.headyconnection.com',
    'https://admin.headysystems.com',
]);
function getAllowedOrigin(origin: string | null): string {
    return origin && HEADY_ALLOWED_ORIGINS.has(origin) ? origin : 'null';
}

const PHI = 1.6180339887;

/** HeadyBrain Chat API — serves buddy widget across all Heady sites */
const SYSTEM_PROMPT = `You are HeadyBrain, the AI reasoning engine powering the Heady ecosystem.
You are warm, concise, and technically knowledgeable. You help users with:
- Heady platform questions (HeadySystems, HeadyConnection, HeadyMe)
- AI/ML concepts, Sacred Geometry architecture, vector memory
- Onboarding, account setup, and platform navigation
Keep responses under 150 words unless asked for detail.`;

const FALLBACK_RESPONSES: Record<string, string> = {
    hello: "Hey! 👋 I'm HeadyBrain. I power the Heady™ AI ecosystem — ask me anything about Heady™Systems, your account, or how our Sacred Geometry architecture works.",
    help: "I can help with: 🧠 Platform overview • 🔐 Account & auth • 🌀 Sacred Geometry architecture • 📊 Vector memory • 🤖 AI provider routing • 🚀 Getting started with Heady™.",
    default: "Great question! I'm processing that through the Heady™ reasoning pipeline. Our phi-scaled architecture ensures optimal response quality. What specific aspect would you like me to elaborate on?",
};

function getSmartResponse(message: string): string {
    const lower = message.toLowerCase().trim();
    if (lower.match(/^(hi|hello|hey|greetings)/)) return FALLBACK_RESPONSES.hello;
    if (lower.match(/^(help|what can you|how do i)/)) return FALLBACK_RESPONSES.help;
    if (lower.match(/sacred geometry|phi|golden ratio/)) {
        return `Sacred Geometry is the mathematical foundation of Heady™. We use φ = ${PHI} (the golden ratio) to scale everything — resource allocation (61.8%/38.2%), cache TTLs, batch sizes (Fibonacci sequence), and UI spacing. It creates naturally balanced, harmonious system behavior.`;
    }
    if (lower.match(/vector|memory|embedding/)) {
        return "Heady uses 384-dimensional vector memory powered by all-MiniLM-L6-v2 embeddings. Your conversations, preferences, and context are stored as geometric projections in 3D vector space — enabling semantic search, context continuity, and personalized AI responses across all Heady services.";
    }
    if (lower.match(/csl|continuous semantic/)) {
        return "Continuous Semantic Logic (CSL) replaces binary true/false with geometric operations in high-dimensional space. AND = cosine similarity, OR = normalized sum, NOT = orthogonal rejection (Widdows 2003). Every decision in Heady flows through CSL gates for nuanced, confidence-weighted reasoning.";
    }
    if (lower.match(/auth|login|sign in|provider/)) {
        return "Heady supports 27 OAuth providers: Google, Apple, GitHub, Microsoft, Discord, X/Twitter, Slack, LinkedIn, Spotify, Twitch, Dropbox, Facebook, Amazon, Notion, Figma, GitLab, Bitbucket, Atlassian, Zoom, Okta, Auth0, Azure AD, OneLogin, LINE, Kakao, Naver, and Coinbase. Sign in at headyme.com/login.";
    }
    if (lower.match(/who|what is heady|about/)) {
        return "Heady is an AI-native operating system built on Continuous Semantic Logic, Sacred Geometry mathematics, and 384D vector memory. It orchestrates 20 specialized AI nodes across 17 swarm patterns, serving enterprises through headyme.com, headysystems.com, and headyconnection.org. Founded by Eric Hughes.";
    }
    return FALLBACK_RESPONSES.default;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const message = body.message || body.text || '';

        // Try HuggingFace Inference API as primary provider
        let aiResponse: string | null = null;
        try {
            const hfRes = await fetch('https://router.huggingface.co/novita/v3/openai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'Qwen/Qwen3-4B',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...(body.history || []).slice(-4).map((m: any) => ({
                            role: m.role || 'user',
                            content: m.content || m.text || '',
                        })),
                        { role: 'user', content: message },
                    ],
                    max_tokens: 512,
                    temperature: 0.7,
                }),
                signal: AbortSignal.timeout(10000),
            });

            if (hfRes.ok) {
                const hfData = await hfRes.json();
                aiResponse = hfData?.choices?.[0]?.message?.content || null;
            }
        } catch {
            // HuggingFace fallback failed, use smart responses
        }

        const response = aiResponse || getSmartResponse(message);

        return NextResponse.json(
            {
                response,
                status: 'done',
                confirmed: true,
                provider: aiResponse ? 'huggingface-qwen3' : 'heady-local',
                timestamp: new Date().toISOString(),
                phi: PHI,
            },
            {
                headers: {
                    'Access-Control-Allow-Origin': getAllowedOrigin(request.headers.get('origin')),
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-Device, X-Heady-Workspace',
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            { response: 'HeadyBrain is processing your request. Please try again.', status: 'error' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': getAllowedOrigin(request.headers.get('origin')) } }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': getAllowedOrigin(request.headers.get('origin')),
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-Device, X-Heady-Workspace',
        },
    });
}
