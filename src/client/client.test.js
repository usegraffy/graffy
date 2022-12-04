import { jest } from '@jest/globals';
import Graffy from '@graffy/core';
import { pack, unpack } from '@graffy/common';
import { e } from '@graffy/testing/encoder.js';

jest.unstable_mockModule('./Socket', () => ({
  default: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    isAlive: jest.fn(() => false),
  })),
}));

const client = (await import('./index.js')).default;
const MockSocket = (await import('./Socket.js')).default;

describe('wsClient', () => {
  // @ts-ignore
  globalThis.WebSocket = function () {};

  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(client('ws://example'));
  });

  // afterAll(() => {
  //   jest.mockRestore();
  // });

  test('readStatus', async () => {
    expect(await store.read('connection', { status: true })).toEqual({
      status: false,
    });
  });

  test('watchStatus', async () => {
    const stream = store.watch('connection', { status: true });
    expect((await stream.next()).value).toEqual({ status: false });

    const calls = MockSocket.mock.calls;
    const { onStatusChange } = calls[calls.length - 1][1];
    onStatusChange(true);
    expect((await stream.next()).value).toEqual({ status: true });
    onStatusChange(false);
    expect((await stream.next()).value).toEqual({ status: false });
  });

  test('reconnect', async () => {
    await store.write('connection', { status: true });
    const results = MockSocket.mock.results;
    expect(results[results.length - 1].value.isAlive).toBeCalled();
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
    expect(await store.read('connection', { url: true })).toEqual({
      url: connectionUrl,
    });
  });

  test('writeUrl', async () => {
    const newUrl = 'http://foobar';
    await store.write({ connection: { url: newUrl } });
    expect(await store.read('connection', { url: true })).toEqual({
      url: newUrl,
    });
  });
});

// async refers to the getOptions implementation
describe.each(['httpClient', 'async httpClient'])('%s', (description) => {
  // @ts-ignore
  globalThis.fetch = jest.fn().mockResolvedValue({
    status: 200,
    json: jest.fn().mockResolvedValue([['foo', 42]]),
    text: jest.fn().mockResolvedValue('[["foo",42]]'),
  });

  let store, getOptions;
  const connectionUrl = 'http://example';
  const value = '12345';

  beforeEach(() => {
    fetch.mockClear();
    if (description.startsWith('async')) {
      getOptions = jest.fn().mockResolvedValue({ value });
    } else {
      getOptions = jest.fn().mockReturnValue({ value });
    }
    store = new Graffy();
    store.use(client(connectionUrl, { getOptions }));
  });

  // afterAll(() => {
  //   jest.mockRestore();
  // });

  test('store read', async () => {
    await store.read({ demo: 1 });
    expect(getOptions).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      `${connectionUrl}?opts=${encodeURIComponent(
        JSON.stringify({ value }),
      )}&op=read`,
      {
        body: JSON.stringify(pack([{ key: e.demo, version: 0, value: 1 }])),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    );
  });

  // This test case will test batch output of graffy
  test('store query batching', async () => {
    await Promise.all([
      store.read({ demo: 1 }),
      store.read({ anotherDemo: 1 }),
      store.read({ demo: 1 }),
      store.read({ anotherDemo: 1 }),
    ]);
    expect(getOptions).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `${connectionUrl}?opts=${encodeURIComponent(
        JSON.stringify({ value }),
      )}&op=read`,
      {
        body: JSON.stringify(
          pack([
            { key: e.anotherDemo, version: 0, value: 2 },
            { key: e.demo, version: 0, value: 2 },
          ]),
        ),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    );
  });

  test('store write', async () => {
    await store.write({ demo: 1 });
    expect(getOptions).toHaveBeenCalled();
    const result = fetch.mock.calls;
    expect(result[0][0]).toBe(
      `${connectionUrl}?opts=${encodeURIComponent(
        JSON.stringify({ value }),
      )}&op=write`,
    );
    const requestInit = result[0][1];
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(requestInit.body).toEqual(expect.any(String));
    expect(unpack(JSON.parse(requestInit.body))).toEqual([
      { key: e.demo, version: expect.any(Number), value: 1 },
    ]);
  });
});
