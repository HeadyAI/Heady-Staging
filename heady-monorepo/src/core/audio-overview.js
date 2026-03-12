/**
 * ∞ Audio Overview — Heady™ Audio Generation Module
 *
 * Generates narration scripts and audio overviews for Heady™ system state,
 * session summaries, and project status reports.
 * Integrates with TTS providers when available.
 *
 * © 2026 Heady™Systems Inc. All rights reserved.
 */

const logger = (() => {
    try { return require('../utils/logger').child('audio-overview'); }
    catch (_e) { return { info: () => {}, warn: () => {}, error: () => {} }; }
})();

// ── Script Templates ──────────────────────────────────────────

const SCRIPT_TEMPLATES = {
    session: (ctx = {}) => `
Heady session overview for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
${ctx.title ? `Today's focus: ${ctx.title}.` : 'System is operating normally.'}
${ctx.tasks?.length ? `${ctx.tasks.length} tasks in queue.` : ''}
${ctx.summary || ''}
    `.trim(),

    system: (ctx = {}) => `
Heady system status report.
Uptime: ${Math.round((process.uptime() || 0) / 60)} minutes.
${ctx.nodes?.length ? `Active nodes: ${ctx.nodes.length}.` : 'All nodes operational.'}
${ctx.alerts?.length ? `Alerts: ${ctx.alerts.map(a => a.message || a).join(', ')}.` : 'No active alerts.'}
    `.trim(),

    project: (ctx = {}) => `
Heady project overview.
${ctx.name ? `Project: ${ctx.name}.` : ''}
${ctx.description ? ctx.description : ''}
${ctx.version ? `Version: ${ctx.version}.` : ''}
    `.trim(),
};

/**
 * Generate a narration script for a given context.
 * @param {Object} [context] - Context data for the script
 * @param {string} [context.type] - Script type: 'session' | 'system' | 'project'
 * @returns {string} Narration script
 */
function generateOverviewScript(context = {}) {
    const type = context.type || 'session';
    const template = SCRIPT_TEMPLATES[type] || SCRIPT_TEMPLATES.session;
    try {
        return template(context);
    } catch (err) {
        logger.warn('audio-overview: script generation error:', err.message);
        return `Heady audio overview. ${new Date().toISOString()}`;
    }
}

/**
 * Synthesize audio from text using available TTS providers.
 * @param {string} text - Text to synthesize
 * @param {Object} [options] - TTS options
 * @param {string} [options.voice] - Voice name
 * @param {string} [options.format] - Output format (mp3, wav, ogg)
 * @returns {Promise<Buffer|null>} Audio buffer or null if TTS unavailable
 */
async function textToSpeech(text, options = {}) {
    // Try each available TTS provider
    const providers = [
        // ElevenLabs
        async () => {
            const key = process.env.ELEVENLABS_API_KEY;
            if (!key) return null;
            const https = require('https');
            const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
            return new Promise((resolve) => {
                const body = JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } });
                const req = https.request({
                    hostname: 'api.elevenlabs.io',
                    path: `/v1/text-to-speech/${voiceId}`,
                    method: 'POST',
                    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
                }, (res) => {
                    const chunks = [];
                    res.on('data', c => chunks.push(c));
                    res.on('end', () => resolve(res.statusCode === 200 ? Buffer.concat(chunks) : null));
                });
                req.on('error', () => resolve(null));
                req.write(body);
                req.end();
            });
        },
    ];

    for (const provider of providers) {
        try {
            const result = await provider();
            if (result) return result;
        } catch (_e) { /* try next */ }
    }

    logger.info('audio-overview: no TTS provider available, returning null');
    return null;
}

/**
 * Generate a full audio overview for a context.
 * @param {Object} [context]
 * @returns {Promise<{script: string, audio: Buffer|null}>}
 */
async function generateAudioOverview(context = {}) {
    const script = generateOverviewScript(context);
    const audio = await textToSpeech(script, context.ttsOptions || {});
    return { script, audio, ts: new Date().toISOString() };
}

module.exports = {
    generateOverviewScript,
    textToSpeech,
    generateAudioOverview,
};
