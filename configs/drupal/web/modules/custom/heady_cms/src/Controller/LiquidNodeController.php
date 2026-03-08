<?php

namespace Drupal\heady_cms\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Liquid Node management — Vertex AI, Cloudflare Workers, Colab runtimes.
 *
 * Orchestrates the 3D vector space of compute nodes across
 * Google Cloud, Cloudflare edge, and Colab Pro+ GPU runtimes.
 */
class LiquidNodeController extends ControllerBase {

  const PHI = 1.6180339887498949;
  const PSI = 0.6180339887498949;

  protected $nodeManager;

  public function __construct($node_manager) {
    $this->nodeManager = $node_manager;
  }

  public static function create(ContainerInterface $container) {
    return new static($container->get('heady_cms.liquid_node_manager'));
  }

  /**
   * GET /api/cms/liquid/nodes — list all liquid nodes across platforms.
   */
  public function listNodes(): JsonResponse {
    $nodes = $this->nodeManager->getAllNodes();
    return new JsonResponse([
      'nodes' => $nodes,
      'total' => count($nodes),
      'phi' => self::PHI,
      'topology' => '3d_vector',
    ]);
  }

  /**
   * GET /api/cms/liquid/nodes/{node_id}/health — health check a specific node.
   */
  public function nodeHealth(string $node_id): JsonResponse {
    $health = $this->nodeManager->checkHealth($node_id);
    return new JsonResponse($health);
  }

  /**
   * POST /api/cms/liquid/dispatch — dispatch work to optimal node.
   *
   * Uses 3D vector space routing:
   *   x = latency_priority (prefer low-latency edge nodes)
   *   y = compute_weight   (prefer GPU nodes for heavy compute)
   *   z = cache_affinity    (prefer cached/warm nodes)
   */
  public function dispatch(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!$data || empty($data['task_type'])) {
      return new JsonResponse(['error' => 'task_type is required'], 400);
    }

    // Compute optimal node using φ-weighted vector distance
    $target_vector = [
      'x' => (float) ($data['latency_priority'] ?? self::PSI),
      'y' => (float) ($data['compute_weight'] ?? 0.5),
      'z' => (float) ($data['cache_affinity'] ?? self::PSI),
    ];

    $result = $this->nodeManager->dispatchToOptimal($data['task_type'], $target_vector, $data['payload'] ?? []);
    return new JsonResponse($result);
  }

  /**
   * GET /api/cms/liquid/topology — full 3D topology map.
   */
  public function topology(): JsonResponse {
    $nodes = $this->nodeManager->getAllNodes();
    $topology = [
      'dimensions' => ['x' => 'latency', 'y' => 'compute', 'z' => 'cache'],
      'phi' => self::PHI,
      'psi' => self::PSI,
      'layers' => [
        'edge' => [
          'platform' => 'cloudflare_workers',
          'vector' => ['x' => 1.0, 'y' => 0.0, 'z' => self::PHI],
          'nodes' => array_filter($nodes, fn($n) => $n['platform'] === 'cloudflare'),
        ],
        'compute' => [
          'platform' => 'colab_pro_plus',
          'vector' => ['x' => 0.0, 'y' => self::PHI, 'z' => 0.0],
          'nodes' => array_filter($nodes, fn($n) => $n['platform'] === 'colab'),
        ],
        'ai' => [
          'platform' => 'vertex_ai',
          'vector' => ['x' => self::PSI, 'y' => 1.0, 'z' => self::PSI],
          'nodes' => array_filter($nodes, fn($n) => $n['platform'] === 'vertex'),
        ],
        'origin' => [
          'platform' => 'local',
          'vector' => ['x' => 0.5, 'y' => 0.5, 'z' => 0.5],
          'nodes' => array_filter($nodes, fn($n) => $n['platform'] === 'local'),
        ],
      ],
      'connections' => $this->nodeManager->getConnections(),
    ];

    return new JsonResponse($topology);
  }

}
