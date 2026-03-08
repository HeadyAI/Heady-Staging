<?php

namespace Drupal\heady_cms\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Task Browser — headless browser task completion + queue management.
 *
 * Manages automated browser tasks (form fills, scraping, testing),
 * integrates with the heady-task-browser Node.js service for Puppeteer execution.
 */
class TaskBrowserController extends ControllerBase {

  protected $taskQueue;
  protected $browserAutomation;

  public function __construct($task_queue, $browser_automation) {
    $this->taskQueue = $task_queue;
    $this->browserAutomation = $browser_automation;
  }

  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('heady_cms.task_queue'),
      $container->get('heady_cms.browser_automation')
    );
  }

  /**
   * GET /api/cms/tasks — list all tasks with filtering.
   */
  public function listTasks(Request $request): JsonResponse {
    $status = $request->query->get('status', 'all');
    $queue = $request->query->get('queue', 'all');
    $limit = min((int) $request->query->get('limit', 50), 200);

    $tasks = $this->taskQueue->listTasks($status, $queue, $limit);

    return new JsonResponse([
      'tasks' => $tasks,
      'total' => count($tasks),
      'queues' => $this->taskQueue->getQueueStats(),
      'browser_status' => $this->browserAutomation->getStatus(),
    ]);
  }

  /**
   * POST /api/cms/tasks — create a new task.
   */
  public function createTask(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!$data || empty($data['type'])) {
      return new JsonResponse(['error' => 'type is required'], 400);
    }

    $task = $this->taskQueue->createTask([
      'type'        => $data['type'],
      'title'       => $data['title'] ?? 'Untitled task',
      'description' => $data['description'] ?? '',
      'queue'       => $data['queue'] ?? 'default',
      'priority'    => $data['priority'] ?? 'normal',
      'payload'     => $data['payload'] ?? [],
      'created_by'  => $this->currentUser()->id(),
    ]);

    return new JsonResponse(['task' => $task, 'status' => 'created'], 201);
  }

  /**
   * POST /api/cms/tasks/{task_id}/{action} — perform action on task.
   */
  public function taskAction(string $task_id, string $action, Request $request): JsonResponse {
    $valid_actions = ['start', 'pause', 'cancel', 'retry', 'complete'];
    if (!in_array($action, $valid_actions)) {
      return new JsonResponse(['error' => "Invalid action: $action"], 400);
    }

    $result = $this->taskQueue->performAction($task_id, $action, $this->currentUser()->id());
    return new JsonResponse($result);
  }

  /**
   * POST /api/cms/tasks/browser/run — execute a headless browser task.
   *
   * Dispatches to the heady-task-browser Node.js service which runs Puppeteer.
   * Supports: page screenshots, form automation, link checking, content scraping.
   */
  public function runBrowserTask(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!$data || empty($data['action'])) {
      return new JsonResponse(['error' => 'action is required'], 400);
    }

    $valid_browser_actions = [
      'screenshot',     // Capture page screenshot
      'scrape',         // Extract structured data
      'form_fill',      // Automate form submission
      'link_check',     // Validate all links on a page
      'lighthouse',     // Run Lighthouse audit
      'pdf_export',     // Export page as PDF
      'test_auth',      // Test authentication flow
      'deploy_verify',  // Verify deployment health
    ];

    if (!in_array($data['action'], $valid_browser_actions)) {
      return new JsonResponse([
        'error' => 'Invalid browser action',
        'valid' => $valid_browser_actions,
      ], 400);
    }

    // Create task in queue
    $task = $this->taskQueue->createTask([
      'type'     => 'browser_automation',
      'title'    => "Browser: {$data['action']}",
      'queue'    => 'browser',
      'priority' => $data['priority'] ?? 'high',
      'payload'  => [
        'action'  => $data['action'],
        'url'     => $data['url'] ?? '',
        'options' => $data['options'] ?? [],
      ],
      'created_by' => $this->currentUser()->id(),
    ]);

    // Dispatch to headless browser service
    $result = $this->browserAutomation->dispatch($task);

    return new JsonResponse([
      'task_id' => $task['id'],
      'status'  => $result['status'] ?? 'queued',
      'message' => $result['message'] ?? 'Task dispatched to browser service',
    ], 202);
  }

}
