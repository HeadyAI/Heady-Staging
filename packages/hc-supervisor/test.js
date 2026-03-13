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
// ║  FILE: packages/hc-supervisor/test.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * HCSupervisor Test Suite
 * FILE: packages/hc-supervisor/test.js
 */

const { HCSupervisor, TASK_STATUS, ROUTING_STRATEGY, HEALTH_STATUS, AGENT_CATALOG } = require('./index.js');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

function assertEquals(actual, expected, message) {
  assert(actual === expected, `${message} (expected ${expected}, got ${actual})`);
}

function assertExists(value, message) {
  assert(value !== null && value !== undefined, `${message} (got ${value})`);
}

function assertIsArray(value, message) {
  assert(Array.isArray(value), `${message} (not an array)`);
}

function assertIsObject(value, message) {
  assert(value !== null && typeof value === 'object', `${message} (not an object)`);
}

// ─── UNIT TESTS ──────────────────────────────────────────────────────────

function test_Constructor() {
  console.log('\n[TEST SUITE] Constructor Tests');
  
  const supervisor = new HCSupervisor();
  assertExists(supervisor, 'Constructor creates instance');
  assertEquals(supervisor.options.maxConcurrentTasks, 20, 'Default maxConcurrentTasks is 20');
  assertEquals(supervisor.options.defaultTimeout, 30000, 'Default timeout is 30s');
  
  const customSupervisor = new HCSupervisor({
    maxConcurrentTasks: 50,
    defaultTimeout: 60000,
  });
  assertEquals(customSupervisor.options.maxConcurrentTasks, 50, 'Custom maxConcurrentTasks accepted');
  assertEquals(customSupervisor.options.defaultTimeout, 60000, 'Custom defaultTimeout accepted');
  
  supervisor.shutdown();
  customSupervisor.shutdown();
}

function test_AgentInitialization() {
  console.log('\n[TEST SUITE] Agent Initialization Tests');
  
  const supervisor = new HCSupervisor();
  
  assertEquals(supervisor.agents.size, 6, 'Six agents initialized');
  assert(supervisor.agents.has('builder'), 'Builder agent exists');
  assert(supervisor.agents.has('researcher'), 'Researcher agent exists');
  assert(supervisor.agents.has('deployer'), 'Deployer agent exists');
  assert(supervisor.agents.has('auditor'), 'Auditor agent exists');
  assert(supervisor.agents.has('observer'), 'Observer agent exists');
  assert(supervisor.agents.has('claude-code'), 'Claude-code agent exists');
  
  const builder = supervisor.agents.get('builder');
  assertEquals(builder.role, 'Build & Deploy Agent', 'Builder has correct role');
  assertIsArray(builder.skills, 'Builder has skills array');
  assert(builder.skills.includes('build'), 'Builder has build skill');
  
  supervisor.shutdown();
}

function test_GetAgentCatalog() {
  console.log('\n[TEST SUITE] Get Agent Catalog Tests');
  
  const supervisor = new HCSupervisor();
  const catalog = supervisor.getAgentCatalog();
  
  assertIsObject(catalog, 'Catalog is an object');
  assertEquals(Object.keys(catalog).length, 6, 'Catalog has 6 agents');
  assertExists(catalog.builder, 'Catalog contains builder');
  assertEquals(catalog.builder.role, 'Build & Deploy Agent', 'Catalog agent has role');
  assertIsArray(catalog.builder.skills, 'Catalog agent has skills');
  
  supervisor.shutdown();
}

function test_TaskValidation() {
  console.log('\n[TEST SUITE] Task Validation Tests');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  // Missing id
  supervisor.submitTask({
    type: 'build',
    payload: {},
  }).catch(err => {
    assert(err.message.includes('id'), 'Rejects task without id');
  });
  
  // Missing type
  supervisor.submitTask({
    id: 'test-1',
    payload: {},
  }).catch(err => {
    assert(err.message.includes('type'), 'Rejects task without type');
  });
  
  // Missing payload
  supervisor.submitTask({
    id: 'test-2',
    type: 'build',
  }).catch(err => {
    assert(err.message.includes('payload'), 'Rejects task without payload');
  });
  
  supervisor.shutdown();
}

function test_FindAgentsBySkill() {
  console.log('\n[TEST SUITE] Find Agents by Skill Tests');
  
  const supervisor = new HCSupervisor();
  
  let agents = supervisor.findAgentsBySkill('build');
  assert(agents.length > 0, 'Finds agent with build skill');
  assert(agents.some(a => a.name === 'builder'), 'Builder is returned for build skill');
  
  agents = supervisor.findAgentsBySkill('deploy');
  assert(agents.length > 0, 'Finds agent with deploy skill');
  assert(agents.some(a => a.name === 'builder' || a.name === 'deployer'), 'Correct agent for deploy');
  
  agents = supervisor.findAgentsBySkill('unknown-skill');
  assertEquals(agents.length, 0, 'Returns empty for unknown skill');
  
  supervisor.shutdown();
}

