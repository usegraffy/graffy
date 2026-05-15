import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findFirst } from '../find.js';

const A = {
  bar: new Uint8Array([1, 2, 3]),
  foo: new Uint8Array([2, 3, 4]),
  foz: new Uint8Array([2, 3, 9]),
  fuz: new Uint8Array([2, 5, 9]),
  gag: new Uint8Array([3, 1, 3]),
  gah: new Uint8Array([3, 1, 4]),
  huf: new Uint8Array([4, 5, 6]),
  zog: new Uint8Array([11, 0, 5]),
};

describe('findFirst', () => {
  test('empty', () => {
    assert.deepStrictEqual(findFirst([], A.foo), 0);
  });
  test('afterLast', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.zog),
      3,
    );
  });
  test('beforeFirst', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.bar),
      0,
    );
  });
  test('middle', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.fuz),
      1,
    );
  });
  test('equalFirst', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.foo),
      0,
    );
  });
  test('equalLast', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.huf),
      2,
    );
  });
  test('equalMiddle', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.gah),
      1,
    );
  });
  test('inRange', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo, end: A.gag }, { key: A.gah }], A.fuz),
      0,
    );
  });
  test('atRangeStart', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo, end: A.gag }, { key: A.gah }], A.foo),
      0,
    );
  });
  test('atRangeEnd', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo, end: A.gag }, { key: A.gah }], A.gag),
      0,
    );
  });
  test('outOfRange', () => {
    assert.deepStrictEqual(
      findFirst([{ key: A.foo, end: A.foz }, { key: A.gah }], A.fuz),
      1,
    );
  });
});
