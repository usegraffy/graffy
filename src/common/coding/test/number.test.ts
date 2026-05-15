import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decode, encode } from '../number.ts';

describe('dencorder', () => {
  test('average number', () => {
    const v = -1746.5567;
    assert.deepStrictEqual(v, decode(encode(v)));
  });

  test('tiny number', () => {
    const v = 0.0000000001;
    assert.deepStrictEqual(v, decode(encode(v)));
  });

  test('huge number', () => {
    const v = -1.74e123;
    assert.deepStrictEqual(v, decode(encode(v)));
  });

  test('infinity', () => {
    const v = Number.NEGATIVE_INFINITY;
    assert.deepStrictEqual(v, decode(encode(v)));
  });

  test('nan', () => {
    const v = Number.NaN;
    assert.strictEqual(Number.isNaN(decode(encode(v))), true);
  });
});
