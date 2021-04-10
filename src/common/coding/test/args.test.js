import { encode, decode } from '../args.js';

describe('encode', () => {
  test('before_nofilter', () => {
    expect(encode({ $before: ['a'] })).toEqual({
      key: '',
      end: '\x000VKV\uffff',
    });
  });

  test('before_filter', () => {
    expect(encode({ $before: ['a'], foo: 42 })).toEqual({
      key: '\x000kKaQqw-0B04--------.',
      end: '\x000kKaQqw-0B04--------.0VKV\uffff',
    });
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

  test('before_filter', () => {
    expect(
      decode({
        key: '\x000kKaQqw-0B04--------.',
        end: '\x000kKaQqw-0B04--------.0VKV\uffff',
      }),
    ).toEqual({ $before: ['a'], foo: 42 });
  });
});

test('cursor', () => {
  const original = { $order: ['id'], $cursor: [123] };
  const encoded = encode(original);
  const decoded = decode(encoded);
  expect(decoded).toEqual(original);
});

test('firstNRange', () => {
  const original = { $order: ['id'], $first: 10 };
  const encoded = encode(original);
  const decoded = decode(encoded);
  expect(decoded).toEqual(original);
});
