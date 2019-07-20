import { keyBefore, keyAfter } from '../step';

describe('keyBefore', () => {
  test('simple', () => {
    expect(keyBefore('foo')).toEqual('fon\uffff');
  });
  test('reverse keyAfter', () => {
    expect(keyBefore('foo\0')).toEqual('foo');
  });
  test('return same if empty', () => {
    expect(keyBefore('')).toEqual('');
  });
});

describe('keyAfter', () => {
  test('simple', () => {
    expect(keyAfter('foo')).toEqual('foo\0');
  });
  test('reverse keyBefore', () => {
    expect(keyAfter('fon\uffff')).toEqual('foo');
  });
  test('return same if last', () => {
    expect(keyAfter('\uffff')).toEqual('\uffff');
  });
});
