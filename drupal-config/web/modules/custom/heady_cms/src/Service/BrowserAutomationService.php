<?php

namespace Drupal\heady_cms\Service;

use GuzzleHttp\ClientInterface;
use Drupal\Core\State\StateInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;

/**
 * Browser automation — dispatches headless browser tasks to the
 * heady-task-browser Node.js/Puppeteer service.
 *
 * Supports: screenshots, scraping, form automation, Lighthouse audits,
 * deploy verification, and PDF export.
 */
class BrowserAutomationService {

  protected $httpClient;
  protected $state;
  protected $logger;

  protected $browserServiceUrl;

  public function __construct(
    ClientInterface $http_client,
    StateInterface $state,
    LoggerChannelFactoryInterface $logger_factory
  ) {
    $this->httpClient = $http_client;
    $this->state = $state;
    $this->logger = $logger_factory->get('heady_cms');
    $this->browserServiceUrl = getenv('BROWSER_SERVICE_URL') ?: 'http://localhost:3010';
  }

  /**
   * Get browser service status.
   */
  public function getStatus(): array {
    try {
      $response = $this->httpClient->request('GET', $this->browserServiceUrl . '/health', [
        'timeout' => 3,
        'http_errors' => FALSE,
      ]);

      if ($response->getStatusCode() === 200) {
        return json_decode($response->getBody(), TRUE) ?: ['status' => 'online'];
      }

      return ['status' => 'degraded', 'code' => $response->getStatusCode()];
    }
    catch (\Exception $e) {
      return ['status' => 'offline', 'error' => $e->getMessage()];
    }
  }

  /**
   * Dispatch a task to the browser service.
   */
  public function dispatch(array $task): array {
    $payload = $task['payload'] ?? [];

    try {
      $response = $this->httpClient->request('POST', $this->browserServiceUrl . '/tasks', [
        'json' => [
          'task_id' => $task['id'],
          'action' => $payload['action'] ?? 'screenshot',
          'url' => $payload['url'] ?? '',
          'options' => $payload['options'] ?? [],
        ],
        'timeout' => 10,
        'http_errors' => FALSE,
      ]);

      $result = json_decode($response->getBody(), TRUE);
      return [
        'status' => $response->getStatusCode() < 400 ? 'dispatched' : 'failed',
        'message' => $result['message'] ?? 'Task sent to browser service',
        'browser_task_id' => $result['task_id'] ?? NULL,
      ];
    }
    catch (\Exception $e) {
      $this->logger->warning('Browser dispatch failed: @msg', ['@msg' => $e->getMessage()]);
      return [
        'status' => 'queued',
        'message' => 'Browser service unavailable — task queued for retry',
      ];
    }
  }

}
