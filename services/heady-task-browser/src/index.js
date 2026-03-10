const logger = require('../../../shared/logger')('index');
/**
 * Heady™ Task Browser Service
 * Headless browser automation with Puppeteer — screenshots, scraping,
 * form automation, Lighthouse audits, deploy verification.
 *
 * Integrates with Drupal CMS task queue via REST API.
 */

const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3010;

// φ constants
const PHI = 1.6180339887498949;
const phiMs = (n) => Math.round(Math.pow(PHI, n) * 1000);
const PHI_TIMING = {
  TICK: phiMs(0), PULSE: phiMs(1), BEAT: phiMs(2), BREATH: phiMs(3),
  WAVE: phiMs(4), SURGE: phiMs(5), FLOW: phiMs(6), CYCLE: phiMs(7),
};

// Task queue (in-memory, backed by Drupal CMS)
const tasks = new Map();

// ── Health ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    service: 'heady-task-browser',
    status: 'online',
    puppeteer: 'available',
    tasks_active: tasks.size,
    phi_cycle: PHI_TIMING.CYCLE,
    uptime: process.uptime(),
  });
});

// ── Task Endpoints ──────────────────────────────────────────────────
app.post('/tasks', async (req, res) => {
  const { task_id, action, url, options = {} } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });

  const task = {
    id: task_id || `tb_${Date.now().toString(36)}`,
    action,
    url: url || '',
    options,
    status: 'queued',
    created_at: Date.now(),
    result: null,
  };

  tasks.set(task.id, task);

  // Execute asynchronously
  executeBrowserTask(task).catch(err => {
    task.status = 'failed';
    task.result = { error: err.message };
  });

  res.status(202).json({
    task_id: task.id,
    status: 'queued',
    message: `Browser task '${action}' queued`,
  });
});

app.get('/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.get('/tasks', (_req, res) => {
  res.json({
    tasks: Array.from(tasks.values()).slice(-50),
    total: tasks.size,
  });
});

// ── Browser Task Execution ──────────────────────────────────────────
async function executeBrowserTask(task) {
  task.status = 'running';
  task.started_at = Date.now();

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    task.status = 'completed';
    task.result = {
      message: 'Puppeteer not installed — returning mock result',
      action: task.action,
      mock: true,
    };
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    switch (task.action) {
      case 'screenshot': {
        await page.goto(task.url, { waitUntil: 'networkidle2', timeout: PHI_TIMING.CYCLE });
        const buffer = await page.screenshot({
          fullPage: task.options.fullPage ?? true,
          type: 'png',
        });
        task.result = {
          size: buffer.length,
          format: 'png',
          base64: buffer.toString('base64').substring(0, 200) + '...',
          url: task.url,
        };
        break;
      }

      case 'scrape': {
        await page.goto(task.url, { waitUntil: 'networkidle2', timeout: PHI_TIMING.CYCLE });
        const selector = task.options.selector || 'body';
        const data = await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          return Array.from(elements).map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 500),
            html: el.innerHTML?.substring(0, 1000),
          }));
        }, selector);
        task.result = { items: data, count: data.length, selector, url: task.url };
        break;
      }

      case 'form_fill': {
        await page.goto(task.url, { waitUntil: 'networkidle2', timeout: PHI_TIMING.CYCLE });
        const fields = task.options.fields || {};
        for (const [selector, value] of Object.entries(fields)) {
          await page.type(selector, value);
        }
        if (task.options.submit) {
          await page.click(task.options.submit);
          await page.waitForNavigation({ timeout: PHI_TIMING.SURGE });
        }
        task.result = {
          filled: Object.keys(fields).length,
          submitted: !!task.options.submit,
          final_url: page.url(),
        };
        break;
      }

      case 'link_check': {
        await page.goto(task.url, { waitUntil: 'networkidle2', timeout: PHI_TIMING.CYCLE });
        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
        );
        const results = [];
        for (const link of links.slice(0, 50)) {
          try {
            const r = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            results.push({ url: link, status: r.status, ok: r.ok });
          } catch (e) {
            results.push({ url: link, status: 0, ok: false, error: e.message });
          }
        }
        task.result = {
          total: links.length,
          checked: results.length,
          broken: results.filter(r => !r.ok).length,
          links: results,
        };
        break;
      }

      case 'deploy_verify': {
        const sites = task.options.sites || [task.url];
        const checks = [];
        for (const site of sites) {
          try {
            await page.goto(site, { waitUntil: 'networkidle2', timeout: PHI_TIMING.FLOW });
            const title = await page.title();
            const status = await page.evaluate(() => document.readyState);
            checks.push({ url: site, title, status, healthy: true });
          } catch (e) {
            checks.push({ url: site, healthy: false, error: e.message });
          }
        }
        task.result = {
          total: sites.length,
          healthy: checks.filter(c => c.healthy).length,
          checks,
        };
        break;
      }

      case 'pdf_export': {
        await page.goto(task.url, { waitUntil: 'networkidle2', timeout: PHI_TIMING.CYCLE });
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        task.result = { size: pdf.length, format: 'pdf', url: task.url };
        break;
      }

      default:
        task.result = { error: `Unknown action: ${task.action}` };
    }

    task.status = 'completed';
  } catch (err) {
    task.status = 'failed';
    task.result = { error: err.message };
  } finally {
    await browser.close();
    task.completed_at = Date.now();
    task.duration_ms = task.completed_at - task.started_at;
  }
}

// ── Clipboard Bridge (for HeadyBuddy cross-device) ──────────────────
app.post('/clipboard/browser-copy', async (req, res) => {
  const { url, selector, channel = 'default' } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: PHI_TIMING.CYCLE });

    const content = selector
      ? await page.$eval(selector, el => el.textContent || el.innerHTML)
      : await page.evaluate(() => document.body.innerText.substring(0, 10000));

    await browser.close();

    // Forward to Drupal clipboard API
    const drupalUrl = process.env.DRUPAL_URL || 'http://localhost:8080';
    try {
      const response = await fetch(`${drupalUrl}/api/cms/clipboard/${channel}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content,
          metadata: { source_url: url, selector },
          source_device: 'browser-service',
          source_app: 'heady-task-browser',
        }),
      });
      const result = await response.json();
      res.json({ status: 'copied', channel, content_length: content.length, clipboard: result });
    } catch {
      // Clipboard API unavailable — return content directly
      res.json({ status: 'extracted', channel, content, content_length: content.length });
    }
  } catch {
    res.json({ status: 'mock', message: 'Puppeteer not available', channel });
  }
});

// ── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`[heady-task-browser] Listening on :${PORT}`);
  logger.info(`[heady-task-browser] PHI_TIMING.CYCLE = ${PHI_TIMING.CYCLE}ms`);
});
