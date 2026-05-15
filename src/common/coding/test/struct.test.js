import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cmp } from '../../util.js';
import { decode, encode } from '../struct.js';

function tryValue(value) {
  const enc = encode(value);
  const dec = decode(enc);
  assert.deepStrictEqual(dec, value);
}

test('emptyobj', () => {
  tryValue({});
});

test('emptyarr', () => {
  tryValue([]);
});

test('simpleobj', () => {
  tryValue({ f: 3 });
});

test('simplearr', () => {
  tryValue([33]);
});

test('sink', () => {
  tryValue({
    a: '',
    b: -23.6,
    c: [1, false, 'Hello!', {}, []],
    d: true,
    e: null,
  });
});

test('num', () => tryValue(123));
test('str', () => tryValue('potatoes'));

test('arrayorder', () => {
  assert.strictEqual(cmp(encode([15.6, 'abc']), encode([15.7])) < 0, true);
  assert.strictEqual(cmp(encode([15.6, 'abc']), encode([15.6])) > 0, true);
});

test('emptystr', () => tryValue(''));
