import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { keyAfter, keyBefore } from '../step.js';

const a = (...n) => new Uint8Array(n);

describe('keyBefore', () => {
  test('simple', () => {
    assert.deepStrictEqual(keyBefore(a(3, 4, 5)), a(3, 4, 4, 255));
  });
  test('reverse keyAfter', () => {
    assert.deepStrictEqual(keyBefore(a(3, 4, 5, 0)), a(3, 4, 5));
  });
  test('preserve minKey', () => {
    assert.deepStrictEqual(keyBefore(a()), a());
  });
  test('preserve maxKey', () => {
    assert.deepStrictEqual(keyBefore(a(255)), a(255));
  });
});

describe('keyAfter', () => {
  test('simple', () => {
    assert.deepStrictEqual(keyAfter(a(3, 4, 5)), a(3, 4, 5, 0));
  });
  test('reverse keyBefore', () => {
    assert.deepStrictEqual(keyAfter(a(3, 4, 4, 255)), a(3, 4, 5));
  });
  test('minKey', () => {
    assert.deepStrictEqual(keyAfter(a()), a(0));
  });
  test('preserve maxKey', () => {
    assert.deepStrictEqual(keyAfter(a(255)), a(255));
  });
});
