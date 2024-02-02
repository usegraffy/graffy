import { decode, encode } from '../number.js';
// import { string, number, boolean } from './types.js';

describe('dencorder', () => {
  test('average number', () => {
    const v = -1746.5567;
    expect(v).toEqual(decode(encode(v)));
  });

  test('tiny number', () => {
    const v = 0.0000000001;
    expect(v).toEqual(decode(encode(v)));
  });

  test('huge number', () => {
    const v = -1.74e123;
    expect(v).toEqual(decode(encode(v)));
  });

  test('infinity', () => {
    const v = -Infinity;
    expect(v).toEqual(decode(encode(v)));
  });

  test('nan', () => {
    const v = NaN;
    expect(Number.isNaN(decode(encode(v)))).toBe(true);
  });
});
