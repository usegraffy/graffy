import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import Graffy from '../Graffy.ts';

describe('watch', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('object', async () => {
    g.onWatch('foo', async function* () {
      yield { a: 3 };
      await Promise.resolve();
      yield { a: 4 };
    });
    const subscription = g.watch({ foo: { a: true } });

    assert.deepStrictEqual((await subscription.next()).value, {
      foo: { a: 3 },
    });
    assert.deepStrictEqual((await subscription.next()).value, {
      foo: { a: 4 },
    });
  });
});
