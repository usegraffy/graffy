import { e } from '@graffy/testing/encoder.js';
import { decode as decodeB64 } from '../base64.js';
import { decode, encode } from '../path.js';
// import { MAX_KEY, MIN_KEY } from '../../util.js';

const binarr = decodeB64('0kKXNM7-0B04V-');

test('encode_empty_string', () => {
  expect(encode('')).toEqual([]);
});

test('encode_string', () => {
  expect(encode('foo.bar')).toEqual([e.foo, e.bar]);
});

test('encode_array', () => {
  expect(encode(['foo', 'bar'])).toEqual([e.foo, e.bar]);
});

test('encode_object', () => {
  expect(encode(['foo', { bar: 43 }])).toEqual([e.foo, binarr]);
});

// test('double_encode', () => {
//   expect(encode(['foo', binarr])).toEqual([e.foo, binarr]);
// });

test('decode', () => {
  expect(decode([e.foo, binarr])).toEqual(['foo', { bar: 43 }]);
});

// TODO: Implement range paths and remove the prefix:true, splitRef
// and other similar concepts. And uncomment the following test.

// test('encodeRange', () => {
//   expect(encode(['foo', { $first: 10 }])).toEqual([
//     e.foo,
//     { key: MIN_KEY, end: MAX_KEY, limit: 10 },
//   ]);
// });

test('decodeEmptyObject', () => {
  expect(decode([e.foo, decodeB64('0k')])).toEqual(['foo', {}]);
});
