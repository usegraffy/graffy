/*
  Order-preserving encoding of 64-bit floating point numbers.
*/

function TwosComplement(view) {
  let lo = -view.getUint32(4) >>> 0;
  const carry = lo ? 0 : -1;
  let hi = (~view.getUint32(0) + carry) >>> 0;

  view.setUint32(0, hi);
  view.setUint32(4, lo);
}

export function encode(number) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  view.setFloat64(0, number);

  /* if first bit is set */
  if (number < 0) {
    TwosComplement(view);
  } else {
    /* non-negative number, just set the leading bit. */
    view.setUint8(0, view.getUint8(0) | 0x80);
  }

  return new Uint8Array(buffer);
}

export function decode(u8Arr) {
  const copy = new Uint8Array(8);
  copy.set(u8Arr, 0);
  const { buffer, byteOffset, byteLength } = copy;
  const view = new DataView(buffer, byteOffset, byteLength);
  const high = view.getUint8(0);

  if (high & 0x80) {
    // originally a non-negative number. Just set the sign bit back to 0.
    view.setUint8(0, high & 0x7f);
  } else {
    TwosComplement(view);
  }

  return view.getFloat64(0);
}
