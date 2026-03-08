<?php

namespace Drupal\heady_cms\Service;

use GuzzleHttp\ClientInterface;
use Drupal\Core\State\StateInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;

/**
 * Cross-device clipboard sync — enables HeadyBuddy to transfer items
 * between devices, browsers, IDE extensions, and mobile apps.
 *
 * Uses Upstash Redis for real-time pub/sub and KV storage.
 * Each user has channels (default, code, images, files).
 * Items expire after φ^7 seconds (~29034s ≈ 8 hours).
 */
class ClipboardService {

  const PHI = 1.6180339887498949;
  const MAX_ITEM_SIZE = 1048576; // 1MB
  const DEFAULT_TTL = 29034;     // PHI_TIMING.CYCLE seconds

  protected $httpClient;
  protected $state;
  protected $currentUser;
  protected $logger;

  // Upstash Redis REST API
  protected $redisUrl;
  protected $redisToken;

  public function __construct(
    ClientInterface $http_client,
    StateInterface $state,
    AccountProxyInterface $current_user,
    LoggerChannelFactoryInterface $logger_factory
  ) {
    $this->httpClient = $http_client;
    $this->state = $state;
    $this->currentUser = $current_user;
    $this->logger = $logger_factory->get('heady_cms');
    $this->redisUrl = getenv('UPSTASH_REDIS_REST_URL') ?: 'https://finer-sole-64861.upstash.io';
    $this->redisToken = getenv('UPSTASH_REDIS_REST_TOKEN') ?: '';
  }

  /**
   * Copy item to clipboard channel.
   *
   * @param string $channel Channel name (default, code, images, files, links)
   * @param array $item ['type' => 'text|code|image|file|link', 'content' => ..., 'metadata' => [...]]
   * @param int|null $ttl TTL in seconds, defaults to PHI_TIMING.CYCLE
   */
  public function copy(string $channel, array $item, ?int $ttl = NULL): array {
    $uid = $this->currentUser->id();
    $ttl = $ttl ?? self::DEFAULT_TTL;

    if (strlen(json_encode($item)) > self::MAX_ITEM_SIZE) {
      return ['error' => 'Item exceeds 1MB limit'];
    }

    $clipboard_item = [
      'id' => $this->generateId(),
      'channel' => $channel,
      'type' => $item['type'] ?? 'text',
      'content' => $item['content'] ?? '',
      'metadata' => array_merge($item['metadata'] ?? [], [
        'source_device' => $item['source_device'] ?? 'unknown',
        'source_app' => $item['source_app'] ?? 'drupal',
      ]),
      'user_id' => $uid,
      'created_at' => time(),
      'expires_at' => time() + $ttl,
    ];

    // Store in Upstash Redis
    $key = "clipboard:{$uid}:{$channel}:{$clipboard_item['id']}";
    $this->redisSet($key, $clipboard_item, $ttl);

    // Add to channel list (sorted set by timestamp)
    $list_key = "clipboard:{$uid}:{$channel}:list";
    $this->redisCommand('ZADD', [$list_key, time(), $clipboard_item['id']]);
    $this->redisCommand('EXPIRE', [$list_key, $ttl]);

    // Publish to real-time channel for cross-device sync
    $this->redisCommand('PUBLISH', [
      "clipboard:sync:{$uid}",
      json_encode([
        'action' => 'copy',
        'channel' => $channel,
        'item_id' => $clipboard_item['id'],
        'type' => $clipboard_item['type'],
        'preview' => mb_substr($clipboard_item['content'], 0, 100),
      ]),
    ]);

    $this->logger->info('Clipboard copy: @type to @channel', [
      '@type' => $clipboard_item['type'],
      '@channel' => $channel,
    ]);

    return ['status' => 'copied', 'item' => $clipboard_item];
  }

