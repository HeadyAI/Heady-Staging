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
// ║  FILE: packages/hc-supervisor/examples.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * HCSupervisor Examples
 * 
 * Demonstrates various usage patterns and configurations.
 * FILE: packages/hc-supervisor/examples.js
 */

const { HCSupervisor, TASK_STATUS, ROUTING_STRATEGY } = require('./index.js');

// ─── EXAMPLE 1: Basic Single Task ─────────────────────────────────────────
async function example1_BasicSingleTask() {
  console.log('\n=== EXAMPLE 1: Basic Single Task ===\n');
  
  const supervisor = new HCSupervisor({
    enableHealthChecks: false, // Disabled for examples
  });
  
  // Set mock mode for examples
  process.env.AGENT_MOCK_MODE = 'true';
  
  try {
    const result = await supervisor.submitTask({
      id: 'example-1-build',
      type: 'build',
      payload: {
        repo: 'heady-core',
        branch: 'main',
      },
    });
    
    console.log('Task completed successfully');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Task failed:', error.message);
  }
  
  supervisor.shutdown();
}

// ─── EXAMPLE 2: Direct Agent Routing ──────────────────────────────────────
async function example2_DirectRouting() {
  console.log('\n=== EXAMPLE 2: Direct Agent Routing ===\n');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  try {
    // Route to specific agent
    const result = await supervisor.submitTask({
      id: 'example-2-audit',
      type: 'security-scan',
      agents: ['auditor'],
      strategy: 'direct',
      payload: {
        targetPath: '/code',
      },
      timeout: 20000,
    });
    
    console.log('Task routed to auditor agent');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Task failed:', error.message);
  }
  
  supervisor.shutdown();
}

// ─── EXAMPLE 3: Parallel Task Execution ───────────────────────────────────
async function example3_ParallelTasks() {
  console.log('\n=== EXAMPLE 3: Parallel Task Execution ===\n');
  
  const supervisor = new HCSupervisor({
    maxConcurrentTasks: 5,
  });
  process.env.AGENT_MOCK_MODE = 'true';
  
  const tasks = [
    { id: 'task-1', type: 'lint', payload: { repo: 'repo-1' } },
    { id: 'task-2', type: 'test', payload: { repo: 'repo-2' } },
    { id: 'task-3', type: 'build', payload: { repo: 'repo-3' } },
    { id: 'task-4', type: 'security-scan', payload: { repo: 'repo-4' } },
    { id: 'task-5', type: 'deploy', payload: { service: 'service-1' } },
  ];
  
  const startTime = Date.now();
  const { results, errors, succeeded, failed } = await supervisor.submitParallelTasks(tasks);
  const duration = Date.now() - startTime;
  
  console.log(`\nResults: ${succeeded} succeeded, ${failed} failed`);
  console.log(`Duration: ${duration}ms`);
  
  results.forEach(r => {
    console.log(`✓ ${r.taskId}`);
  });
  
  errors.forEach(e => {
    console.log(`✗ ${e.taskId}: ${e.error}`);
  });
  
  supervisor.shutdown();
}

// ─── EXAMPLE 4: Event Monitoring ──────────────────────────────────────────
async function example4_EventMonitoring() {
  console.log('\n=== EXAMPLE 4: Event Monitoring ===\n');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  // Set up event listeners
  supervisor.on('task:assigned', (event) => {
    console.log(`[ASSIGNED] ${event.taskId}`);
  });
  
  supervisor.on('task:executing', (event) => {
    console.log(`[EXECUTING] ${event.taskId} on ${event.agent}`);
  });
  
  supervisor.on('task:completed', (event) => {
    console.log(`[COMPLETED] ${event.taskId}`);
  });
  
  supervisor.on('task:failed', (event) => {
    console.log(`[FAILED] ${event.taskId}: ${event.error}`);
  });
  
  // Submit task
  try {
    await supervisor.submitTask({
      id: 'monitored-task',
      type: 'build',
      payload: { repo: 'heady-core' },
    });
  } catch (error) {
    // Expected in example mode
  }
  
  supervisor.shutdown();
}

// ─── EXAMPLE 5: Metrics Collection ────────────────────────────────────────
async function example5_MetricsCollection() {
  console.log('\n=== EXAMPLE 5: Metrics Collection ===\n');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  // Submit multiple tasks
  const tasks = Array.from({ length: 10 }, (_, i) => ({
    id: `metric-task-${i}`,
    type: i % 3 === 0 ? 'build' : i % 3 === 1 ? 'test' : 'lint',
    payload: { index: i },
  }));
  
  await supervisor.submitParallelTasks(tasks);
  
  // Get metrics
  const metrics = supervisor.getMetrics();
  console.log('\n--- Overall Metrics ---');
  console.log(`Tasks Processed: ${metrics.tasksProcessed}`);
  console.log(`Tasks Succeeded: ${metrics.tasksSucceeded}`);
  console.log(`Tasks Failed: ${metrics.tasksFailed}`);
  console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);
  console.log(`Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`);
  
  // Get agent status
  const status = supervisor.getAgentStatus();
  console.log('\n--- Agent Status ---');
  Object.entries(status).forEach(([name, info]) => {
    if (info.requests > 0) {
      console.log(`${name.padEnd(15)} Health: ${info.health.padEnd(10)} Requests: ${info.requests.padEnd(3)} Success: ${info.successRate.toFixed(1)}%`);
    }
  });
  
  supervisor.shutdown();
}

