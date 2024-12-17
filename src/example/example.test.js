import { fork } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jest } from '@jest/globals';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 1025 + Math.floor(Math.random() * 30000);
jest.setTimeout(120000);

describe('integration', () => {
  let server;
  let browser;
  beforeAll(() => {
    return Promise.all([
      new Promise((resolve, reject) => {
        server = fork(`${`${__dirname}/server.js`}`, {
          env: { PORT: String(PORT) },
          silent: true,
        });
        server.on('error', reject);
        server.on('exit', reject);
        server.on('message', (message) => {
          if (message === 'ready') resolve();
        });
      }),
      puppeteer
        .launch({
          headless: true,
          args: ['--no-sandbox'],
          // slowMo: 200,
        })
        .then((b) => {
          browser = b;
        }),
    ]);
  });

  async function runExampleTests(url) {
    const page = await browser.newPage();
    let label;

    // Go to example and wait until there are only two network connections.
    await page.goto(url, { waitUntil: 'networkidle2' });
    expect((await page.$$('.Visitor')).length).toBe(12);

    // console.log('Going to second page');
    // Go to second page and assert.
    await (await page.$('.NextPage')).click();
    // console.log('Clicked; waiting for spinner');
    await page.waitForSelector('.Spinner', { hidden: true, timeout: 2000 });
    expect((await page.$$('.Visitor')).length).toBe(12);
    label = await (await page.$('.CurrPage')).evaluate((el) => el.textContent);
    expect(label).toMatch(/after/);

    // console.log('Going to third page');
    // Go to third page. This should have around 6 elements.
    await (await page.$('.NextPage')).click();
    // console.log('Clicked; waiting for spinner');
    await page.waitForSelector('.Spinner', { hidden: true, timeout: 2000 });
    expect((await page.$$('.Visitor')).length).toBeLessThan(12);

    // console.log('Going back to second page');
    // Go back to second page.
    await (await page.$('.PrevPage')).click();
    // console.log('Clicked; waiting for spinner');
    await page.waitForSelector('.Spinner', { hidden: true, timeout: 2000 });
    expect((await page.$$('.Visitor')).length).toBe(12);
    label = await (await page.$('.CurrPage')).evaluate((el) => el.textContent);
    expect(label).toMatch(/Last.*until/);

    // console.log('Going back to first page');
    // Go back to first page. The page label should flip around.
    let attempts = 0;
    do {
      await (await page.$('.PrevPage')).click();
      // console.log('Clicked; waiting for spinner');
      await page.waitForSelector('.Spinner', { hidden: true, timeout: 2000 });
      // console.log('Waiting for visitor');
      await page.waitForSelector('.Visitor', { timeout: 2000 });
      expect((await page.$$('.Visitor')).length).toBe(12);
      label = await (await page.$('.CurrPage')).evaluate(
        (el) => el.textContent,
      );
      attempts++;
    } while (!label.includes('First') && attempts < 2);
    expect(label).toMatch(/First/);
    expect(label).not.toMatch(/after/);

    await page.close();
  }

  const exampleUrl = `http://localhost:${PORT}`;
  test('exampleWs', () => runExampleTests(exampleUrl));
  test('exampleHttp', () => runExampleTests(`${exampleUrl}?usehttp`));

  afterAll(() =>
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
