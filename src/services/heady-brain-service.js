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
// ║  FILE: src/services/heady-brain-service.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyBrainService - 100% Heady Service Implementation
 * 
 * This service replaces all external model providers (OpenAI, Anthropic, Google)
 * and routes ALL requests through HeadyBrain endpoints. No external APIs are called.
 * 
 * Features:
 * - 100% HeadyBrain routing
 * - Automatic failover across Heady endpoints
 * - No external API dependencies
 * - Built-in caching and optimization
 * - Full compatibility with existing service interfaces
 */

const { getBrainConnector } = require('../brain_connector');
const EventEmitter = require('events');

class HeadyBrainService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.brainConnector = getBrainConnector(options);
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Generate completion using HeadyBrain
   * Replaces: OpenAI completions, Anthropic messages, Google generate
   */
  async completion(params) {
    const cacheKey = this._getCacheKey('completion', params);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.response;
      }
    }

    try {
      // Convert to HeadyBrain task format
      const task = {
        id: params.taskId || `task-${Date.now()}`,
        type: this._mapTaskType(params.type || 'CODE'),
        message: params.prompt || params.messages?.[params.messages.length - 1]?.content,
        context: {
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || 2048,
          model: 'HeadyBrain',
          privacy: params.privacy || 'normal',
          cost_sensitivity: params.cost_sensitivity || 'quality-first',
          ...params.context
        },
        cloud_layer: params.cloud_layer || 'production',
        brain_profile_id: params.brain_profile_id || 'production'
      };

      // Route through HeadyBrain
      const response = await this.brainConnector.request('/api/brain/generate', {
        method: 'POST',
        data: task
      });

      const result = {
        id: response.generation_id,
        choices: [{
          text: response.content,
          index: 0,
          logprobs: null,
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        created: Date.now(),
        model: 'HeadyBrain',
        object: 'text_completion'
      };

      // Cache result
      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this._cleanCache();

      return result;
    } catch (error) {
      this.emit('error', { service: 'HeadyBrain', error });
      throw new Error(`HeadyBrain completion failed: ${error.message}`);
    }
  }

  /**
   * Generate chat completion using HeadyBrain
   * Replaces: OpenAI chat completions, Anthropic messages
   */
  async chatCompletion(params) {
    const cacheKey = this._getCacheKey('chat', params);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.response;
      }
    }

    try {
      const task = {
        id: params.taskId || `chat-${Date.now()}`,
        type: 'CHAT',
        message: params.messages?.[params.messages.length - 1]?.content || params.prompt,
        context: {
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || 2048,
          model: 'HeadyBrain',
          system: params.system,
          ...params.context
        },
        cloud_layer: params.cloud_layer || 'production',
        brain_profile_id: params.brain_profile_id || 'production'
      };

      const response = await this.brainConnector.request('/api/brain/chat', {
        method: 'POST',
        data: task
      });

      const result = {
        id: response.chat_id,
        object: 'chat.completion',
        created: Date.now(),
        model: 'HeadyBrain',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        }
      };

      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now()
      });

      this._cleanCache();

      return result;
    } catch (error) {
      this.emit('error', { service: 'HeadyBrain', error });
      throw new Error(`HeadyBrain chat completion failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding using HeadyBrain
   * Replaces: OpenAI embeddings, Google embeddings
   */
  async embedding(params) {
    const cacheKey = this._getCacheKey('embedding', params);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.response;
      }
    }

    try {
      const task = {
        id: params.taskId || `embed-${Date.now()}`,
        type: 'EMBEDDING',
        message: params.input,
        context: {
          model: 'HeadyEmbeddings',
          dimensions: params.dimensions || 1536,
          ...params.context
        },
        cloud_layer: params.cloud_layer || 'production'
      };

      const response = await this.brainConnector.request('/api/brain/embed', {
        method: 'POST',
        data: task
      });

      const result = {
        object: 'list',
        data: [{
          object: 'embedding',
          embedding: response.embedding,
          index: 0
        }],
        model: 'HeadyEmbeddings',
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        }
      };

      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now()
      });

      this._cleanCache();

      return result;
    } catch (error) {
      this.emit('error', { service: 'HeadyBrain', error });
      throw new Error(`HeadyBrain embedding failed: ${error.message}`);
    }
  }

  /**
   * Analyze code using HeadyBrain
   * Replaces: Codex, code analysis services
   */
  async analyzeCode(params) {
    try {
      const task = {
        id: params.taskId || `analyze-${Date.now()}`,
        type: 'CODE_ANALYSIS',
        message: params.code,
        context: {
          language: params.language,
          analysis_type: params.analysis_type || 'general',
          ...params.context
        },
        cloud_layer: params.cloud_layer || 'production'
      };

      const response = await this.brainConnector.request('/api/brain/analyze', {
        method: 'POST',
        data: task
      });

      return {
        analysis: response.analysis,
        suggestions: response.suggestions || [],
        issues: response.issues || [],
        metrics: response.metrics || {}
      };
    } catch (error) {
      this.emit('error', { service: 'HeadyBrain', error });
      throw new Error(`HeadyBrain code analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate image using HeadyBrain
   * Replaces: DALL-E, Midjourney, Stable Diffusion
   */
  async generateImage(params) {
    try {
      const task = {
        id: params.taskId || `image-${Date.now()}`,
        type: 'IMAGE_GENERATION',
        message: params.prompt,
        context: {
          size: params.size || '1024x1024',
          style: params.style || 'realistic',
          quality: params.quality || 'standard',
          ...params.context
        },
        cloud_layer: params.cloud_layer || 'production'
      };

      const response = await this.brainConnector.request('/api/brain/generate-image', {
        method: 'POST',
        data: task
      });

      return {
        created: Date.now(),
        data: [{
          url: response.image_url,
          revised_prompt: response.revised_prompt || params.prompt
        }]
      };
    } catch (error) {
      this.emit('error', { service: 'HeadyBrain', error });
      throw new Error(`HeadyBrain image generation failed: ${error.message}`);
    }
  }

  /**
   * Translate text using HeadyBrain
   * Replaces: Google Translate, DeepL
   */
  async translate(params) {
    try {
      const task = {
        id: params.taskId || `translate-${Date.now()}`,
        type: 'TRANSLATION',
        message: params.text,
        context: {
          source_language: params.source || 'auto',
          target_language: params.target,
          ...params.context
        },
        cloud_layer: params.cloud_layer || 'production'
      };

      const response = await this.brainConnector.request('/api/brain/translate', {
        method: 'POST',
        data: task
      });

      return {
        translatedText: response.translated_text,
        sourceLanguage: response.detected_language || params.source,
        targetLanguage: params.target
      };
    } catch (error) {
      this.emit('error', { service: 'HeadyBrain', error });
      throw new Error(`HeadyBrain translation failed: ${error.message}`);
    }
  }

  /**
   * Get service health status
   */
  async health() {
    try {
      const stats = this.brainConnector.getStats();
      return {
        status: 'healthy',
        service: 'HeadyBrain',
        uptime: stats.uptime,
        success_rate: stats.totalRequests > 0 
          ? (stats.successfulRequests / stats.totalRequests * 100).toFixed(2) + '%'
          : '100%',
        endpoints: stats.endpointStats,
        cache_size: this.cache.size
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'HeadyBrain',
        error: error.message
      };
    }
  }

  // Helper methods
  _getCacheKey(type, params) {
    const key = JSON.stringify({ type, params });
    return require('crypto').createHash('md5').update(key).digest('hex');
  }

  _cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  _mapTaskType(type) {
    const typeMap = {
      'CODE': 'CODE',
      'CHAT': 'CHAT',
      'WRITING': 'WRITING',
      'ANALYSIS': 'ANALYSIS',
      'TRANSLATION': 'TRANSLATION',
      'SUMMARY': 'SUMMARY'
    };
    return typeMap[type] || 'GENERAL';
  }
}

// Singleton instance
let instance = null;

function getHeadyBrainService(options) {
  if (!instance) {
    instance = new HeadyBrainService(options);
  }
  return instance;
}

module.exports = {
  HeadyBrainService,
  getHeadyBrainService
};
