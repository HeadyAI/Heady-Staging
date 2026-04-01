// HEADY_BRAND:BEGIN
// FILE: services/headybuddy/index.js
// LAYER: services
// HEADY_BRAND:END
/**
 * HeadyBuddy Omnichannel Service — REST module providing conversational
 * interfaces for Slack webhooks, Obsidian Vault sync, and the Overwhelm
 * Protocol. Anchored onto heady-manager.js backbone port 3300.
 *
 * Endpoints:
 *   POST /webhook/slack    — Slack event/command webhook
 *   POST /webhook/obsidian — Obsidian Vault memory sync webhook
 *   GET  /api/buddy/status — HeadyBuddy service status
 */

'use strict';

const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// ── Slack Webhook Handler ────────────────────────────────────────────────────

router.post('/webhook/slack', express.json(), (req, res) => {
  // Slack URL verification challenge
  if (req.body && req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }

  const event = req.body?.event;
  if (!event) {
    return res.status(200).json({ ok: true, note: 'no event payload' });
  }

  // Ignore bot messages to prevent loops
  if (event.bot_id || event.subtype === 'bot_message') {
    return res.status(200).json({ ok: true, ignored: 'bot_message' });
  }

  console.log(`[headybuddy/slack] Event: ${event.type} from ${event.user || 'unknown'}`);

  // Route by event type
  switch (event.type) {
    case 'message':
      handleSlackMessage(event);
      break;
    case 'app_mention':
      handleSlackMention(event);
      break;
    default:
      console.log(`[headybuddy/slack] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ ok: true });
});

function handleSlackMessage(event) {
  const text = (event.text || '').toLowerCase();

  // Overwhelm Protocol — detect distress signals
  if (isOverwhelmed(text)) {
    console.log(`[headybuddy/slack] Overwhelm Protocol triggered for user ${event.user}`);
    // Queue empathic response through the pipeline
    emitEvent('overwhelm:detected', { user: event.user, channel: event.channel, text });
    return;
  }

  // Standard message routing
  emitEvent('slack:message', { user: event.user, channel: event.channel, text });
}

function handleSlackMention(event) {
  console.log(`[headybuddy/slack] Mention from ${event.user}: ${event.text}`);
  emitEvent('slack:mention', { user: event.user, channel: event.channel, text: event.text });
}

function isOverwhelmed(text) {
  const signals = ['overwhelmed', 'too much', 'can\'t handle', 'stressed', 'drowning', 'behind', 'falling behind'];
  return signals.some(s => text.includes(s));
}

// ── Obsidian Vault Webhook Handler ───────────────────────────────────────────

router.post('/webhook/obsidian', express.json(), (req, res) => {
  const { vault, file, action, content } = req.body || {};

  if (!vault || !file) {
    return res.status(400).json({ error: 'Missing vault or file in payload' });
  }

  console.log(`[headybuddy/obsidian] ${action || 'sync'}: ${vault}/${file}`);

  // Memory mapping — sync vault content to HeadyMemory
  emitEvent('obsidian:sync', {
    vault,
    file,
    action: action || 'update',
    contentHash: content ? crypto.createHash('sha256').update(content).digest('hex').slice(0, 12) : null,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({ ok: true, synced: true });
});

// ── Status Endpoint ──────────────────────────────────────────────────────────

router.get('/api/buddy/status', (req, res) => {
  res.json({
    service: 'HeadyBuddy',
    version: '1.0.0',
    channels: ['slack', 'obsidian', 'ide'],
    status: 'active',
    features: {
      overwhelmProtocol: true,
      memorySync: true,
      conversationalInterface: true,
    },
    uptime: process.uptime(),
  });
});

// ── Event Emitter Bridge ─────────────────────────────────────────────────────

function emitEvent(type, data) {
  if (global.eventBus && typeof global.eventBus.emit === 'function') {
    global.eventBus.emit(type, data);
  } else {
    console.log(`[headybuddy] Event (no bus): ${type}`, JSON.stringify(data).slice(0, 200));
  }
}

// ── Mount Function ───────────────────────────────────────────────────────────

function mount(app) {
  app.use('/', router);
  console.log('[headybuddy] Mounted: /webhook/slack, /webhook/obsidian, /api/buddy/status');
}

module.exports = { router, mount };