// ─── EXAMPLE 6: Agent Catalog Inspection ──────────────────────────────────
async function example6_AgentCatalog() {
  console.log('\n=== EXAMPLE 6: Agent Catalog Inspection ===\n');
  
  const supervisor = new HCSupervisor();
  
  const catalog = supervisor.getAgentCatalog();
  
  console.log('Available Agents:\n');
  Object.entries(catalog).forEach(([name, agent]) => {
    console.log(`${name.toUpperCase()}`);
    console.log(`  Role: ${agent.role}`);
    console.log(`  Skills: ${agent.skills.join(', ')}`);
    console.log(`  Criticality: ${agent.criticality}`);
    console.log(`  Timeout: ${agent.timeout}ms`);
    console.log();
  });
  
  supervisor.shutdown();
}

// ─── EXAMPLE 7: Custom Configuration ──────────────────────────────────────
async function example7_CustomConfiguration() {
  console.log('\n=== EXAMPLE 7: Custom Configuration ===\n');
  
  const supervisor = new HCSupervisor({
    maxConcurrentTasks: 10,
    defaultTimeout: 20000,
    enableHealthChecks: false,
    enableMetrics: true,
    retryStrategy: 'exponential-backoff',
    maxRetries: 2,
  });
  process.env.AGENT_MOCK_MODE = 'true';
  
  console.log('Supervisor configured with:');
  console.log('- Max concurrent tasks: 10');
  console.log('- Default timeout: 20s');
  console.log('- Health checks: disabled');
  console.log('- Retry strategy: exponential-backoff');
  console.log('- Max retries: 2');
  
  try {
    await supervisor.submitTask({
      id: 'custom-task',
      type: 'deploy',
      payload: { service: 'test-service' },
    });
  } catch (error) {
    // Expected in example mode
  }
  
  supervisor.shutdown();
}

// ─── EXAMPLE 8: Error Handling ────────────────────────────────────────────
async function example8_ErrorHandling() {
  console.log('\n=== EXAMPLE 8: Error Handling ===\n');
  
  const supervisor = new HCSupervisor();
  
  // Example 1: Invalid task
  try {
    await supervisor.submitTask({
      // Missing 'id' field
      type: 'build',
      payload: {},
    });
  } catch (error) {
    console.log(`Caught error: ${error.message}`);
  }
  
  // Example 2: Unknown task type
  process.env.AGENT_MOCK_MODE = 'false'; // Disable mock to trigger agent unavailable error
  try {
    await supervisor.submitTask({
      id: 'unknown-task',
      type: 'unknown-skill',
      payload: {},
    });
  } catch (error) {
    console.log(`Caught error: ${error.message}`);
  }
  
  supervisor.shutdown();
}

// ─── EXAMPLE 9: Task Status Tracking ──────────────────────────────────────
async function example9_TaskStatusTracking() {
  console.log('\n=== EXAMPLE 9: Task Status Tracking ===\n');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  const taskId = 'tracked-task';
  
  // Submit task (fire and forget pattern for this demo)
  supervisor.submitTask({
    id: taskId,
    type: 'build',
    payload: {},
  }).catch(() => {});
  
  // Check status after submission
  setTimeout(() => {
    const status = supervisor.getTaskStatus(taskId);
    if (status) {
      console.log(`Task Status: ${status.status}`);
      console.log(`Agent: ${status.assignedAgent}`);
      console.log(`Created: ${new Date(status.createdAt).toISOString()}`);
    } else {
      console.log('Task not found or already completed');
    }
  }, 100);
  
  supervisor.shutdown();
}

// ─── EXAMPLE 10: Capability Matching ──────────────────────────────────────
async function example10_CapabilityMatching() {
  console.log('\n=== EXAMPLE 10: Capability Matching ===\n');
  
  const supervisor = new HCSupervisor();
  process.env.AGENT_MOCK_MODE = 'true';
  
  const skillTaskMap = {
    'build': 'builder agent will handle',
    'deploy': 'deployer agent will handle',
    'test': 'builder agent will handle',
    'security-scan': 'auditor agent will handle',
    'health-check': 'observer agent will handle',
    'concept-extraction': 'researcher agent will handle',
    'code-analysis': 'claude-code agent will handle',
  };
  
  console.log('Skill to Agent Mapping:\n');
  Object.entries(skillTaskMap).forEach(([skill, handler]) => {
    console.log(`${skill.padEnd(20)} → ${handler}`);
  });
  
  supervisor.shutdown();
}

// ─── MAIN: Run All Examples ───────────────────────────────────────────────
async function runAllExamples() {
  try {
    // Uncomment examples to run
    await example1_BasicSingleTask();
    // await example2_DirectRouting();
    // await example3_ParallelTasks();
    // await example4_EventMonitoring();
    // await example5_MetricsCollection();
    // await example6_AgentCatalog();
    // await example7_CustomConfiguration();
    // await example8_ErrorHandling();
    // await example9_TaskStatusTracking();
    // await example10_CapabilityMatching();
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for testing
module.exports = {
  example1_BasicSingleTask,
  example2_DirectRouting,
  example3_ParallelTasks,
  example4_EventMonitoring,
  example5_MetricsCollection,
  example6_AgentCatalog,
  example7_CustomConfiguration,
  example8_ErrorHandling,
  example9_TaskStatusTracking,
  example10_CapabilityMatching,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
