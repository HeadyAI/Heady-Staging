// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/hc_colorful_logger.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🌈 HEADY SYSTEMS — COLORFUL LOGGER                                         ║
 * ║  🚀 Rainbow Console Output • Sacred Geometry • Beautiful Logs ✨              ║
 * ║  🎨 Phi-Based Design • Zero Defect • Fun & Colorful 🦄                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// 🎨 COLOR PALETTE FOR RAINBOW OUTPUT
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright_red: '\x1b[91m',
  bright_green: '\x1b[92m',
  bright_yellow: '\x1b[93m',
  bright_blue: '\x1b[94m',
  bright_magenta: '\x1b[95m',
  bright_cyan: '\x1b[96m',
  bright_white: '\x1b[97m',
  reset: '\x1b[0m'
};

// 🌈 RAINBOW SEQUENCE FOR FUN EFFECTS
const rainbow = [
  colors.bright_red,
  colors.bright_yellow,
  colors.bright_green,
  colors.bright_cyan,
  colors.bright_blue,
  colors.bright_magenta
];

// 🦄 FUN EMOJIS FOR DIFFERENT LOG LEVELS
const emojis = {
  info: '🌈',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  debug: '🔍',
  system: '🚀',
  pipeline: '⚡',
  resource: '💻',
  agent: '🤖',
  skill: '🎯',
  checkpoint: '📍',
  sacred: '⬡'
};

class ColorfulLogger {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.level = options.level || 'info';
    this.useRainbow = options.useRainbow !== false;
    this.useEmojis = options.useEmojis !== false;
  }

  // 🌈 RAINBOW TEXT EFFECT
  rainbow(text) {
    if (!this.useRainbow) return text;
    
    let result = '';
    let colorIndex = 0;
    
    for (let i = 0; i < text.length; i++) {
      result += rainbow[colorIndex % rainbow.length] + text[i];
      colorIndex++;
    }
    
    return result + colors.reset;
  }

  // 🎨 COLORED LOG METHOD
  log(message, color = colors.white, emoji = '', prefix = '') {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const coloredMessage = `${color}${message}${colors.reset}`;
    const emojiPart = this.useEmojis && emoji ? `${emoji} ` : '';
    const prefixPart = prefix ? `[${prefix}] ` : '';
    
    logger.info(`${emojiPart}${prefixPart}${coloredMessage}`);
  }

  // 🌈 INFO LOG
  info(message, prefix = 'INFO') {
    this.log(message, colors.bright_cyan, emojis.info, prefix);
  }

  // ✅ SUCCESS LOG
  success(message, prefix = 'SUCCESS') {
    this.log(message, colors.bright_green, emojis.success, prefix);
  }

  // ⚠️ WARNING LOG
  warning(message, prefix = 'WARNING') {
    this.log(message, colors.bright_yellow, emojis.warning, prefix);
  }

  // ❌ ERROR LOG
  error(message, prefix = 'ERROR') {
    this.log(message, colors.bright_red, emojis.error, prefix);
  }

  // 🔍 DEBUG LOG
  debug(message, prefix = 'DEBUG') {
    if (this.level === 'debug') {
      this.log(message, colors.bright_magenta, emojis.debug, prefix);
    }
  }

  // 🚀 SYSTEM LOG
  system(message, prefix = 'SYSTEM') {
    this.log(message, colors.bright_blue, emojis.system, prefix);
  }

  // ⚡ PIPELINE LOG
  pipeline(message, prefix = 'PIPELINE') {
    this.log(message, colors.bright_cyan, emojis.pipeline, prefix);
  }

  // 💻 RESOURCE LOG
  resource(message, prefix = 'RESOURCE') {
    this.log(message, colors.bright_green, emojis.resource, prefix);
  }

  // 🤖 AGENT LOG
  agent(message, prefix = 'AGENT') {
    this.log(message, colors.bright_magenta, emojis.agent, prefix);
  }

  // 🎯 SKILL LOG
  skill(message, prefix = 'SKILL') {
    this.log(message, colors.bright_yellow, emojis.skill, prefix);
  }

  // 📍 CHECKPOINT LOG
  checkpoint(message, prefix = 'CHECKPOINT') {
    this.log(message, colors.bright_blue, emojis.checkpoint, prefix);
  }

  // ⬡ SACRED GEOMETRY LOG
  sacred(message, prefix = 'SACRED') {
    this.log(message, colors.bright_cyan, emojis.sacred, prefix);
  }

  // 🌈 SPECIAL HEADING LOG
  heading(title, subtitle = '') {
    const border = '═'.repeat(title.length + 4);
    this.log(`╔${border}╗`, colors.bright_cyan);
    this.log(`║  ${this.rainbow(title)}  ║`, colors.bright_cyan);
    if (subtitle) {
      this.log(`║  ${colors.bright_white}${subtitle}${colors.reset}  ║`, colors.bright_cyan);
    }
    this.log(`╚${border}╝`, colors.bright_cyan);
  }

  // 🎨 FUN SEPARATOR
  separator(type = 'rainbow') {
    switch (type) {
      case 'rainbow':
        this.log('🌈✨🦄💫🚀🌟💎🔮🎯🎪🎭🎨💫🦄🌈✨', colors.bright_cyan);
        break;
      case 'sacred':
        this.log('⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡ ⬢ ⬡', colors.bright_cyan);
        break;
      case 'phi':
        this.log('φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ φ', colors.bright_cyan);
        break;
      default:
        this.log('═'.repeat(50), colors.bright_cyan);
    }
  }

  // 🎪 FUN STARTUP MESSAGE
  startup(componentName) {
    this.heading('🌈 HEADY SYSTEMS', `${componentName} • Sacred Geometry • Rainbow Magic ✨`);
    this.separator('rainbow');
    this.success(`✨ ${componentName} initialized successfully! 🦄`);
    this.info(`🎨 Phi-based design activated • Zero defect mode ON 🚀`);
    this.separator('sacred');
  }

  // 🎯 FUN SHUTDOWN MESSAGE
  shutdown(componentName) {
    this.separator('phi');
    this.info(`🌈 ${componentName} shutting down gracefully... 💫`);
    this.success(`✨ All systems preserved • Sacred geometry maintained ⬡`);
    this.separator('rainbow');
  }
}

// 🌈 EXPORT THE COLORFUL LOGGER
module.exports = ColorfulLogger;

// 🎨 CREATE DEFAULT INSTANCE
const logger = new ColorfulLogger({
  enabled: true,
  level: process.env.LOG_LEVEL || 'info',
  useRainbow: true,
  useEmojis: true
});

// 🚀 EXPORT DEFAULT INSTANCE
module.exports.default = logger;

// 🦄 FUN GLOBAL ACCESS (optional)
global.headyLogger = logger;