  /**
   * Paste — get most recent item from a channel.
   */
  public function paste(string $channel): array {
    $uid = $this->currentUser->id();
    $list_key = "clipboard:{$uid}:{$channel}:list";

    // Get most recent item ID
    $result = $this->redisCommand('ZREVRANGE', [$list_key, 0, 0]);
    if (empty($result) || empty($result[0])) {
      return ['error' => 'Clipboard empty', 'channel' => $channel];
    }

    $item_id = $result[0];
    $key = "clipboard:{$uid}:{$channel}:{$item_id}";
    $item = $this->redisGet($key);

    if (!$item) {
      return ['error' => 'Item expired', 'channel' => $channel];
    }

    return ['status' => 'pasted', 'item' => $item];
  }

  /**
   * List recent items from a channel.
   */
  public function listItems(string $channel, int $limit = 20): array {
    $uid = $this->currentUser->id();
    $list_key = "clipboard:{$uid}:{$channel}:list";

    $item_ids = $this->redisCommand('ZREVRANGE', [$list_key, 0, $limit - 1]);
    $items = [];

    foreach ($item_ids ?: [] as $item_id) {
      $key = "clipboard:{$uid}:{$channel}:{$item_id}";
      $item = $this->redisGet($key);
      if ($item) {
        $items[] = $item;
      }
    }

    return [
      'channel' => $channel,
      'items' => $items,
      'count' => count($items),
    ];
  }

  /**
   * List all channels with item counts.
   */
  public function listChannels(): array {
    $uid = $this->currentUser->id();
    $channels = ['default', 'code', 'images', 'files', 'links'];
    $result = [];

    foreach ($channels as $ch) {
      $list_key = "clipboard:{$uid}:{$ch}:list";
      $count = $this->redisCommand('ZCARD', [$list_key]);
      $result[] = [
        'name' => $ch,
        'count' => (int) ($count ?? 0),
      ];
    }

    return $result;
  }

  /**
   * Clear a channel.
   */
  public function clearChannel(string $channel): array {
    $uid = $this->currentUser->id();
    $list_key = "clipboard:{$uid}:{$channel}:list";

    $item_ids = $this->redisCommand('ZRANGE', [$list_key, 0, -1]);
    foreach ($item_ids ?: [] as $item_id) {
      $this->redisCommand('DEL', ["clipboard:{$uid}:{$channel}:{$item_id}"]);
    }
    $this->redisCommand('DEL', [$list_key]);

    return ['status' => 'cleared', 'channel' => $channel];
  }

  /**
   * Transfer — copy from one device/channel to another.
   * Used by HeadyBuddy for cross-device paste.
   */
  public function transfer(string $from_channel, string $to_channel, ?string $item_id = NULL): array {
    if ($item_id) {
      $uid = $this->currentUser->id();
      $item = $this->redisGet("clipboard:{$uid}:{$from_channel}:{$item_id}");
    }
    else {
      $result = $this->paste($from_channel);
      $item = $result['item'] ?? NULL;
    }

    if (!$item) {
      return ['error' => 'Nothing to transfer'];
    }

    $item['channel'] = $to_channel;
    return $this->copy($to_channel, $item);
  }

  // ── Redis helpers ────────────────────────────────────────────────

  protected function redisCommand(string $command, array $args): mixed {
    if (empty($this->redisToken)) {
      return NULL;
    }

    try {
      $response = $this->httpClient->request('POST', $this->redisUrl, [
        'headers' => [
          'Authorization' => 'Bearer ' . $this->redisToken,
          'Content-Type' => 'application/json',
        ],
        'json' => array_merge([$command], $args),
        'timeout' => 5,
      ]);
      $data = json_decode($response->getBody(), TRUE);
      return $data['result'] ?? NULL;
    }
    catch (\Exception $e) {
      $this->logger->warning('Redis error: @msg', ['@msg' => $e->getMessage()]);
      return NULL;
    }
  }

  protected function redisSet(string $key, array $value, int $ttl): void {
    $this->redisCommand('SET', [$key, json_encode($value), 'EX', $ttl]);
  }

  protected function redisGet(string $key): ?array {
    $result = $this->redisCommand('GET', [$key]);
    return $result ? json_decode($result, TRUE) : NULL;
  }

  protected function generateId(): string {
    return bin2hex(random_bytes(8));
  }

}
