/*
  dencorder.js
      order-preserving
   enco de  and
  de co de for any sortable type.
*/

const alpha =
  '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

export function encodeNumber(value) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  view.setFloat64(0, value);

  /* if first bit is set */
  if (value < 0) {
    view.setUint32(0, ~view.getUint32(0) >>> 0);
    view.setUint32(4, ~view.getUint32(4) >>> 0);
  } else {
    /* non-negative number, just set the leading bit. */
    view.setUint8(0, view.getUint8(0) | 0x80);
  }

  return enc64(buffer);
}

export function decodeNumber(string) {
  const view = new DataView(dec64(string));
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

function getByte(view, offset) {
  return offset < view.byteLength ? view.getUint8(offset) : 0;
}

function getChar(string, offset) {
  return offset < string.length ? alpha.indexOf(string[offset]) : 0;
}

function enc64(buffer) {
  const view = new DataView(buffer);
  let str = '';

  for (let i = 0; i < view.byteLength; i += 3) {
    let value =
      (getByte(view, i) << 16) +
      (getByte(view, i + 1) << 8) +
      getByte(view, i + 2);

    let gstr = '';
    for (let j = 0; j < 4; j++) {
      gstr = alpha[value & 0x3f] + gstr;
      value = (value >> 6) | 0;
    }
    str += gstr;
  }

  return str.substr(0, Math.ceil((view.byteLength * 4) / 3));
}

function dec64(string) {
  const buffer = new ArrayBuffer(Math.floor((string.length * 3) / 4));
  const view = new DataView(buffer);

  for (let i = 0; i < string.length; i += 4) {
    let value =
      (getChar(string, i) << 18) +
      (getChar(string, i + 1) << 12) +
      (getChar(string, i + 2) << 6) +
      getChar(string, i + 3);

    for (let j = (i * 3) / 4 + 2; j >= (i * 3) / 4; j--) {
      if (j < view.byteLength) view.setUint8(j, value & 0xff);
      value = (value >> 8) | 0;
    }
  }

  return buffer;
}
