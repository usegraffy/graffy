import { encode, decode } from '../number.js';
// import { string, number, boolean } from './types.js';

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
    let v = NaN;
    expect(isNaN(decode(encode(v)))).toBe(true);
  });
});
