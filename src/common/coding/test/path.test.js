import { encode, decode } from '../path.js';

test('encode_empty_string', () => {
  expect(encode('')).toEqual([]);
});

test('encode_string', () => {
  expect(encode('foo.bar')).toEqual(['foo', 'bar']);
});

test('encode_array', () => {
  expect(encode(['foo', 'bar'])).toEqual(['foo', 'bar']);
});

test('encode_object', () => {
  expect(encode(['foo', { bar: 43 }])).toEqual([
    'foo',
    '\x000kKXNM7-0B04V-------',
  ]);
});

test('double_encode', () => {
  expect(encode(['foo', '\x000kKXNM7-0B04V-------'])).toEqual([
    'foo',
    '\x000kKXNM7-0B04V-------',
  ]);
});

test('decode', () => {
  expect(decode(['foo', '\x000kKXNM7-0B04V-------'])).toEqual([
    'foo',
    { bar: 43 },
  ]);
});
