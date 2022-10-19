import { keyBefore, keyAfter } from '../step.js';

const a = (...n) => new Uint8Array(n);

describe('keyBefore', () => {
  test('simple', () => {
    expect(keyBefore(a(3, 4, 5))).toEqual(a(3, 4, 4, 255));
  });
  test('reverse keyAfter', () => {
    expect(keyBefore(a(3, 4, 5, 0))).toEqual(a(3, 4, 5));
  });
  test('preserve minKey', () => {
    expect(keyBefore(a())).toEqual(a());
  });
  test('preserve maxKey', () => {
    expect(keyBefore(a(255))).toEqual(a(255));
  });
});

describe('keyAfter', () => {
  test('simple', () => {
    expect(keyAfter(a(3, 4, 5))).toEqual(a(3, 4, 5, 0));
  });
  test('reverse keyBefore', () => {
    expect(keyAfter(a(3, 4, 4, 255))).toEqual(a(3, 4, 5));
  });
  test('preserve minKey', () => {
    expect(keyAfter(a())).toEqual(a());
  });
  test('preserve maxKey', () => {
    expect(keyAfter(a(255))).toEqual(a(255));
  });
});
