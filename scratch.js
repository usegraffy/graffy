import { encode as b64e, decode as b64d } from './src/common/coding/base64.js';

export function encode(number) {
  const buffer = new ArrayBuffer(10);
  const v = new DataView(buffer);

  v.setFloat64(0, number);

  console.log('before flip', buffer);

  /* if first bit is set. bit flip all and add one. */
  if (number < 0) {
    let hi = ~v.getUint32(0);
    let lo = v.getUint32(4);

    if (lo === 0) {
      console.log(
        'Hi before bitflip',
        v.getUint32(0).toString(2).padStart(32, '0'),
      );
      console.log('Before high increment', hi.toString(2).padStart(32, '0'));
      hi = hi + 1;
      console.log('After high increment', hi.toString(2).padStart(32, '0'));
    } else {
      lo = ~lo + 1;
    }

    v.setUint32(0, hi);
    v.setUint32(4, lo);
  } else {
    /* non-negative number, just set the leading bit. */
    v.setUint8(0, v.getUint8(0) | 0x80);
  }

  // console.log('after signflip', buffer);

  const arr = new Uint8Array(buffer);

  // console.log('Before shift', arr);

  let width = -1;
  for (let i = 9; i >= 0; i--) {
    const hi = v.getUint8(Math.floor((i * 7) / 8));
    const lo = v.getUint8(Math.floor(((i + 1) * 7) / 8));
    const shift = 1 + (i % 8);

    const hiPart = (hi << (8 - shift)) & 0x7f;
    const loPart = lo >> shift;

    // console.log(
    //   'e',
    //   i,
    //   hi.toString(2).padStart(8, '0'),
    //   lo.toString(2).padStart(8, '0'),
    //   shift,
    //   hiPart.toString(2).padStart(8, '0'),
    //   loPart.toString(2).padStart(8, '0'),
    // );

    const encodedByte = (width >= 0 ? 0x80 : 0) | hiPart | loPart;

    v.setUint8(i, encodedByte);
    if (width < 0 && encodedByte) width = i + 1;
  }

  console.log('encoded', arr.buffer);

  return arr.slice(0, width);
}

export function decode(u8Arr) {
  const { buffer, byteOffset, byteLength } = u8Arr;
  const iv = new DataView(buffer, byteOffset, byteLength);

  // console.log('Before unshift', u8Arr);

  const tbuf = new ArrayBuffer(8);
  const v = new DataView(tbuf);

  for (let i = 0; i < 8; i++) {
    const hiPos = Math.floor((i * 8) / 7);
    const shift = 6 - (i % 7);

    const hi = hiPos < byteLength ? iv.getUint8(hiPos) : 0;
    const lo = hiPos < byteLength - 1 ? iv.getUint8(hiPos + 1) : 0;

    const hiPart = (hi << (7 - shift)) & 0xff;
    const loPart = ((lo << 1) & 0xff) >> (shift + 1);

    // console.log(
    //   'd',
    //   i,
    //   hi.toString(2).padStart(8, '0'),
    //   lo.toString(2).padStart(8, '0'),
    //   shift,
    //   hiPart.toString(2).padStart(8, '0'),
    //   loPart.toString(2).padStart(8, '0'),
    // );

    const decodedByte = hiPart | loPart;

    v.setUint8(i, decodedByte);
  }

  // console.log('after unshift', new Uint8Array(tbuf));

  // console.log('before unflip', tbuf);

  const high = v.getUint8(0);

  if (high & 0x80) {
    // originally a non-negative number. Just set the sign bit back to 0.
    v.setUint8(0, high & 0x7f);
  } else {
    let hi = v.getUint32(0);
    let lo = v.getUint32(4);

    if (lo === 0) {
      hi = hi - 1;
    } else {
      lo = lo - 1;
    }

    v.setUint32(0, ~hi);
    v.setUint32(4, ~lo);
  }

  console.log('after unflip', tbuf);

  return v.getFloat64(0);
}

// const N = 30;
// const nums = [+Infinity, -Infinity, 0, -0, 1, -1, Date.now()];

// for (let i = 0; i < N - 2; i++) {
//   nums.push(Math.tan(Math.PI * (Math.random() - 0.5)));
// }

// const encs = nums.map((num) => b64e(encode(num)));

// for (let i = 0; i < N - nums.length; i++) {
//   const dec = decode(b64d(encs[i]));
//   if (dec !== nums[i]) {
//     console.log('Round-trip error!', nums[i], encs[i], dec);
//   }
// }

// for (let i = 0; i < N - 1; i++) {
//   for (let j = i + 1; j < N; j++) {
//     const dn = nums[i] < nums[j] ? 1 : -1;
//     const de = encs[i] < encs[j] ? 1 : -1;
//     if (dn * de < 0)
//       console.log('Ordering error!', nums[i], nums[j], encs[i], encs[j]);
//   }
// }

// console.log(nums, encs);

// console.log(decode(encode(0)));
console.log(decode(encode(-1)));
