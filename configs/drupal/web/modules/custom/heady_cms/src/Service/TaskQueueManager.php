<?php

namespace Drupal\heady_cms\Service;

use Drupal\Core\Database\Connection;
use Drupal\Core\State\StateInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

/**
 * Task queue manager — tracks browser automation tasks, deploy tasks,
 * content workflows, and general async work items.
 *
 * Uses Drupal state for lightweight storage (no extra DB schema needed).
 */
class TaskQueueManager {

  protected $database;
  protected $state;
  protected $logger;
  protected $dispatcher;

  public function __construct(
    Connection $database,
    StateInterface $state,
    LoggerChannelFactoryInterface $logger_factory,
    EventDispatcherInterface $dispatcher
  ) {
    $this->database = $database;
    $this->state = $state;
    $this->logger = $logger_factory->get('heady_cms');
    $this->dispatcher = $dispatcher;
  }

  /**
   * Create a new task.
   */
  public function createTask(array $data): array {
    $task = [
      'id' => 'task_' . bin2hex(random_bytes(6)),
      'type' => $data['type'],
      'title' => $data['title'],
      'description' => $data['description'] ?? '',
      'queue' => $data['queue'] ?? 'default',
      'priority' => $data['priority'] ?? 'normal',
      'status' => 'pending',
      'payload' => $data['payload'] ?? [],
      'result' => NULL,
      'created_by' => $data['created_by'] ?? 0,
      'created_at' => time(),
      'started_at' => NULL,
      'completed_at' => NULL,
      'attempts' => 0,
      'max_attempts' => 3,
    ];

    $tasks = $this->state->get('heady_cms.tasks', []);
    $tasks[$task['id']] = $task;
    $this->state->set('heady_cms.tasks', $tasks);

    $this->logger->info('Task created: @title [@id]', [
      '@title' => $task['title'],
      '@id' => $task['id'],
    ]);

    return $task;
  }

  /**
   * List tasks with optional filtering.
   */
  public function listTasks(string $status = 'all', string $queue = 'all', int $limit = 50): array {
    $tasks = $this->state->get('heady_cms.tasks', []);

    // Filter
    if ($status !== 'all') {
      $tasks = array_filter($tasks, fn($t) => $t['status'] === $status);
    }
    if ($queue !== 'all') {
      $tasks = array_filter($tasks, fn($t) => $t['queue'] === $queue);
    }

    // Sort by created_at descending
    usort($tasks, fn($a, $b) => ($b['created_at'] ?? 0) - ($a['created_at'] ?? 0));

    return array_slice($tasks, 0, $limit);
  }

  /**
   * Perform action on a task.
   */
  public function performAction(string $task_id, string $action, $user_id = 0): array {
    $tasks = $this->state->get('heady_cms.tasks', []);

    if (!isset($tasks[$task_id])) {
      return ['error' => "Task not found: $task_id"];
    }

    $task = &$tasks[$task_id];

    switch ($action) {
      case 'start':
        $task['status'] = 'running';
        $task['started_at'] = time();
        $task['attempts']++;
        break;

      case 'pause':
        $task['status'] = 'paused';
        break;

      case 'cancel':
        $task['status'] = 'cancelled';
        $task['completed_at'] = time();
        break;

      case 'retry':
        if ($task['attempts'] >= $task['max_attempts']) {
          return ['error' => 'Max attempts reached', 'task_id' => $task_id];
        }
        $task['status'] = 'pending';
        $task['result'] = NULL;
        break;

      case 'complete':
        $task['status'] = 'completed';
        $task['completed_at'] = time();
        break;
    }

    $this->state->set('heady_cms.tasks', $tasks);

    return [
      'task_id' => $task_id,
      'action' => $action,
      'status' => $task['status'],
    ];
  }

  /**
   * Get queue statistics.
   */
  public function getQueueStats(): array {
    $tasks = $this->state->get('heady_cms.tasks', []);
    $stats = [
      'total' => count($tasks),
      'pending' => 0,
      'running' => 0,
      'completed' => 0,
      'failed' => 0,
      'cancelled' => 0,
      'queues' => [],
    ];

    foreach ($tasks as $t) {
      $status = $t['status'] ?? 'unknown';
      if (isset($stats[$status])) {
        $stats[$status]++;
      }
      $q = $t['queue'] ?? 'default';
      $stats['queues'][$q] = ($stats['queues'][$q] ?? 0) + 1;
    }

    return $stats;
  }

}
