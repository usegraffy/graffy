import getQuery from './getQuery';

describe('getQuery', () => {
  test('empty', () => {
    expect(getQuery('')).toEqual({});
  });

  test('simple', () => {
    expect(getQuery('foo,bar')).toEqual({ foo: true, bar: true });
  });

  test('one-level', () => {
    expect(getQuery('foo(bar),baz')).toEqual({ foo: { bar: true }, baz: true });
  });

  test('two-level', () => {
    expect(getQuery('baz,foo(bar(a,b))')).toEqual({
      foo: { bar: { a: true, b: true } },
      baz: true,
    });
  });
});