function test_GetMetrics() {
  console.log('\n[TEST SUITE] Metrics Tests');
  
  const supervisor = new HCSupervisor();
  const metrics = supervisor.getMetrics();
  
  assertIsObject(metrics, 'Metrics is an object');
  assertEquals(metrics.tasksProcessed, 0, 'Initial tasksProcessed is 0');
  assertEquals(metrics.tasksSucceeded, 0, 'Initial tasksSucceeded is 0');
  assertEquals(metrics.tasksFailed, 0, 'Initial tasksFailed is 0');
  assertEquals(metrics.activeTasks, 0, 'Initial activeTasks is 0');
  assertExists(metrics.agentMetrics, 'agentMetrics exists');
  assertIsObject(metrics.agentMetrics, 'agentMetrics is an object');
  
  supervisor.shutdown();
}

function test_GetAgentStatus() {
  console.log('\n[TEST SUITE] Agent Status Tests');
  
  const supervisor = new HCSupervisor();
  const status = supervisor.getAgentStatus();
  
  assertIsObject(status, 'Status is an object');
  assertEquals(Object.keys(status).length, 6, 'Status has 6 agents');
  
  const builderStatus = status.builder;
  assertExists(builderStatus, 'Builder status exists');
  assertEquals(builderStatus.health, HEALTH_STATUS.HEALTHY, 'Builder initially healthy');
  assertEquals(builderStatus.requests, 0, 'Builder has no requests initially');
  
  supervisor.shutdown();
}

function test_Events() {
  console.log('\n[TEST SUITE] Event Emission Tests');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  let assignedCaught = false;
  let executingCaught = false;
  let completedCaught = false;
  
  supervisor.on('task:assigned', (event) => {
    assignedCaught = true;
    assertExists(event.taskId, 'Assigned event has taskId');
  });
  
  supervisor.on('task:executing', (event) => {
    executingCaught = true;
    assertExists(event.taskId, 'Executing event has taskId');
    assertExists(event.agent, 'Executing event has agent');
  });
  
  supervisor.on('task:completed', (event) => {
    completedCaught = true;
    assertExists(event.taskId, 'Completed event has taskId');
  });
  
  supervisor.submitTask({
    id: 'event-test',
    type: 'build',
    payload: {},
  }).then(() => {
    setTimeout(() => {
      assert(assignedCaught, 'task:assigned event emitted');
      assert(executingCaught, 'task:executing event emitted');
      assert(completedCaught, 'task:completed event emitted');
    }, 100);
  }).catch(() => {});
  
  supervisor.shutdown();
}

function test_HealthStatus() {
  console.log('\n[TEST SUITE] Health Status Tests');
  
  const supervisor = new HCSupervisor({
    enableHealthChecks: false,
  });
  
  const health = supervisor.agentHealth.get('builder');
  assertExists(health, 'Agent health tracking exists');
  assertEquals(health.status, HEALTH_STATUS.HEALTHY, 'Initial health is healthy');
  assertEquals(health.consecutiveFailures, 0, 'Initial failures is 0');
  
  supervisor.updateAgentHealth('builder', { 
    status: HEALTH_STATUS.DEGRADED,
    consecutiveFailures: 1,
  });
  
  const updatedHealth = supervisor.agentHealth.get('builder');
  assertEquals(updatedHealth.status, HEALTH_STATUS.DEGRADED, 'Health updated to degraded');
  assertEquals(updatedHealth.consecutiveFailures, 1, 'Failures incremented');
  
  supervisor.shutdown();
}

function test_HealthScoring() {
  console.log('\n[TEST SUITE] Health Score Tests');
  
  const supervisor = new HCSupervisor();
  
  assertEquals(supervisor.getHealthScore(HEALTH_STATUS.HEALTHY), 0, 'Healthy score is 0');
  assertEquals(supervisor.getHealthScore(HEALTH_STATUS.DEGRADED), 1, 'Degraded score is 1');
  assertEquals(supervisor.getHealthScore(HEALTH_STATUS.UNHEALTHY), 2, 'Unhealthy score is 2');
  assertEquals(supervisor.getHealthScore(HEALTH_STATUS.UNAVAILABLE), 3, 'Unavailable score is 3');
  
  supervisor.shutdown();
}

function test_IsAgentHealthy() {
  console.log('\n[TEST SUITE] Is Agent Healthy Tests');
  
  const supervisor = new HCSupervisor();
  
  assert(supervisor.isAgentHealthy('builder'), 'Healthy agent is available');
  
  supervisor.updateAgentHealth('builder', { status: HEALTH_STATUS.UNHEALTHY });
  assert(!supervisor.isAgentHealthy('builder'), 'Unhealthy agent is not available');
  
  supervisor.updateAgentHealth('builder', { status: HEALTH_STATUS.DEGRADED });
  assert(supervisor.isAgentHealthy('builder'), 'Degraded agent is still available');
  
  supervisor.shutdown();
}

