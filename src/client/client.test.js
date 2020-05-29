import Graffy from '@graffy/core';
import client from './index.js';
import MockSocket from './Socket'; // The mock is below, but gets hoisted.

jest.mock('./Socket', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    isAlive: jest.fn(),
  })),
}));
global.WebSocket = {}; // We don't need to actually mock this.

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
