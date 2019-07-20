import { getIndex } from '../getIndex';

describe('getIndex', () => {
  test('empty', () => {
    expect(getIndex([], 'foo')).toEqual(0);
  });
  test('afterLast', () => {
    expect(
      getIndex([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'zog'),
    ).toEqual(3);
  });
  test('beforeFirst', () => {
    expect(
      getIndex([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'bar'),
    ).toEqual(0);
  });
  test('middle', () => {
    expect(
      getIndex([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'fuz'),
    ).toEqual(1);
  });
  test('equalFirst', () => {
    expect(
      getIndex([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'foo'),
    ).toEqual(0);
  });
  test('equalLast', () => {
    expect(
      getIndex([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'huf'),
    ).toEqual(2);
  });
  test('equalMiddle', () => {
    expect(
      getIndex([{ key: 'foo' }, { key: 'gah' }, { key: 'huf' }], 'gah'),
    ).toEqual(1);
  });
  test('inRange', () => {
    expect(
      getIndex([{ key: 'foo', end: 'gag' }, { key: 'gah' }], 'fuz'),
    ).toEqual(0);
  });
  test('atRangeStart', () => {
    expect(
      getIndex([{ key: 'foo', end: 'gag' }, { key: 'gah' }], 'foo'),
    ).toEqual(0);
  });
  test('atRangeEnd', () => {
    expect(
      getIndex([{ key: 'foo', end: 'gag' }, { key: 'gah' }], 'gag'),
    ).toEqual(0);
  });
  test('outOfRange', () => {
    expect(
      getIndex([{ key: 'foo', end: 'foz' }, { key: 'gah' }], 'fuz'),
    ).toEqual(1);
  });
});
