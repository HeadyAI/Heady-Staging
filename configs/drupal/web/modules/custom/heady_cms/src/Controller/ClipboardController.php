<?php

namespace Drupal\heady_cms\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Cross-device clipboard API — used by HeadyBuddy, IDE extensions,
 * mobile apps, and browser extensions to sync clipboard items.
 *
 * Channels: default, code, images, files, links
 * Storage: Upstash Redis with PHI_TIMING.CYCLE TTL (29034s)
 * Sync: Redis pub/sub for real-time cross-device updates
 */
class ClipboardController extends ControllerBase {

  protected $clipboard;

  public function __construct($clipboard) {
    $this->clipboard = $clipboard;
  }

  public static function create(ContainerInterface $container) {
    return new static($container->get('heady_cms.clipboard'));
  }

  /**
   * POST /api/cms/clipboard/{channel}/copy
   *
   * Body: { "type": "text|code|image|file|link", "content": "...", "metadata": {...} }
   */
  public function copy(string $channel, Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!$data || empty($data['content'])) {
      return new JsonResponse(['error' => 'content is required'], 400);
    }

    // Detect source device from headers
    $data['source_device'] = $request->headers->get('X-Heady-Device', 'web');
    $data['source_app'] = $request->headers->get('X-Heady-App', 'api');

    $result = $this->clipboard->copy($channel, $data, $data['ttl'] ?? NULL);
    $code = isset($result['error']) ? 400 : 201;
    return new JsonResponse($result, $code);
  }

  /**
   * GET /api/cms/clipboard/{channel}/paste — get most recent item.
   */
  public function paste(string $channel): JsonResponse {
    $result = $this->clipboard->paste($channel);
    $code = isset($result['error']) ? 404 : 200;
    return new JsonResponse($result, $code);
  }

  /**
   * GET /api/cms/clipboard/{channel} — list recent items.
   */
  public function listItems(string $channel, Request $request): JsonResponse {
    $limit = min((int) $request->query->get('limit', 20), 100);
    $result = $this->clipboard->listItems($channel, $limit);
    return new JsonResponse($result);
  }

  /**
   * GET /api/cms/clipboard — list all channels with counts.
   */
  public function channels(): JsonResponse {
    $result = $this->clipboard->listChannels();
    return new JsonResponse(['channels' => $result]);
  }

  /**
   * POST /api/cms/clipboard/transfer — transfer between channels/devices.
   *
   * Body: { "from": "code", "to": "default", "item_id": "optional" }
   */
  public function transfer(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!$data || empty($data['from']) || empty($data['to'])) {
      return new JsonResponse(['error' => 'from and to channels required'], 400);
    }

    $result = $this->clipboard->transfer($data['from'], $data['to'], $data['item_id'] ?? NULL);
    $code = isset($result['error']) ? 400 : 200;
    return new JsonResponse($result, $code);
  }

  /**
   * DELETE /api/cms/clipboard/{channel}/clear — clear a channel.
   */
  public function clear(string $channel): JsonResponse {
    $result = $this->clipboard->clearChannel($channel);
    return new JsonResponse($result);
  }

}
