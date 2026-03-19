'use strict';

/**
 * @fileoverview @heady/router — HeadyRouter intelligent LLM routing gateway.
 * Re-exports the HeadyRouter class and all supporting types.
 *
 * @module @heady/router
 * @author HeadySystems Inc.
 */

const {
  HeadyRouter,
  PROVIDERS,
  TASK_TYPES,
  TIMEOUTS,
  PROVIDER_CATALOGUE,
  ROUTING_MATRIX,
} = require('./router');

module.exports = {
  HeadyRouter,
  PROVIDERS,
  TASK_TYPES,
  TIMEOUTS,
  PROVIDER_CATALOGUE,
  ROUTING_MATRIX,
};
