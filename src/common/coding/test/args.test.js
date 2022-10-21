import { MAX_KEY, MIN_KEY } from '../../util.js';
import { encode, decode } from '../args.js';

const a = (...n) => new Uint8Array(n);

describe('encode', () => {
  test('before_nofilter', () => {
    expect(encode({ $before: ['a'] })).toEqual({
      key: a(),
      end: a(6, 5, 96, 255),
    });
  });

  test('filter', () => {
    expect(encode({ foo: 42 })).toEqual({
      key: a(7, 5, 102, 111, 111, 0, 4, 192, 69),
    });
  });
});

describe('decode', () => {
  test('before_nofilter', () => {
    expect(
      decode({
        key: a(),
        end: a(6, 5, 96, 255),
      }),
    ).toEqual({ $before: ['a'] });
  });

  test('filter', () => {
    expect(decode({ key: a(7, 5, 102, 111, 111, 0, 4, 192, 69) })).toEqual({
      foo: 42,
    });
  });

  test('backward', () => {
    expect(decode({ key: MAX_KEY, end: MIN_KEY, limit: 100 })).toEqual({
      $last: 100,
    });
  });

  test('full_range', () => {
    expect(decode({ key: MIN_KEY, end: MAX_KEY })).toEqual({
      $all: true,
    });
  });
});

test('filter_round_trip', () => {
  const original = { email: 'alice@example.com' };
  const encoded = encode(original);
  const decoded = decode(encoded);
  expect(decoded).toEqual(original);
});

test('empty_round_trip', () => {
  const original = { $first: 12 };
  const encoded = encode(original);
  const decoded = decode(encoded);
  expect(decoded).toEqual(original);
});
