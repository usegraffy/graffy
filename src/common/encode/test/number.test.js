import { encode, decode } from '../number';
// import { string, number, boolean } from './types';

describe('dencorder', () => {
  test('average number', () => {
    let v = -1746.5567;
    expect(v).toEqual(decode(encode(v)));
  });

  test('tiny number', () => {
    let v = 0.0000000001;
    expect(v).toEqual(decode(encode(v)));
  });

  test('huge number', () => {
    let v = -1.74e123;
    expect(v).toEqual(decode(encode(v)));
  });

  test('infinity', () => {
    let v = -Infinity;
    expect(v).toEqual(decode(encode(v)));
  });

  test('nan', () => {
    let v = 0.2 * 'potato';
    expect(isNaN(decode(encode(v)))).toBe(true);
  });

  // test('string', () => {
  //   let v = 'potato\0';
  //   expect(v).toEqual(decodeString(encodeString(v)));
  // });
  //
  // test('enc64', () => {
  //   expect(enc64(encode(1746.5567))).toEqual('k8h9DVyF_fk');
  // });
  //
  // test('dec64', () => {
  //   expect(decode(dec64('k8h9DVyF_fk'))).toEqual(1746.5567);
  // });
  //
  // test.skip('tuple', () => {
  //   const t = [string, number, boolean];
  //   const v = ['123', 3.1416, false];
  //   expect(v).toEqual(decodeTuple(t, encodeTuple(t, v)));
  // });
});
