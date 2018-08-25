import {
  encodeNumber,
  decodeNumber,
  // encodeString,
  // decodeString,
  // encodeTuple,
  // decodeTuple,
  // enc64,
  // dec64
} from './dencorder';
// import { string, number, boolean } from './types';

describe('dencorder', () => {
  test('average number', () => {
    let v = -1746.5567
    expect(v).toEqual(decodeNumber(encodeNumber(v)));
  });

  test('tiny number', () => {
    let v = .0000000001
    expect(v).toEqual(decodeNumber(encodeNumber(v)));
  });

  test('huge number', () => {
    let v = -1.74E123
    expect(v).toEqual(decodeNumber(encodeNumber(v)));
  });

  test('infinity', () => {
    let v = -Infinity
    expect(v).toEqual(decodeNumber(encodeNumber(v)));
  });

  test('nan', () => {
    let v = 0.2 * 'potato';
    expect(isNaN(decodeNumber(encodeNumber(v)))).toBe(true);
  });

  // test('string', () => {
  //   let v = 'potato\0';
  //   expect(v).toEqual(decodeString(encodeString(v)));
  // });
  //
  // test('enc64', () => {
  //   expect(enc64(encodeNumber(1746.5567))).toEqual('k8h9DVyF_fk');
  // });
  //
  // test('dec64', () => {
  //   expect(decodeNumber(dec64('k8h9DVyF_fk'))).toEqual(1746.5567);
  // });
  //
  // test.skip('tuple', () => {
  //   const t = [string, number, boolean];
  //   const v = ['123', 3.1416, false];
  //   expect(v).toEqual(decodeTuple(t, encodeTuple(t, v)));
  // });
});
