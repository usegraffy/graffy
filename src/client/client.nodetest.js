import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';
import { pack, unpack } from '@graffy/common';
import Graffy from '@graffy/core';
import { e } from '@graffy/testing/encoder.js';

await mock.module('./Socket.js', {
  exports: {
    default: mock.fn(() => ({
      start: mock.fn(),
      stop: mock.fn(),
      isAlive: mock.fn(() => false),
    })),
  },
});

const client = (await import('./index.js')).default;
const MockSocket = (await import('./Socket.js')).default;

describe('wsClient', () => {
  // @ts-expect-error
  globalThis.WebSocket = () => {};

  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(client('ws://example'));
  });

  test('readStatus', async () => {
    assert.deepStrictEqual(await store.read('connection', { status: true }), {
      status: false,
    });
  });

  test('watchStatus', async () => {
    const stream = store.watch('connection', { status: true });
    assert.deepStrictEqual((await stream.next()).value, { status: false });

    const calls = MockSocket.mock.calls;
    const { onStatusChange } = calls.at(-1).arguments[1];
    onStatusChange(true);
    assert.deepStrictEqual((await stream.next()).value, { status: true });
    onStatusChange(false);
    assert.deepStrictEqual((await stream.next()).value, { status: false });
  });

  test('reconnect', async () => {
    await store.write('connection', { status: true });
    assert.ok(MockSocket.mock.calls.at(-1).result.isAlive.mock.callCount() > 0);
  });
});

describe('httpClient connInfoPath', () => {
  let store;
  const connectionUrl = 'http://example';

  beforeEach(() => {
    store = new Graffy();
    store.use(client(connectionUrl));
  });

  test('readUrl', async () => {
    assert.deepStrictEqual(await store.read('connection', { url: true }), {
      url: connectionUrl,
    });
  });

  test('writeUrl', async () => {
    const newUrl = 'http://foobar';
    await store.write({ connection: { url: newUrl } });
    assert.deepStrictEqual(await store.read('connection', { url: true }), {
      url: newUrl,
    });
  });
});

// async refers to the getOptions implementation
for (const description of ['httpClient', 'async httpClient']) {
  describe(description, () => {
    // @ts-expect-error
    globalThis.fetch = mock.fn(async () => ({
      status: 200,
      json: mock.fn(async () => [['foo', 42]]),
      text: mock.fn(async () => '[["foo",42]]'),
    }));

    let store;
    let getOptions;
    const connectionUrl = 'http://example';
    const value = '12345';

    beforeEach(() => {
      globalThis.fetch.mock.resetCalls();
      if (description.startsWith('async')) {
        getOptions = mock.fn(async () => ({ value }));
      } else {
        getOptions = mock.fn(() => ({ value }));
      }
      store = new Graffy();
      store.use(client(connectionUrl, { getOptions }));
    });

    test('store read', async () => {
      await store.read({ demo: 1 });
      assert.ok(getOptions.mock.callCount() > 0);
      assert.deepStrictEqual(
        globalThis.fetch.mock.calls[0].arguments[0],
        `${connectionUrl}?opts=${encodeURIComponent(JSON.stringify({ value }))}&op=read`,
      );
      assert.deepStrictEqual(globalThis.fetch.mock.calls[0].arguments[1], {
        body: JSON.stringify(pack([{ key: e.demo, version: 0, value: 1 }])),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    });

    // This test case will test batch output of graffy
    test('store query batching', async () => {
      await Promise.all([
        store.read({ demo: 1 }),
        store.read({ anotherDemo: 1 }),
        store.read({ demo: 1 }),
        store.read({ anotherDemo: 1 }),
      ]);
      assert.ok(getOptions.mock.callCount() > 0);
      assert.strictEqual(globalThis.fetch.mock.callCount(), 1);
      assert.deepStrictEqual(
        globalThis.fetch.mock.calls[0].arguments[0],
        `${connectionUrl}?opts=${encodeURIComponent(JSON.stringify({ value }))}&op=read`,
      );
      assert.deepStrictEqual(globalThis.fetch.mock.calls[0].arguments[1], {
        body: JSON.stringify(
          pack([
            { key: e.anotherDemo, version: 0, value: 2 },
            { key: e.demo, version: 0, value: 2 },
          ]),
        ),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    });

    test('store write', async () => {
      await store.write({ demo: 1 });
      assert.ok(getOptions.mock.callCount() > 0);
      const result = globalThis.fetch.mock.calls;
      assert.strictEqual(
        result[0].arguments[0],
        `${connectionUrl}?opts=${encodeURIComponent(JSON.stringify({ value }))}&op=write`,
      );
      const requestInit = result[0].arguments[1];
      assert.strictEqual(requestInit.method, 'POST');
      assert.deepStrictEqual(requestInit.headers, {
        'Content-Type': 'application/json',
      });
      assert.ok(typeof requestInit.body === 'string');
      const parsedBody = unpack(JSON.parse(requestInit.body));
      assert.ok(Array.isArray(parsedBody) && parsedBody.length === 1);
      assert.deepStrictEqual(parsedBody[0].key, e.demo);
      assert.ok(typeof parsedBody[0].version === 'number');
      assert.strictEqual(parsedBody[0].value, 1);
    });
  });
}
