<?php

namespace Drupal\heady_cms\Service;

use GuzzleHttp\ClientInterface;
use Drupal\Core\State\StateInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Drupal\Core\Config\ConfigFactoryInterface;

/**
 * Manages liquid compute nodes across Cloudflare, Vertex AI, and Colab Pro+.
 */
class LiquidNodeManager {

  const PHI = 1.6180339887498949;
  const PSI = 0.6180339887498949;

  protected $httpClient;
  protected $state;
  protected $logger;
  protected $config;

  public function __construct(
    ClientInterface $http_client,
    StateInterface $state,
    LoggerChannelFactoryInterface $logger_factory,
    ConfigFactoryInterface $config_factory
  ) {
    $this->httpClient = $http_client;
    $this->state = $state;
    $this->logger = $logger_factory->get('heady_cms');
    $this->config = $config_factory->get('heady_cms.settings');
  }

  /**
   * Get all registered liquid nodes.
   */
  public function getAllNodes(): array {
    return [
      // Cloudflare edge nodes
      [
        'id' => 'cf-gateway',
        'name' => 'Liquid Gateway Worker',
        'platform' => 'cloudflare',
        'type' => 'worker',
        'endpoint' => 'https://liquid-gateway-worker.emailheadyconnection.workers.dev',
        'vector' => ['x' => 1.0, 'y' => 0.0, 'z' => self::PHI],
        'status' => $this->state->get('heady_cms.node.cf-gateway.status', 'active'),
        'last_heartbeat' => $this->state->get('heady_cms.node.cf-gateway.heartbeat', 0),
      ],
      [
        'id' => 'cf-edge-auth',
        'name' => 'Edge Auth Worker',
        'platform' => 'cloudflare',
        'type' => 'worker',
        'endpoint' => '',
        'vector' => ['x' => self::PHI, 'y' => 0.0, 'z' => 1.0],
        'status' => $this->state->get('heady_cms.node.cf-edge-auth.status', 'active'),
        'last_heartbeat' => $this->state->get('heady_cms.node.cf-edge-auth.heartbeat', 0),
      ],

      // Colab Pro+ GPU runtimes
      [
        'id' => 'colab-1',
        'name' => 'Colab Pro+ US-East',
        'platform' => 'colab',
        'type' => 'gpu_runtime',
        'region' => 'us-east',
        'gpu' => 'A100',
        'endpoint' => $this->state->get('heady_cms.node.colab-1.endpoint', ''),
        'vector' => ['x' => 0.0, 'y' => self::PHI, 'z' => 0.0],
        'status' => $this->state->get('heady_cms.node.colab-1.status', 'standby'),
        'last_heartbeat' => $this->state->get('heady_cms.node.colab-1.heartbeat', 0),
      ],
      [
        'id' => 'colab-2',
        'name' => 'Colab Pro+ US-West',
        'platform' => 'colab',
        'type' => 'gpu_runtime',
        'region' => 'us-west',
        'gpu' => 'A100',
        'endpoint' => $this->state->get('heady_cms.node.colab-2.endpoint', ''),
        'vector' => ['x' => 0.0, 'y' => 1.0, 'z' => self::PSI],
        'status' => $this->state->get('heady_cms.node.colab-2.status', 'standby'),
        'last_heartbeat' => $this->state->get('heady_cms.node.colab-2.heartbeat', 0),
      ],
      [
        'id' => 'colab-3',
        'name' => 'Colab Pro+ EU-West',
        'platform' => 'colab',
        'type' => 'gpu_runtime',
        'region' => 'eu-west',
        'gpu' => 'A100',
        'endpoint' => $this->state->get('heady_cms.node.colab-3.endpoint', ''),
        'vector' => ['x' => self::PSI, 'y' => self::PHI, 'z' => 0.0],
        'status' => $this->state->get('heady_cms.node.colab-3.status', 'standby'),
        'last_heartbeat' => $this->state->get('heady_cms.node.colab-3.heartbeat', 0),
      ],

      // Vertex AI
      [
        'id' => 'vertex-gemini',
        'name' => 'Vertex AI Gemini',
        'platform' => 'vertex',
        'type' => 'llm',
        'model' => 'gemini-2.5-pro',
        'region' => 'us-central1',
        'project' => 'heady-ai',
        'vector' => ['x' => self::PSI, 'y' => 1.0, 'z' => self::PSI],
        'status' => 'active',
        'last_heartbeat' => time(),
      ],

      // Local origin services
      [
        'id' => 'origin-manager',
        'name' => 'Heady Manager',
        'platform' => 'local',
        'type' => 'service',
        'endpoint' => 'https://manager.headysystems.com',
        'port' => 3300,
        'vector' => ['x' => 0.5, 'y' => 0.5, 'z' => 0.5],
        'status' => $this->state->get('heady_cms.node.origin-manager.status', 'active'),
        'last_heartbeat' => $this->state->get('heady_cms.node.origin-manager.heartbeat', 0),
      ],
      [
        'id' => 'origin-drupal',
        'name' => 'Drupal CMS',
        'platform' => 'local',
        'type' => 'cms',
        'endpoint' => 'https://admin.headysystems.com',
        'port' => 8080,
        'vector' => ['x' => self::PSI, 'y' => 0.0, 'z' => 1.0],
        'status' => 'active',
        'last_heartbeat' => time(),
      ],
    ];
  }

