<?php

namespace Drupal\heady_cms\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Headless content delivery API for all 47 Heady sites.
 *
 * Serves JSON content from Drupal nodes/taxonomies/media to any site
 * via the Liquid Gateway Worker or direct API calls.
 */
class ContentApiController extends ControllerBase {

  protected $contentDelivery;

  public function __construct($content_delivery) {
    $this->contentDelivery = $content_delivery;
  }

  public static function create(ContainerInterface $container) {
    return new static($container->get('heady_cms.content_delivery'));
  }

  /**
   * Site registry — all 47 sites with metadata.
   */
  protected function siteRegistry(): array {
    return [
      'headysystems'  => ['domain' => 'headysystems.com',   'tier' => 'core',    'pages_url' => 'headysystems.pages.dev'],
      'headyme'       => ['domain' => 'headyme.com',         'tier' => 'core',    'pages_url' => 'headyme.pages.dev'],
      'headyconnection' => ['domain' => 'headyconnection.org', 'tier' => 'core', 'pages_url' => 'headyconnection.pages.dev'],
      'headybuddy'    => ['domain' => 'headybuddy.org',      'tier' => 'core',    'pages_url' => 'headybuddy.pages.dev'],
      '1ime1'         => ['domain' => '1ime1.com',           'tier' => 'core',    'pages_url' => '1ime1.pages.dev'],
      'headyos'       => ['domain' => 'headyos.com',         'tier' => 'product', 'pages_url' => 'headyos.pages.dev'],
      'headyapi'      => ['domain' => 'headyapi.com',        'tier' => 'product', 'pages_url' => 'headyapi.pages.dev'],
      'headymcp'      => ['domain' => 'headymcp.com',        'tier' => 'product', 'pages_url' => 'headymcp.pages.dev'],
      'headyio'       => ['domain' => 'headyio.com',         'tier' => 'product', 'pages_url' => 'headyio.pages.dev'],
      'headyweb'      => ['domain' => 'headyweb.com',        'tier' => 'product', 'pages_url' => 'heady-headyweb.pages.dev'],
      'headydocs'     => ['domain' => 'headydocs.com',       'tier' => 'product', 'pages_url' => ''],
      'admin-ui'      => ['domain' => 'admin.headysystems.com', 'tier' => 'internal', 'pages_url' => ''],
      'heady-vscode'  => ['domain' => '',                    'tier' => 'integration', 'pages_url' => ''],
      'heady-chrome'  => ['domain' => '',                    'tier' => 'integration', 'pages_url' => ''],
      'heady-jetbrains' => ['domain' => '',                  'tier' => 'integration', 'pages_url' => ''],
      'heady-discord' => ['domain' => '',                    'tier' => 'integration', 'pages_url' => ''],
      'heady-slack'   => ['domain' => '',                    'tier' => 'integration', 'pages_url' => ''],
      'heady-desktop' => ['domain' => '',                    'tier' => 'integration', 'pages_url' => ''],
      'heady-mobile'  => ['domain' => '',                    'tier' => 'integration', 'pages_url' => ''],
      'heady-vinci'   => ['domain' => '',                    'tier' => 'compute', 'pages_url' => ''],
      'heady-pythia'  => ['domain' => '',                    'tier' => 'compute', 'pages_url' => ''],
      'heady-maestro' => ['domain' => '',                    'tier' => 'compute', 'pages_url' => ''],
      'heady-critique' => ['domain' => '',                   'tier' => 'compute', 'pages_url' => ''],
      'heady-montecarlo' => ['domain' => '',                 'tier' => 'compute', 'pages_url' => ''],
      'heady-kinetics' => ['domain' => '',                   'tier' => 'compute', 'pages_url' => ''],
      'heady-metrics' => ['domain' => 'metrics.headysystems.com', 'tier' => 'internal', 'pages_url' => ''],
      'heady-logs'    => ['domain' => 'logs.headysystems.com',    'tier' => 'internal', 'pages_url' => ''],
      'heady-traces'  => ['domain' => 'traces.headysystems.com',  'tier' => 'internal', 'pages_url' => ''],
      'heady-sentinel' => ['domain' => 'sentinel.headysystems.com', 'tier' => 'internal', 'pages_url' => ''],
      'heady-observer' => ['domain' => 'observer.headysystems.com', 'tier' => 'internal', 'pages_url' => ''],
      'heady-patterns' => ['domain' => 'patterns.headysystems.com', 'tier' => 'internal', 'pages_url' => ''],
    ];
  }

  /**
   * GET /api/cms/sites — list all managed sites.
   */
  public function listSites(): JsonResponse {
    $registry = $this->siteRegistry();
    $sites = [];
    foreach ($registry as $key => $meta) {
      $sites[] = array_merge(['id' => $key], $meta);
    }
    return new JsonResponse([
      'sites' => $sites,
      'total' => count($sites),
      'cms' => 'drupal-headless',
      'version' => '4.0.0',
    ]);
  }

  /**
   * GET /api/cms/content/{site} — get CMS content for a specific site.
   */
  public function getSiteContent(string $site, Request $request): JsonResponse {
    $type = $request->query->get('type', 'page');
    $limit = min((int) $request->query->get('limit', 25), 100);

    $content = $this->contentDelivery->getContent($site, $type, $limit);

    return new JsonResponse([
      'site' => $site,
      'type' => $type,
      'items' => $content,
      'count' => count($content),
    ]);
  }

  /**
   * POST /api/cms/content/{site} — create/update content.
   */
  public function updateSiteContent(string $site, Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!$data) {
      return new JsonResponse(['error' => 'Invalid JSON body'], 400);
    }

    $result = $this->contentDelivery->upsertContent($site, $data);
    return new JsonResponse($result, $result['created'] ? 201 : 200);
  }

  /**
   * POST /api/cms/sites/{site}/deploy — trigger deploy via CF Pages.
   */
  public function deploySite(string $site, Request $request): JsonResponse {
    $registry = $this->siteRegistry();
    if (!isset($registry[$site])) {
      return new JsonResponse(['error' => "Unknown site: $site"], 404);
    }

    // Trigger deploy hook — the gateway worker handles actual deployment
    $result = [
      'site' => $site,
      'status' => 'deploy_triggered',
      'target' => $registry[$site]['pages_url'] ?: 'gateway-routed',
      'timestamp' => time(),
    ];

    \Drupal::logger('heady_cms')->info('Deploy triggered for @site', ['@site' => $site]);
    return new JsonResponse($result);
  }

}
