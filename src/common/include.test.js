import { getShape, getInclude } from './include';

describe('getShape', () => {
  test('empty', () => {
    expect(getShape('')).toEqual({});
  });

  test('simple', () => {
    expect(getShape('foo,bar')).toEqual({ foo: true, bar: true });
  });

  test('one-level', () => {
    expect(getShape('foo(bar),baz')).toEqual({ foo: { bar: true }, baz: true });
  });

  test('two-level', () => {
    expect(getShape('baz,foo(bar(a,b))')).toEqual({
      foo: { bar: { a: true, b: true } },
      baz: true,
    });
  });
});

describe('getInclude', () => {
  test('empty', () => {
    expect(getInclude({})).toEqual('');
  });

  test('simple', () => {
    expect(getInclude({ foo: true, bar: true })).toEqual('bar,foo');
  });

  test('one-level', () => {
    expect(getInclude({ foo: { bar: true }, baz: true })).toEqual(
      'baz,foo(bar)',
    );
  });

  test('two-level', () => {
    expect(
      getInclude({ foo: { bar: { a: true, b: true } }, baz: true }),
    ).toEqual('baz,foo(bar(a,b))');
  });
});
