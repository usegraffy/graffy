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
    expect(findFirst([], A.foo)).toEqual(0);
  });
  test('afterLast', () => {
    expect(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.zog),
    ).toEqual(3);
  });
  test('beforeFirst', () => {
    expect(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.bar),
    ).toEqual(0);
  });
  test('middle', () => {
    expect(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.fuz),
    ).toEqual(1);
  });
  test('equalFirst', () => {
    expect(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.foo),
    ).toEqual(0);
  });
  test('equalLast', () => {
    expect(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.huf),
    ).toEqual(2);
  });
  test('equalMiddle', () => {
    expect(
      findFirst([{ key: A.foo }, { key: A.gah }, { key: A.huf }], A.gah),
    ).toEqual(1);
  });
  test('inRange', () => {
    expect(
      findFirst([{ key: A.foo, end: A.gag }, { key: A.gah }], A.fuz),
    ).toEqual(0);
  });
  test('atRangeStart', () => {
    expect(
      findFirst([{ key: A.foo, end: A.gag }, { key: A.gah }], A.foo),
    ).toEqual(0);
  });
  test('atRangeEnd', () => {
    expect(
      findFirst([{ key: A.foo, end: A.gag }, { key: A.gah }], A.gag),
    ).toEqual(0);
  });
  test('outOfRange', () => {
    expect(
      findFirst([{ key: A.foo, end: A.foz }, { key: A.gah }], A.fuz),
    ).toEqual(1);
  });
});
