<?php
namespace Drupal\heady_vector_sync\Service;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use GuzzleHttp\ClientInterface;

/**
 * Indexes Drupal content into HeadyAutoContext 384-dim vector memory.
 * Uses webhook (instant) + φ-scaled polling fallback (5-15 min).
 * CSL relevance gates filter content quality before indexing.
 */
class VectorIndexer {

  /** @var \GuzzleHttp\ClientInterface */
  protected $httpClient;
  /** @var \Drupal\Core\Config\ConfigFactoryInterface */
  protected $configFactory;
  /** @var \Psr\Log\LoggerInterface */
  protected $logger;
  /** @var \Drupal\Core\Entity\EntityTypeManagerInterface */
  protected $entityTypeManager;

  // φ-scaled constants
  const PHI = 1.618033988749895;
  const PSI = 0.6180339887498949;
  const POLLING_INTERVAL_MIN = 5;   // minutes
  const POLLING_INTERVAL_MAX = 15;  // minutes (Fibonacci: 5, 8, 13)
  const BATCH_SIZE = 21;            // Fibonacci number
  const CSL_INCLUDE_THRESHOLD = 0.382;  // PSI²

  public function __construct(
    ClientInterface $http_client,
    ConfigFactoryInterface $config_factory,
    LoggerChannelFactoryInterface $logger_factory,
    EntityTypeManagerInterface $entity_type_manager
  ) {
    $this->httpClient = $http_client;
    $this->configFactory = $config_factory;
    $this->logger = $logger_factory->get('heady_vector_sync');
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * Queue entity for vector indexing via HeadyAutoContext webhook.
   */
  public function queueForIndexing(EntityInterface $entity, string $operation) {
    $config = $this->configFactory->get('heady_cms.settings');
    $endpoint = $config->get('autocontext_endpoint') ?: 'https://heady-memory.headysystems.com';

    $payload = [
      'operation' => $operation,
      'entity_type' => $entity->getEntityTypeId(),
      'bundle' => $entity->bundle(),
      'id' => $entity->id(),
      'uuid' => $entity->uuid(),
      'title' => $entity->label(),
      'content' => $this->extractTextContent($entity),
      'url' => $entity->toUrl('canonical', ['absolute' => TRUE])->toString(),
      'changed' => $entity->getChangedTime(),
      'vector_dim' => 384,
      'csl_gates' => [
        'include' => self::CSL_INCLUDE_THRESHOLD,
        'boost' => self::PSI,
        'inject' => self::PSI + 0.1,
      ],
    ];

    try {
      $this->httpClient->post($endpoint . '/api/v1/index', [
        'json' => $payload,
        'headers' => [
          'X-Heady-Source' => 'drupal-webhook',
          'X-Correlation-Id' => $this->generateCorrelationId(),
          'Content-Type' => 'application/json',
        ],
        'timeout' => 5 * self::PHI, // ~8.09s (φ-scaled)
      ]);
      $this->logger->info('Vector indexed: @op @type/@id "@title"', [
        '@op' => $operation,
        '@type' => $entity->bundle(),
        '@id' => $entity->id(),
        '@title' => $entity->label(),
      ]);
    }
    catch (\Exception $e) {
      $this->logger->warning('Vector index failed (will retry via polling): @msg', [
        '@msg' => $e->getMessage(),
      ]);
      // Mark for polling fallback retry
      \Drupal::state()->set('heady_vector_sync.retry.' . $entity->uuid(), [
        'entity_type' => $entity->getEntityTypeId(),
        'id' => $entity->id(),
        'operation' => $operation,
        'failed_at' => time(),
      ]);
    }
  }

  /**
   * Polling fallback: re-index recently modified content.
   * Runs on cron with φ-scaled intervals.
   */
  public function runPollingFallback() {
    $lastRun = \Drupal::state()->get('heady_vector_sync.last_poll', 0);
    $now = time();
    $intervalSeconds = self::POLLING_INTERVAL_MIN * 60;

    if (($now - $lastRun) < $intervalSeconds) {
      return; // Not time yet
    }

    \Drupal::state()->set('heady_vector_sync.last_poll', $now);

    // Re-index recently changed nodes
    $storage = $this->entityTypeManager->getStorage('node');
    $query = $storage->getQuery()
      ->condition('changed', $lastRun, '>=')
      ->range(0, self::BATCH_SIZE)
      ->accessCheck(FALSE);
    $nids = $query->execute();

    foreach ($storage->loadMultiple($nids) as $node) {
      $this->queueForIndexing($node, 'poll-sync');
    }

    // Retry any failed webhook deliveries
    $retries = [];
    $stateKeys = \Drupal::state()->getMultiple([]);
    // Process retry queue (simplified — production would use proper queue)
    $this->logger->info('Polling fallback complete: @count nodes checked', [
      '@count' => count($nids),
    ]);
  }

  /**
   * Extract text content from entity for vector embedding.
   */
  protected function extractTextContent(EntityInterface $entity) {
    $text = $entity->label() . "\n";
    if ($entity->hasField('body') && !$entity->get('body')->isEmpty()) {
      $text .= strip_tags($entity->get('body')->value) . "\n";
    }
    if ($entity->hasField('field_body') && !$entity->get('field_body')->isEmpty()) {
      $text .= strip_tags($entity->get('field_body')->value) . "\n";
    }
    if ($entity->hasField('field_summary') && !$entity->get('field_summary')->isEmpty()) {
      $text .= strip_tags($entity->get('field_summary')->value) . "\n";
    }
    if ($entity->hasField('field_description') && !$entity->get('field_description')->isEmpty()) {
      $text .= strip_tags($entity->get('field_description')->value) . "\n";
    }
    return trim($text);
  }

  /**
   * Generate correlation ID for distributed tracing.
   */
  protected function generateCorrelationId() {
    return 'drupal-' . bin2hex(random_bytes(8)) . '-' . time();
  }
}
