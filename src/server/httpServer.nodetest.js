import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, mock, test } from 'node:test';
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
    writeHead: mock.fn(),
    write: mock.fn(),
    end: mock.fn(),
    setHeader: mock.fn(),
    finished: false,
  };
}

describe('httpServer allowedOptions filtering', () => {
  let store;

  beforeEach(() => {
    // null is a valid Graffy leaf: pack(null)=null, unpack(null)=null
    store = { call: mock.fn(async () => null) };
  });

  describe('POST (read/write)', () => {
    test('strips options not in allowedOptions before store.call', async () => {
      const handler = httpServer(store, { allowedOptions: ['userId'] });
      const opts = encodeURIComponent(
        JSON.stringify({ pgClient: { host: 'evil.com' }, userId: 'alice' }),
      );
      const req = makeReq({
        method: 'POST',
        query: { op: 'read', opts },
        body: 'null',
      });
      await handler(req, makeRes());

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.ok(!('pgClient' in options));
      assert.strictEqual(options.userId, 'alice');
    });

    test('passes through allowedOptions', async () => {
      const handler = httpServer(store, { allowedOptions: ['userId', 'role'] });
      const opts = encodeURIComponent(
        JSON.stringify({ userId: 'bob', role: 'admin' }),
      );
      const req = makeReq({
        method: 'POST',
        query: { op: 'read', opts },
        body: 'null',
      });
      await handler(req, makeRes());

      const [, , options] = store.call.mock.calls[0].arguments;
      assert.deepStrictEqual(options, { userId: 'bob', role: 'admin' });
    });

    test('handles missing opts without error', async () => {
      const handler = httpServer(store);
      const req = makeReq({
        method: 'POST',
        query: { op: 'read' },
        body: 'null',
      });
      await handler(req, makeRes());

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.deepStrictEqual(options, {});
    });

    test('strips non-allowedOptions before passing options to auth', async () => {
      const auth = mock.fn(async () => true);
      const handler = httpServer(store, { auth, allowedOptions: ['userId'] });
      const opts = encodeURIComponent(
        JSON.stringify({ pgClient: { host: 'evil.com' }, userId: 'alice' }),
      );
      const req = makeReq({
        method: 'POST',
        query: { op: 'read', opts },
        body: '[]',
      });
      await handler(req, makeRes());

      assert.strictEqual(auth.mock.callCount(), 1);
      const [, , authOptions] = auth.mock.calls[0].arguments;
      assert.ok(!('pgClient' in authOptions));
      assert.strictEqual(authOptions.userId, 'alice');
    });
  });

  describe('GET (EventStream / watch)', () => {
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

    test('strips non-allowedOptions from watch options', async () => {
      store.call = mock.fn(async function* () {});
      const handler = httpServer(store, { allowedOptions: ['userId'] });
      const opts = encodeURIComponent(
        JSON.stringify({ pgClient: { host: 'evil.com' }, userId: 'alice' }),
      );
      const req = makeReq({
        method: 'GET',
        query: { opts },
        headers: { accept: 'text/event-stream' },
      });
      await handler(req, makeRes());

      assert.strictEqual(store.call.mock.callCount(), 1);
      const [, , options] = store.call.mock.calls[0].arguments;
      assert.ok(!('pgClient' in options));
      assert.strictEqual(options.userId, 'alice');
      assert.strictEqual(options.raw, true);
    });

    test('passes through allowedOptions for watch', async () => {
      store.call = mock.fn(async function* () {});
      const handler = httpServer(store, { allowedOptions: ['userId'] });
      const opts = encodeURIComponent(JSON.stringify({ userId: 'carol' }));
      const req = makeReq({
        method: 'GET',
        query: { opts },
        headers: { accept: 'text/event-stream' },
      });
      await handler(req, makeRes());

      const [, , options] = store.call.mock.calls[0].arguments;
      assert.deepStrictEqual(options, { userId: 'carol', raw: true });
    });

    test('strips non-allowedOptions before passing options to auth (watch)', async () => {
      const auth = mock.fn(async () => true);
      store.call = mock.fn(async function* () {});
      const handler = httpServer(store, { auth, allowedOptions: ['userId'] });
      const opts = encodeURIComponent(
        JSON.stringify({ pgClient: { host: 'evil.com' }, userId: 'alice' }),
      );
      const req = makeReq({
        method: 'GET',
        query: { opts },
        headers: { accept: 'text/event-stream' },
      });
      await handler(req, makeRes());

      assert.strictEqual(auth.mock.callCount(), 1);
      const [, , authOptions] = auth.mock.calls[0].arguments;
      assert.ok(!('pgClient' in authOptions));
      assert.strictEqual(authOptions.userId, 'alice');
    });
  });
});
