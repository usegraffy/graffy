import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decode, encode } from '../string.ts';

function tryString(str) {
  const enc = encode(str);
  const dec = decode(enc);
  assert.deepStrictEqual(dec, str);
}

test('string', () => {
  tryString('');
  tryString('Hello');
});
