import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';
import Graffy from '@graffy/core';
import Cache from './index.js';

describe('cache', () => {
  let store;
  let provider;

  beforeEach(() => {
    store = new Graffy();
    store.use(Cache());
    provider = mock.fn(() => ({ foo: 42 }));
    store.onRead(provider);
  });

  test('simple', async () => {
    const result1 = await store.read({ foo: 1 });
    assert.deepStrictEqual(result1, { foo: 42 });
    assert.strictEqual(provider.mock.callCount(), 1);
    const result2 = await store.read({ foo: 1 });
    assert.deepStrictEqual(result2, { foo: 42 });
    assert.strictEqual(provider.mock.callCount(), 1);
  });
});

// describe('expiry', () => {});

describe('optimism', () => {
  let store;
  let watchProvider;
  let writeProvider;
  let state = 42;

  beforeEach(() => {
    store = new Graffy();
    store.use(Cache());
    watchProvider = mock.fn(async function* () {
      yield { foo: state };
    });
    writeProvider = mock.fn(({ foo }) => {
      state = foo + 1;
      return { foo: foo + 1 };
    });
    store.onWatch(watchProvider);
    store.onWrite(writeProvider);
  });

  test('basic', async () => {
    const stream = store.watch({ foo: true });
    assert.deepStrictEqual((await stream.next()).value, { foo: 42 });
    assert.deepStrictEqual(await store.read({ foo: true }), { foo: 42 });

    store.write({ foo: 10 }, { optimism: true });
    assert.deepStrictEqual(await store.read({ foo: true }), { foo: 10 });
    assert.deepStrictEqual((await stream.next()).value, { foo: 10 });
    assert.deepStrictEqual(await store.read({ foo: true }), { foo: 11 });
    assert.deepStrictEqual((await stream.next()).value, { foo: 11 });
  });
});
