import assert from 'node:assert/strict';
import { test } from 'node:test';
import { e } from '@graffy/testing/encoder.ts';
import { decode as decodeB64 } from '../base64.ts';
import { decode, encode } from '../path.ts';

const binarr = decodeB64('0kKXNM7-0B04V-');

test('encode_empty_string', () => {
  assert.deepStrictEqual(encode(''), []);
});

test('encode_string', () => {
  assert.deepStrictEqual(encode('foo.bar'), [e.foo, e.bar]);
});

test('encode_array', () => {
  assert.deepStrictEqual(encode(['foo', 'bar']), [e.foo, e.bar]);
});

test('encode_object', () => {
  assert.deepStrictEqual(encode(['foo', { bar: 43 }]), [e.foo, binarr]);
});

test('decode', () => {
  assert.deepStrictEqual(decode([e.foo, binarr]), ['foo', { bar: 43 }]);
});

test('decodeEmptyObject', () => {
  assert.deepStrictEqual(decode([e.foo, decodeB64('0k')]), ['foo', {}]);
});