  /**
   * Heartbeat all nodes.
   */
  public function heartbeatAll(): array {
    $results = [];
    foreach ($this->getAllNodes() as $node) {
      if (!empty($node['endpoint'])) {
        $results[$node['id']] = $this->checkHealth($node['id']);
      }
    }
    return $results;
  }

  /**
   * Check health of a specific node.
   */
  public function checkHealth(string $node_id): array {
    $nodes = array_column($this->getAllNodes(), NULL, 'id');
    if (!isset($nodes[$node_id])) {
      return ['error' => "Unknown node: $node_id"];
    }

    $node = $nodes[$node_id];
    $health = ['node_id' => $node_id, 'platform' => $node['platform']];

    if (empty($node['endpoint'])) {
      $health['status'] = 'no_endpoint';
      return $health;
    }

    try {
      $response = $this->httpClient->request('GET', $node['endpoint'] . '/health', [
        'timeout' => 5,
        'http_errors' => FALSE,
      ]);
      $health['status'] = $response->getStatusCode() < 400 ? 'healthy' : 'degraded';
      $health['latency_ms'] = 0; // Would measure actual latency
      $health['response_code'] = $response->getStatusCode();
      $this->state->set("heady_cms.node.{$node_id}.status", $health['status']);
      $this->state->set("heady_cms.node.{$node_id}.heartbeat", time());
    }
    catch (\Exception $e) {
      $health['status'] = 'unreachable';
      $health['error'] = $e->getMessage();
      $this->state->set("heady_cms.node.{$node_id}.status", 'unreachable');
    }

    return $health;
  }

  /**
   * Dispatch to the optimal node using φ-weighted 3D vector proximity.
   */
  public function dispatchToOptimal(string $task_type, array $target_vector, array $payload): array {
    $nodes = $this->getAllNodes();
    $best = NULL;
    $best_distance = PHP_FLOAT_MAX;

    foreach ($nodes as $node) {
      if ($node['status'] !== 'active' && $node['status'] !== 'healthy') {
        continue;
      }
      $v = $node['vector'];
      $dx = ($v['x'] - $target_vector['x']) * self::PHI; // φ-weight latency
      $dy = ($v['y'] - $target_vector['y']);
      $dz = ($v['z'] - $target_vector['z']) * self::PSI;  // ψ-weight cache
      $distance = sqrt($dx * $dx + $dy * $dy + $dz * $dz);

      if ($distance < $best_distance) {
        $best_distance = $distance;
        $best = $node;
      }
    }

    if (!$best) {
      return ['error' => 'No healthy nodes available', 'status' => 'failed'];
    }

    return [
      'dispatched_to' => $best['id'],
      'node_name' => $best['name'],
      'platform' => $best['platform'],
      'vector_distance' => round($best_distance, 4),
      'task_type' => $task_type,
      'status' => 'dispatched',
    ];
  }

  /**
   * Get node-to-node connections for topology visualization.
   */
  public function getConnections(): array {
    return [
      ['from' => 'cf-gateway', 'to' => 'origin-manager', 'type' => 'proxy', 'weight' => self::PHI],
      ['from' => 'cf-gateway', 'to' => 'origin-drupal', 'type' => 'proxy', 'weight' => 1.0],
      ['from' => 'cf-gateway', 'to' => 'colab-1', 'type' => 'compute', 'weight' => self::PSI],
      ['from' => 'cf-gateway', 'to' => 'colab-2', 'type' => 'compute', 'weight' => self::PSI],
      ['from' => 'cf-gateway', 'to' => 'colab-3', 'type' => 'compute', 'weight' => self::PSI],
      ['from' => 'origin-manager', 'to' => 'vertex-gemini', 'type' => 'ai', 'weight' => self::PHI],
      ['from' => 'origin-manager', 'to' => 'origin-drupal', 'type' => 'internal', 'weight' => 1.0],
      ['from' => 'origin-drupal', 'to' => 'cf-gateway', 'type' => 'deploy', 'weight' => 1.0],
    ];
  }

}
