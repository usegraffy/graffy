import { keyBefore, keyAfter } from '../keyOps';

describe('keyBefore', () => {
  test('simple', () => {
    expect(keyBefore('foo')).toEqual('fon\uffff');
  });
  test('reverse keyAfter', () => {
    expect(keyBefore('foo\0')).toEqual('foo');
  });
  test('throw if empty', () => {
    expect(() => keyBefore('')).toThrow();
  });
});

describe('keyAfter', () => {
  test('simple', () => {
    expect(keyAfter('foo')).toEqual('foo\0');
  });
  test('reverse keyBefore', () => {
    expect(keyAfter('fon\uffff')).toEqual('foo');
  });
});
