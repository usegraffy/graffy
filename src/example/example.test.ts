import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { dirname } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 1025 + Math.floor(Math.random() * 30000);

describe('integration', () => {
  let server;
  let browser;
  before(() => {
    return Promise.all([
      new Promise((resolve, reject) => {
        server = fork(`${`${__dirname}/server.ts`}`, {
          env: { PORT: String(PORT) },
          silent: true,
        });
        server.on('error', reject);
        server.on('exit', reject);
        server.on('message', (message) => {
          if (message === 'ready') resolve();
        });
      }),
      chromium
        .launch({
          headless: true,
          args: ['--no-sandbox'],
        })
        .then((b) => {
          browser = b;
        }),
    ]);
  });

  async function runExampleTests(url) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      userAgent: devices['Desktop Chrome'].userAgent,
    });
    let label;

    // Go to example and wait until there are visitors loaded
    await page.goto(url);
    await page.waitForFunction(
      () => document.querySelectorAll('.Visitor').length === 12,
      { timeout: 20000 },
    );

    // Check the visitor count
    const visitorCount = await page.locator('.Visitor').count();
    assert.strictEqual(visitorCount, 12);

    // Go to second page and assert.
    await page.locator('.NextPage').click();
    // Wait for spinner to disappear with a longer timeout
    await page.waitForSelector('.Spinner', { state: 'hidden', timeout: 5000 });
    // Wait a bit to ensure all visitors are loaded
    await page.waitForTimeout(1000);

    // Check visitor count and page label
    assert.strictEqual(await page.locator('.Visitor').count(), 12);
    label = await page.locator('.CurrPage').textContent();
    assert.match(label, /after/);

    // Go to third page. This should have around 6 elements.
    await page.locator('.NextPage').click();
    // Wait for spinner to disappear with a longer timeout
    await page.waitForSelector('.Spinner', { state: 'hidden', timeout: 5000 });
    // Wait a bit to ensure all visitors are loaded
    await page.waitForTimeout(1000);

    // Check that we have fewer visitors on this page
    assert.ok((await page.locator('.Visitor').count()) < 12);

    // Go back to second page.
    await page.locator('.PrevPage').click();
    // Wait for spinner to disappear with a longer timeout
    await page.waitForSelector('.Spinner', { state: 'hidden', timeout: 5000 });
    // Wait a bit to ensure all visitors are loaded
    await page.waitForTimeout(1000);

    // Check visitor count and page label
    assert.strictEqual(await page.locator('.Visitor').count(), 12);
    label = await page.locator('.CurrPage').textContent();
    assert.match(label, /Last.*until/);

    // Go back to first page. The page label should flip around.
    let attempts = 0;
    do {
      await page.locator('.PrevPage').click();
      // Wait for spinner to disappear with a longer timeout
      await page.waitForSelector('.Spinner', {
        state: 'hidden',
        timeout: 5000,
      });
      // Wait for visitors to appear with a longer timeout
      await page.waitForSelector('.Visitor', { timeout: 5000 });
      // Wait a bit to ensure all visitors are loaded
      await page.waitForTimeout(1000);

      // Check visitor count
      assert.strictEqual(await page.locator('.Visitor').count(), 12);
      label = await page.locator('.CurrPage').textContent();
      attempts++;
    } while (!label.includes('First') && attempts < 2);
    assert.match(label, /First/);
    assert.ok(!label.includes('after'));

    await page.close();
  }

  const exampleUrl = `http://localhost:${PORT}`;
  test(
    'exampleWs',
    { timeout: 120000 },
    async () => await runExampleTests(exampleUrl),
  );
  test(
    'exampleHttp',
    { timeout: 120000 },
    async () => await runExampleTests(`${exampleUrl}?usehttp`),
  );

  after(() =>
    Promise.all([
      browser.close(),
      new Promise((resolve, reject) => {
        server.kill();
        server.on('exit', resolve);
        server.on('error', reject);
      }),
    ]),
  );
});
