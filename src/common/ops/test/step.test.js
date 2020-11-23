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
  test('encodedStart', () => {
    expect(keyBefore('\0')).toEqual('\0');
  });
  test('encodedEnd', () => {
    expect(keyBefore('\0\uffff')).toEqual('\0\uffff');
  });
  test('encodedOther', () => {
    expect(keyBefore('\0foo')).toEqual('\0fon\uffff');
  });
  test('encodedKeyAfter', () => {
    expect(keyBefore('\0foo\0')).toEqual('\0foo');
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
  test('encodedStart', () => {
    expect(keyAfter('\0')).toEqual('\0');
  });
  test('encodedEnd', () => {
    expect(keyAfter('\0\uffff')).toEqual('\0\uffff');
  });
  test('encodedOther', () => {
    expect(keyAfter('\0foo')).toEqual('\0foo\0');
  });
  test('encodedKeyBefore', () => {
    expect(keyAfter('\0fon\uffff')).toEqual('\0foo');
  });
});
