import { jest } from '@jest/globals';

// Capture the connection handler registered by wsServer so tests can simulate
// WebSocket events without a real network connection.
const serverHandlers = {};
const mockWss = {
  on: jest.fn((event, handler) => {
    serverHandlers[event] = handler;
  }),
  clients: new Set(),
};

jest.unstable_mockModule('ws', () => ({
  WebSocketServer: jest.fn(() => mockWss),
}));

const { default: wsServer } = await import('./wsServer.js');

function makeMockWs() {
  const wsHandlers = {};
  const ws = {
    graffyStreams: {},
    on: jest.fn((event, handler) => {
      wsHandlers[event] = handler;
    }),
    send: jest.fn(),
    close: jest.fn(),
    terminate: jest.fn(),
    pingPending: false,
  };
  return { ws, wsHandlers };
}

describe('wsServer allowedOptions filtering', () => {
  let store;

  // Prevent setInterval (ping loop) from leaking into test output.
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    // null is a valid Graffy leaf: pack(null)=null, unpack(null)=null
    store = { call: jest.fn().mockResolvedValue(null) };
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

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).not.toHaveProperty('pgClient');
      expect(options).toHaveProperty('userId', 'alice');
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

      const [, , options] = store.call.mock.calls[0];
      expect(options).toEqual({ userId: 'bob', role: 'admin' });
    });

    test('handles null options without error', async () => {
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify(['req1', 'read', null, null]);
      await wsHandlers.message(msg);

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).toEqual({});
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

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).not.toHaveProperty('pgClient');
      expect(options).toHaveProperty('userId', 'alice');
    });
  });

  describe('watch', () => {
    test('strips non-allowedOptions from watch options', async () => {
      store.call = jest.fn(async function* () {});
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'watch1',
        'watch',
        null,
        { pgClient: { host: 'evil.com' }, userId: 'alice' },
      ]);
      await wsHandlers.message(msg);

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).not.toHaveProperty('pgClient');
      expect(options).toHaveProperty('userId', 'alice');
      expect(options).toHaveProperty('raw', true);
    });

    test('passes through allowedOptions for watch', async () => {
      store.call = jest.fn(async function* () {});
      const { ws, wsHandlers } = makeMockWs();
      serverHandlers.connection(ws);

      const msg = JSON.stringify([
        'watch1',
        'watch',
        null,
        { userId: 'carol' },
      ]);
      await wsHandlers.message(msg);

      const [, , options] = store.call.mock.calls[0];
      expect(options).toEqual({ userId: 'carol', raw: true });
    });
  });

  describe('auth callback', () => {
    let auth;

    beforeEach(() => {
      auth = jest.fn().mockResolvedValue(true);
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

      expect(auth).toHaveBeenCalledTimes(1);
      const [, , authOptions] = auth.mock.calls[0];
      expect(authOptions).not.toHaveProperty('pgClient');
      expect(authOptions).toHaveProperty('userId', 'alice');
    });
  });
});
