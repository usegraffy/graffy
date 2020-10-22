import Graffy from '@graffy/core';
import client from './';
import MockSocket from './Socket'; // The mock is below, but gets hoisted.

jest.mock('./Socket', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    isAlive: jest.fn(),
  })),
}));
global.WebSocket = {}; // removing this will result in failed test cases

describe('wsClient', () => {
  let store;
  beforeEach(() => {
    store = new Graffy();
    store.use(client('ws://example'));
  });

  test('readStatus', async () => {
    expect(await store.read('/connection', { status: true })).toEqual({
      status: false,
    });
  });

  test('watchStatus', async () => {
    const stream = store.watch('/connection', { status: true });
    expect((await stream.next()).value).toEqual({ status: false });

    const calls = MockSocket.mock.calls;
    const { onStatusChange } = calls[calls.length - 1][1];
    onStatusChange(true);
    expect((await stream.next()).value).toEqual({ status: true });
    onStatusChange(false);
    expect((await stream.next()).value).toEqual({ status: false });
  });

  test('reconnect', async () => {
    store.write('/connection', { status: true });
    const results = MockSocket.mock.results;
    expect(results[results.length - 1].value.isAlive).toBeCalled();
  });
});

describe('httpClient', () => {
  let store;
  const connectionUrl = 'http://example';
  beforeEach(() => {
    store = new Graffy();
    store.use(client(connectionUrl));
  });

  test('readUrl', async () => {
    expect(await store.read('/connection', { url: true })).toEqual({
      url: connectionUrl,
    });
  });

  test('writeUrl', async () => {
    const newUrl = 'http://foobar';
    await store.write({ connection: { url: newUrl } });
    expect(await store.read('/connection', { url: true })).toEqual({
      url: newUrl,
    });
  });
});
