import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import Graffy from '@graffy/core';
import { page } from '@graffy/testing';
import Memory from './index.ts';

describe('final', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(Memory());
    store.onRead(() => {
      throw Error();
    });
    store.write({ foo: 42 });
  });

  test('simple', async () => {
    const result = await store.read({ foo: 1, bar: 1 });
    assert.deepStrictEqual(result, { foo: 42, bar: null });
  });

  test('watch', async () => {
    const result = store.watch({ foo: 1 });
    assert.deepStrictEqual((await result.next()).value, { foo: undefined });
    store.write({ foo: 44 });
    assert.deepStrictEqual((await result.next()).value, { foo: 44 });
  });

  test('range', async () => {
    store.write({ baz: [{ $key: ['a'], $ref: 'foo' }] });
    const result = await store.read('baz', [{ $key: { $first: 3 } }]);
    const expectedResult = page({}, null, [42]);
    assert.deepStrictEqual(result, expectedResult);
  });
});
