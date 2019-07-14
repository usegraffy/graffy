import { encode, decode } from './url';

describe('encode', () => {
  test('empty', () => {
    expect(encode({})).toEqual('');
  });

  test('simple', () => {
    expect(encode({ foo: true, bar: true })).toEqual('bar,foo');
  });

  test('one-level', () => {
    expect(encode({ foo: { bar: true }, baz: true })).toEqual('baz,foo(bar)');
  });

  test('two-level', () => {
    expect(encode({ foo: { bar: { a: true, b: true } }, baz: true })).toEqual(
      'baz,foo(bar(a,b))',
    );
  });
});

describe('decode', () => {
  test('empty', () => {
    expect(decode('')).toEqual({});
  });

  test('simple', () => {
    expect(decode('foo,bar')).toEqual({ foo: true, bar: true });
  });

  test('one-level', () => {
    expect(decode('foo(bar),baz')).toEqual({ foo: { bar: true }, baz: true });
  });

  test('two-level', () => {
    expect(decode('baz,foo(bar(a,b))')).toEqual({
      foo: { bar: { a: true, b: true } },
      baz: true,
    });
  });
});
