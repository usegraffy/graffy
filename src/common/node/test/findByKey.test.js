import { findFirst } from '../find.js';

describe('findFirst', () => {
  test('empty', () => {
    expect(findFirst([], 'foo')).toEqual(0);
  });
  test('afterLast', () => {
    expect(
      findFirst([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'zog'),
    ).toEqual(3);
  });
  test('beforeFirst', () => {
    expect(
      findFirst([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'bar'),
    ).toEqual(0);
  });
  test('middle', () => {
    expect(
      findFirst([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'fuz'),
    ).toEqual(1);
  });
  test('equalFirst', () => {
    expect(
      findFirst([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'foo'),
    ).toEqual(0);
  });
  test('equalLast', () => {
    expect(
      findFirst([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'huf'),
    ).toEqual(2);
  });
  test('equalMiddle', () => {
    expect(
      findFirst([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'gah'),
    ).toEqual(1);
  });
  test('inRange', () => {
    expect(
      findFirst([{ key: 'foo', end: 'gag' }, { key: 'gah' }], 'fuz'),
    ).toEqual(0);
  });
  test('atRangeStart', () => {
    expect(
      findFirst([{ key: 'foo', end: 'gag' }, { key: 'gah' }], 'foo'),
    ).toEqual(0);
  });
  test('atRangeEnd', () => {
    expect(
      findFirst([{ key: 'foo', end: 'gag' }, { key: 'gah' }], 'gag'),
    ).toEqual(0);
  });
  test('outOfRange', () => {
    expect(
      findFirst([{ key: 'foo', end: 'foz' }, { key: 'gah' }], 'fuz'),
    ).toEqual(1);
  });
});
