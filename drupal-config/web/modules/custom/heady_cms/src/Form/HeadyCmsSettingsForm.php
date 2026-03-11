<?php

namespace Drupal\heady_cms\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * CMS settings — configure content delivery, clipboard, liquid nodes, browser service.
 */
class HeadyCmsSettingsForm extends ConfigFormBase {

  protected function getEditableConfigNames() {
    return ['heady_cms.settings'];
  }

  public function getFormId() {
    return 'heady_cms_settings_form';
  }

  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('heady_cms.settings');

    $form['gateway'] = [
      '#type' => 'details',
      '#title' => $this->t('Liquid Gateway'),
      '#open' => TRUE,
    ];
    $form['gateway']['gateway_url'] = [
      '#type' => 'url',
      '#title' => $this->t('Gateway Worker URL'),
      '#default_value' => $config->get('gateway_url') ?: 'https://liquid-gateway-worker.emailheadyconnection.workers.dev',
    ];
    $form['gateway']['backend_origin'] = [
      '#type' => 'url',
      '#title' => $this->t('Backend Origin'),
      '#default_value' => $config->get('backend_origin') ?: 'https://manager.headysystems.com',
    ];

    $form['clipboard'] = [
      '#type' => 'details',
      '#title' => $this->t('Cross-Device Clipboard'),
      '#open' => TRUE,
    ];
    $form['clipboard']['upstash_url'] = [
      '#type' => 'url',
      '#title' => $this->t('Upstash Redis URL'),
      '#default_value' => $config->get('upstash_url') ?: 'https://finer-sole-64861.upstash.io',
    ];
    $form['clipboard']['clipboard_ttl'] = [
      '#type' => 'number',
      '#title' => $this->t('Clipboard TTL (seconds)'),
      '#description' => $this->t('Default: PHI_TIMING.CYCLE = 29034s'),
      '#default_value' => $config->get('clipboard_ttl') ?: 29034,
    ];

    $form['browser'] = [
      '#type' => 'details',
      '#title' => $this->t('Browser Automation Service'),
      '#open' => TRUE,
    ];
    $form['browser']['browser_service_url'] = [
      '#type' => 'url',
      '#title' => $this->t('Task Browser Service URL'),
      '#default_value' => $config->get('browser_service_url') ?: 'http://localhost:3010',
    ];

    $form['colab'] = [
      '#type' => 'details',
      '#title' => $this->t('Colab Pro+ Runtimes'),
      '#open' => FALSE,
    ];
    for ($i = 1; $i <= 3; $i++) {
      $form['colab']["colab_{$i}_endpoint"] = [
        '#type' => 'url',
        '#title' => $this->t("Colab Runtime @n Endpoint", ['@n' => $i]),
        '#default_value' => $config->get("colab_{$i}_endpoint") ?: '',
        '#description' => $this->t('ngrok or Colab tunnel URL'),
      ];
    }

    return parent::buildForm($form, $form_state);
  }

  public function submitForm(array &$form, FormStateInterface $form_state) {
    $this->config('heady_cms.settings')
      ->set('gateway_url', $form_state->getValue('gateway_url'))
      ->set('backend_origin', $form_state->getValue('backend_origin'))
      ->set('upstash_url', $form_state->getValue('upstash_url'))
      ->set('clipboard_ttl', $form_state->getValue('clipboard_ttl'))
      ->set('browser_service_url', $form_state->getValue('browser_service_url'))
      ->set('colab_1_endpoint', $form_state->getValue('colab_1_endpoint'))
      ->set('colab_2_endpoint', $form_state->getValue('colab_2_endpoint'))
      ->set('colab_3_endpoint', $form_state->getValue('colab_3_endpoint'))
      ->save();

    parent::submitForm($form, $form_state);
  }

}
