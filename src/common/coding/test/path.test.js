import { encode, decode } from '../path.js';
import { decode as decodeB64 } from '../base64';
// import { stringifyBuffer } from '../struct.js';

const binarr = decodeB64('0kKXNM7-0B04V-');
// binarr.toJSON = binarr.toString = stringifyBuffer;

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
  expect(encode(['foo', { bar: 43 }])).toEqual(['foo', binarr]);
});

test('double_encode', () => {
  expect(encode(['foo', binarr])).toEqual(['foo', binarr]);
});

test('decode', () => {
  expect(decode(['foo', binarr])).toEqual(['foo', { bar: 43 }]);
});

test('encodeEmptyObject', () => {
  expect(encode(['foo', { $first: 10 }])).toEqual(['foo', '\x000k']);
});

test('decodeEmptyObject', () => {
  expect(decode(['foo', '\x000k'])).toEqual(['foo', {}]);
});
