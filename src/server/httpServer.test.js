import { jest } from '@jest/globals';
import httpServer from './httpServer.js';

function makeReq({
  method = 'POST',
  query = {},
  body = null,
  headers = {},
} = {}) {
  const qs = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const url = qs ? `/?${qs}` : '/';
  const chunks = body != null ? [Buffer.from(body)] : [];
  return {
    url,
    method,
    headers,
    aborted: false,
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function makeRes() {
  return {
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn(),
    finished: false,
  };
}

describe('httpServer pgClient stripping', () => {
  let store;

  beforeEach(() => {
    // null is a valid Graffy leaf: pack(null)=null, unpack(null)=null
    store = { call: jest.fn().mockResolvedValue(null) };
  });

  describe('POST (read/write)', () => {
    test('strips pgClient from options before store.call', async () => {
      const handler = httpServer(store);
      const opts = encodeURIComponent(
        JSON.stringify({ pgClient: { host: 'evil.com' }, userId: 'alice' }),
      );
      const req = makeReq({
        method: 'POST',
        query: { op: 'read', opts },
        body: 'null',
      });
      await handler(req, makeRes());

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).not.toHaveProperty('pgClient');
      expect(options).toHaveProperty('userId', 'alice');
    });

    test('preserves non-pgClient options', async () => {
      const handler = httpServer(store);
      const opts = encodeURIComponent(
        JSON.stringify({ userId: 'bob', role: 'admin' }),
      );
      const req = makeReq({
        method: 'POST',
        query: { op: 'read', opts },
        body: 'null',
      });
      await handler(req, makeRes());

      const [, , options] = store.call.mock.calls[0];
      expect(options).toEqual({ userId: 'bob', role: 'admin' });
    });

    test('handles missing opts without error', async () => {
      const handler = httpServer(store);
      const req = makeReq({
        method: 'POST',
        query: { op: 'read' },
        body: 'null',
      });
      await handler(req, makeRes());

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).toEqual({});
    });
  });

  describe('GET (EventStream / watch)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('strips pgClient from watch options', async () => {
      store.call = jest.fn(async function* () {});
      const handler = httpServer(store);
      const opts = encodeURIComponent(
        JSON.stringify({ pgClient: { host: 'evil.com' }, userId: 'alice' }),
      );
      const req = makeReq({
        method: 'GET',
        query: { opts },
        headers: { accept: 'text/event-stream' },
      });
      await handler(req, makeRes());

      expect(store.call).toHaveBeenCalledTimes(1);
      const [, , options] = store.call.mock.calls[0];
      expect(options).not.toHaveProperty('pgClient');
      expect(options).toHaveProperty('userId', 'alice');
      expect(options).toHaveProperty('raw', true);
    });

    test('preserves non-pgClient options for watch', async () => {
      store.call = jest.fn(async function* () {});
      const handler = httpServer(store);
      const opts = encodeURIComponent(JSON.stringify({ userId: 'carol' }));
      const req = makeReq({
        method: 'GET',
        query: { opts },
        headers: { accept: 'text/event-stream' },
      });
      await handler(req, makeRes());

      const [, , options] = store.call.mock.calls[0];
      expect(options).toEqual({ userId: 'carol', raw: true });
    });
  });
});
