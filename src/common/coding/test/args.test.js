import { encode, decode } from '../args.js';

describe('encode', () => {
  test('before_nofilter', () => {
    expect(encode({ $before: ['a'] })).toEqual({
      key: '',
      end: '\x000VKV\uffff',
    });
  });

  test('filter', () => {
    expect(encode({ foo: 42 })).toEqual({ key: '\x000kKaQqw-0B04--------' });
  });
});

describe('decode', () => {
  test('before_nofilter', () => {
    expect(
      decode({
        key: '',
        end: '\x000VKV\uffff',
      }),
    ).toEqual({ $before: ['a'] });
  });

  test('filter', () => {
    expect(decode({ key: '\x000kKaQqw-0B04--------' })).toEqual({ foo: 42 });
  });
});

test('filter_round_trip', () => {
  const original = { email: 'alice@example.com' };
  const encoded = encode(original);
  const decoded = decode(encoded);
  expect(decoded).toEqual(original);
});
