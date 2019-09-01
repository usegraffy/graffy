/*
  Order-preserving encoding of 64-bit floating point numbers.
*/

export function encode(number) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  view.setFloat64(0, number);

  /* if first bit is set */
  if (number < 0) {
    view.setUint32(0, ~view.getUint32(0) >>> 0);
    view.setUint32(4, ~view.getUint32(4) >>> 0);
  } else {
    /* non-negative number, just set the leading bit. */
    view.setUint8(0, view.getUint8(0) | 0x80);
  }

  return new Uint8Array(buffer);
}

export function decode(u8Arr) {
  const { buffer, byteOffset, byteLength } = u8Arr;
  const view = new DataView(buffer, byteOffset, byteLength);
  const high = view.getUint8(0);

  if (high & 0x80) {
    // originally a non-negative number. Just set the sign bit back to 0.
    view.setUint8(0, high & 0x7f);
  } else {
    view.setUint32(0, ~view.getUint32(0) >>> 0);
    view.setUint32(4, ~view.getUint32(4) >>> 0);
  }

  return view.getFloat64(0);
}
