import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addStringify, MAX_KEY, MIN_KEY } from '../../util.js';
import { decode, encode } from '../args.js';

const a = (...n) => addStringify(new Uint8Array(n));

describe('encode', () => {
  test('before_nofilter', () => {
    assert.deepStrictEqual(encode({ $before: ['a'] }), {
      key: a(),
      end: a(6, 5, 96, 255),
    });
  });

  test('filter', () => {
    assert.deepStrictEqual(encode({ foo: 42 }), {
      key: a(7, 5, 102, 111, 111, 0, 4, 192, 69),
    });
  });
});

describe('decode', () => {
  test('before_nofilter', () => {
    assert.deepStrictEqual(
      decode({
        key: a(),
        end: a(6, 5, 96, 255),
      }),
      { $before: ['a'] },
    );
  });

  test('filter', () => {
    assert.deepStrictEqual(
      decode({ key: a(7, 5, 102, 111, 111, 0, 4, 192, 69) }),
      { foo: 42 },
    );
  });

  test('backward', () => {
    assert.deepStrictEqual(decode({ key: MAX_KEY, end: MIN_KEY, limit: 100 }), {
      $last: 100,
    });
  });

  test('full_range', () => {
    assert.deepStrictEqual(decode({ key: MIN_KEY, end: MAX_KEY }), {
      $all: true,
    });
  });
});

test('filter_round_trip', () => {
  const original = { email: 'alice@example.com' };
  const encoded = encode(original);
  const decoded = decode(encoded);
  assert.deepStrictEqual(decoded, original);
});

test('empty_round_trip', () => {
  const original = { $first: 12 };
  const encoded = encode(original);
  const decoded = decode(encoded);
  assert.deepStrictEqual(decoded, original);
});
