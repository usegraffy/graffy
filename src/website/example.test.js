import { fork } from 'child_process';
import puppeteer from 'puppeteer';

const PORT = 1025 + Math.floor(Math.random() * 30000);
jest.setTimeout(60000);

let server;
let browser;
beforeAll(() => {
  return Promise.all([
    new Promise((resolve, reject) => {
      server = fork(`${__dirname + '/server.js'}`, {
        env: { PORT },
        stdio: 'ignore',
        execArgv: ['--es-module-specifier-resolution=node'],
      });
      server.on('error', reject);
      server.on('message', (message) => {
        if (message === 'ready') resolve();
      });
    }),
    puppeteer.launch({ headless: true }).then((b) => {
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

  // Go to second page and assert.
  await (await page.$('.NextPage')).click();
  await page.waitForSelector('.Spinner', { hidden: true });
  expect((await page.$$('.Visitor')).length).toBe(12);
  label = await (await page.$('.CurrPage')).evaluate((el) => el.textContent);
  expect(label).toMatch(/after/);

  // Go to third page. This should have around 6 elements.
  await (await page.$('.NextPage')).click();
  await page.waitForSelector('.Spinner', { hidden: true });
  expect((await page.$$('.Visitor')).length).toBeLessThan(12);

  // Go back to second page.
  await (await page.$('.PrevPage')).click();
  await page.waitForSelector('.Spinner', { hidden: true });
  expect((await page.$$('.Visitor')).length).toBe(12);
  label = await (await page.$('.CurrPage')).evaluate((el) => el.textContent);
  expect(label).toMatch(/Last.*before/);

  // Go back to first page. The page label should flip around.
  await (await page.$('.PrevPage')).click();
  await page.waitForSelector('.Spinner', { hidden: true });
  expect((await page.$$('.Visitor')).length).toBe(12);
  label = await (await page.$('.CurrPage')).evaluate((el) => el.textContent);
  expect(label).toMatch(/First/);
  expect(label).not.toMatch(/after/);

  page.close();
}

const exampleUrl = `http://localhost:${PORT}/learn/10-Full-Example`;
test('exampleWs', () => runExampleTests(exampleUrl));
test('exampleHttp', () => runExampleTests(exampleUrl + '?usehttp'));

afterAll(() => {
  return Promise.all([
    new Promise((resolve, reject) => {
      server.kill();
      server.on('exit', resolve);
      server.on('error', reject);
    }),
    browser.close(),
  ]);
});
