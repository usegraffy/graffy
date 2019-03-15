import getPath from './getPath';

describe('getPath', () => {
  test('empty', () => {
    expect(getPath({})).toEqual('');
  });

  test('simple', () => {
    expect(getPath({ foo: true, bar: true })).toEqual('bar,foo');
  });

  test('one-level', () => {
    expect(getPath({ foo: { bar: true }, baz: true })).toEqual('baz,foo(bar)');
  });

  test('two-level', () => {
    expect(getPath({ foo: { bar: { a: true, b: true } }, baz: true })).toEqual(
      'baz,foo(bar(a,b))',
    );
  });
});
