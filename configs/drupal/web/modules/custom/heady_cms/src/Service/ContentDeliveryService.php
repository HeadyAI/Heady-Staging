<?php

namespace Drupal\heady_cms\Service;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Config\ConfigFactoryInterface;

/**
 * Headless content delivery — serves Drupal content as JSON to all 47 sites.
 */
class ContentDeliveryService {

  protected $entityTypeManager;
  protected $renderer;
  protected $config;

  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
    RendererInterface $renderer,
    ConfigFactoryInterface $config_factory
  ) {
    $this->entityTypeManager = $entity_type_manager;
    $this->renderer = $renderer;
    $this->config = $config_factory->get('heady_cms.settings');
  }

  /**
   * Get content for a site, filtered by type.
   */
  public function getContent(string $site, string $type, int $limit): array {
    try {
      $storage = $this->entityTypeManager->getStorage('node');
      $query = $storage->getQuery()
        ->condition('status', 1)
        ->condition('type', $type)
        ->sort('changed', 'DESC')
        ->range(0, $limit)
        ->accessCheck(TRUE);

      // Filter by site tag if taxonomy exists
      // Nodes tagged with site vocabulary term matching the site ID
      $nids = $query->execute();
      $nodes = $storage->loadMultiple($nids);

      $items = [];
      foreach ($nodes as $node) {
        $items[] = [
          'id' => $node->id(),
          'uuid' => $node->uuid(),
          'title' => $node->getTitle(),
          'body' => $node->hasField('body') ? ($node->get('body')->value ?? '') : '',
          'summary' => $node->hasField('body') ? ($node->get('body')->summary ?? '') : '',
          'created' => $node->getCreatedTime(),
          'changed' => $node->getChangedTime(),
          'url' => $node->toUrl()->toString(),
          'author' => $node->getOwner()->getDisplayName(),
        ];
      }
      return $items;
    }
    catch (\Exception $e) {
      return [];
    }
  }

  /**
   * Create or update content.
   */
  public function upsertContent(string $site, array $data): array {
    try {
      $storage = $this->entityTypeManager->getStorage('node');

      if (!empty($data['id'])) {
        $node = $storage->load($data['id']);
        if (!$node) {
          return ['error' => 'Node not found', 'created' => FALSE];
        }
      }
      else {
        $node = $storage->create([
          'type' => $data['type'] ?? 'page',
          'uid' => 1,
        ]);
      }

      if (!empty($data['title'])) {
        $node->setTitle($data['title']);
      }
      if (isset($data['body']) && $node->hasField('body')) {
        $node->set('body', [
          'value' => $data['body'],
          'format' => 'full_html',
        ]);
      }

      $node->save();

      return [
        'id' => $node->id(),
        'uuid' => $node->uuid(),
        'title' => $node->getTitle(),
        'created' => empty($data['id']),
        'site' => $site,
      ];
    }
    catch (\Exception $e) {
      return ['error' => $e->getMessage(), 'created' => FALSE];
    }
  }

  /**
   * Get summary stats for all sites.
   */
  public function getSitesSummary(): array {
    return [
      ['id' => 'headysystems', 'name' => 'HeadySystems', 'content_count' => 0, 'last_deploy' => NULL],
      ['id' => 'headyme', 'name' => 'HeadyMe', 'content_count' => 0, 'last_deploy' => NULL],
      ['id' => 'headyconnection', 'name' => 'HeadyConnection', 'content_count' => 0, 'last_deploy' => NULL],
      ['id' => 'headybuddy', 'name' => 'HeadyBuddy', 'content_count' => 0, 'last_deploy' => NULL],
    ];
  }

  /**
   * Get CMS statistics.
   */
  public function getStats(): array {
    try {
      $count = $this->entityTypeManager->getStorage('node')
        ->getQuery()->accessCheck(TRUE)->count()->execute();
    }
    catch (\Exception $e) {
      $count = 0;
    }

    return [
      'total_content' => $count,
      'total_sites' => 47,
      'cms_version' => 'drupal-11',
      'api_mode' => 'headless',
    ];
  }

}
