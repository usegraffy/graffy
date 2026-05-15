import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, mock, test } from 'node:test';

// Capture the connection handler registered by wsServer so tests can simulate
// WebSocket events without a real network connection.
const serverHandlers = {};
const mockWss = {
  on: mock.fn((event, handler) => {
    serverHandlers[event] = handler;
  }),
  clients: new Set(),
};

function MockWebSocketServer() {
  return mockWss;
}
mock.fn(MockWebSocketServer);

await mock.module('ws', {
  exports: {
    WebSocketServer: MockWebSocketServer,
  },
});

const { default: wsServer } = await import('./wsServer.js');

function makeMockWs() {
  const wsHandlers = {};
  const ws = {
    graffyStreams: {},
    on: mock.fn((event, handler) => {
      wsHandlers[event] = handler;
    }),
    send: mock.fn(),
    close: mock.fn(),
    terminate: mock.fn(),
    pingPending: false,
  };
  return { ws, wsHandlers };
}

describe('wsServer allowedOptions filtering', () => {
  let store;

  // Prevent setInterval (ping loop) from leaking into test output.
  before(() =>
    mock.timers.enable([
      'Date',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
    ]),
  );
  after(() => mock.timers.reset());

  beforeEach(() => {
    // null is a valid Graffy leaf: pack(null)=null, unpack(null)=null
    store = { call: mock.fn(async () => null) };
    wsServer(store, { allowedOptions: ['userId', 'role'] });
  });

  describe('read / write', () => {
    test('strips options not in allowedOptions before store.call', async () => {
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'req1',
        'read',
        null,
        { pgClient: { host: 'evil.com' }, userId: 'alice' },
      ]);
      await wsHandlers.message(msg);

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.ok(!('pgClient' in options));
      assert.strictEqual(options.userId, 'alice');
    });

    test('passes through allowedOptions', async () => {
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'req1',
        'read',
        null,
        { userId: 'bob', role: 'admin' },
      ]);
      await wsHandlers.message(msg);

      const [, , options] = store.call.mock.calls[0].arguments;
      assert.deepStrictEqual(options, { userId: 'bob', role: 'admin' });
    });

    test('handles null options without error', async () => {
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify(['req1', 'read', null, null]);
      await wsHandlers.message(msg);

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.deepStrictEqual(options, {});
    });

    test('strips non-allowedOptions from write options before store.call', async () => {
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'req1',
        'write',
        null,
        { pgClient: { host: 'evil.com' }, userId: 'alice' },
      ]);
      await wsHandlers.message(msg);

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.ok(!('pgClient' in options));
      assert.strictEqual(options.userId, 'alice');
    });
  });

  describe('watch', () => {
    test('strips non-allowedOptions from watch options', async () => {
      store.call = mock.fn(async function* () {});
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'watch1',
        'watch',
        null,
        { pgClient: { host: 'evil.com' }, userId: 'alice' },
      ]);
      await wsHandlers.message(msg);

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.ok(!('pgClient' in options));
      assert.strictEqual(options.userId, 'alice');
      assert.strictEqual(options.raw, true);
    });

    test('passes through allowedOptions for watch', async () => {
      store.call = mock.fn(async function* () {});
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'watch1',
        'watch',
        null,
        { userId: 'carol' },
      ]);
      await wsHandlers.message(msg);

      const [, , options] = store.call.mock.calls[0].arguments;
      assert.deepStrictEqual(options, { userId: 'carol', raw: true });
    });
  });

  describe('auth callback', () => {
    let auth;

    beforeEach(() => {
      auth = mock.fn(async () => true);
      wsServer(store, { auth, allowedOptions: ['userId'] });
    });

    test('strips non-allowedOptions before passing options to auth', async () => {
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'req1',
        'read',
        [],
        { pgClient: { host: 'evil.com' }, userId: 'alice' },
      ]);
      await wsHandlers.message(msg);

      assert.strictEqual(auth.mock.callCount(), 1);
      const [, , authOptions] = auth.mock.calls[0].arguments;
      assert.ok(!('pgClient' in authOptions));
      assert.strictEqual(authOptions.userId, 'alice');
    });
  });
});
