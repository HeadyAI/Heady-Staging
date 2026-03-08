<?php

namespace Drupal\heady_cms\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Admin UI pages for CMS content management, task browser, and liquid dashboard.
 */
class ContentManagerController extends ControllerBase {

  protected $contentDelivery;
  protected $taskQueue;
  protected $nodeManager;

  public function __construct($content_delivery, $task_queue, $node_manager) {
    $this->contentDelivery = $content_delivery;
    $this->taskQueue = $task_queue;
    $this->nodeManager = $node_manager;
  }

  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('heady_cms.content_delivery'),
      $container->get('heady_cms.task_queue'),
      $container->get('heady_cms.liquid_node_manager')
    );
  }

  public function overview() {
    return [
      '#theme' => 'heady_cms_content_manager',
      '#sites' => $this->contentDelivery->getSitesSummary(),
      '#stats' => $this->contentDelivery->getStats(),
      '#recent_deploys' => [],
      '#attached' => ['library' => ['heady_cms/liquid_dashboard']],
    ];
  }

  public function tasks() {
    return [
      '#theme' => 'heady_cms_task_browser',
      '#tasks' => $this->taskQueue->listTasks('all', 'all', 50),
      '#queues' => $this->taskQueue->getQueueStats(),
      '#browser_status' => [],
      '#attached' => ['library' => ['heady_cms/liquid_dashboard']],
    ];
  }

  public function liquidDashboard() {
    return [
      '#theme' => 'heady_cms_liquid_dashboard',
      '#nodes' => $this->nodeManager->getAllNodes(),
      '#topology' => [],
      '#vectors' => [],
      '#phi_timing' => [
        'TICK' => 1000, 'PULSE' => 1618, 'BEAT' => 2618, 'BREATH' => 4236,
        'WAVE' => 6854, 'SURGE' => 11090, 'FLOW' => 17944, 'CYCLE' => 29034,
        'TIDE' => 46979, 'EPOCH' => 76013,
      ],
      '#attached' => ['library' => ['heady_cms/liquid_dashboard']],
    ];
  }

}