function test_RetryBackoff() {
  console.log('\n[TEST SUITE] Retry Backoff Tests');
  
  const supervisor = new HCSupervisor();
  
  const backoff1 = supervisor.getRetryBackoff(1);
  const backoff2 = supervisor.getRetryBackoff(2);
  const backoff3 = supervisor.getRetryBackoff(3);
  
  assert(backoff1 > 0, 'Backoff 1 is positive');
  assert(backoff2 > backoff1, 'Backoff 2 is greater than backoff 1');
  assert(backoff3 > backoff2, 'Backoff 3 is greater than backoff 2');
  
  supervisor.shutdown();
}

function test_ConstantsExported() {
  console.log('\n[TEST SUITE] Constants Export Tests');
  
  assertExists(TASK_STATUS, 'TASK_STATUS exported');
  assertExists(TASK_STATUS.PENDING, 'TASK_STATUS.PENDING exists');
  assertExists(TASK_STATUS.COMPLETED, 'TASK_STATUS.COMPLETED exists');
  
  assertExists(ROUTING_STRATEGY, 'ROUTING_STRATEGY exported');
  assertExists(ROUTING_STRATEGY.DIRECT, 'ROUTING_STRATEGY.DIRECT exists');
  assertExists(ROUTING_STRATEGY.CAPABILITY_MATCH, 'ROUTING_STRATEGY.CAPABILITY_MATCH exists');
  
  assertExists(HEALTH_STATUS, 'HEALTH_STATUS exported');
  assertExists(HEALTH_STATUS.HEALTHY, 'HEALTH_STATUS.HEALTHY exists');
  
  assertExists(AGENT_CATALOG, 'AGENT_CATALOG exported');
  assertEquals(Object.keys(AGENT_CATALOG).length, 6, 'AGENT_CATALOG has 6 agents');
}

function test_ParallelTasksEmpty() {
  console.log('\n[TEST SUITE] Parallel Tasks Error Handling Tests');
  
  const supervisor = new HCSupervisor();
  
  supervisor.submitParallelTasks([]).catch(err => {
    assert(err.message.includes('non-empty'), 'Rejects empty task array');
  });
  
  supervisor.shutdown();
}

// ─── INTEGRATION TESTS ────────────────────────────────────────────────────

async function test_FullTaskLifecycle() {
  console.log('\n[TEST SUITE] Full Task Lifecycle Tests');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  try {
    const result = await supervisor.submitTask({
      id: 'lifecycle-test',
      type: 'build',
      payload: { repo: 'test' },
    });
    
    assert(result.success, 'Task execution returns success');
    assertExists(result.result, 'Task result exists');
    
    const metrics = supervisor.getMetrics();
    assertEquals(metrics.tasksProcessed, 1, 'Metrics recorded task');
    assertEquals(metrics.tasksSucceeded, 1, 'Metrics recorded success');
    
  } catch (error) {
    console.error(`Full lifecycle test failed: ${error.message}`);
  }
  
  supervisor.shutdown();
}

async function test_ParallelExecution() {
  console.log('\n[TEST SUITE] Parallel Execution Tests');
  
  const supervisor = new HCSupervisor({
    maxConcurrentTasks: 3,
  });
  process.env.AGENT_MOCK_MODE = 'true';
  
  const tasks = [
    { id: 'task-1', type: 'build', payload: {} },
    { id: 'task-2', type: 'test', payload: {} },
    { id: 'task-3', type: 'lint', payload: {} },
  ];
  
  const startTime = Date.now();
  const { succeeded, failed } = await supervisor.submitParallelTasks(tasks);
  const duration = Date.now() - startTime;
  
  assertEquals(succeeded, 3, 'All 3 tasks succeeded');
  assertEquals(failed, 0, 'No tasks failed');
  assert(duration < 10000, 'Parallel execution completes reasonably fast');
  
  supervisor.shutdown();
}

// ─── TEST RUNNER ──────────────────────────────────────────────────────────

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           HCSupervisor Test Suite                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // Unit tests
  test_Constructor();
  test_AgentInitialization();
  test_GetAgentCatalog();
  test_TaskValidation();
  test_FindAgentsBySkill();
  test_GetMetrics();
  test_GetAgentStatus();
  test_Events();
  test_HealthStatus();
  test_HealthScoring();
  test_IsAgentHealthy();
  test_RetryBackoff();
  test_ConstantsExported();
  test_ParallelTasksEmpty();
  
  // Integration tests
  await test_FullTaskLifecycle();
  await test_ParallelExecution();
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║ TESTS PASSED: ${testsPassed.toString().padEnd(45)} ║`);
  console.log(`║ TESTS FAILED: ${testsFailed.toString().padEnd(45)} ║`);
  console.log(`║ TOTAL:       ${(testsPassed + testsFailed).toString().padEnd(45)} ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = {
  assert,
  assertEquals,
  assertExists,
  assertIsArray,
  assertIsObject,
};
