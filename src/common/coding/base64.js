import alpha from './alphabet';

function getByte(view, offset) {
  return offset < view.byteLength ? view.getUint8(offset) : 0;
}

function getChar(string, offset) {
  return offset < string.length ? alpha.indexOf(string[offset]) : 0;
}

export function encode(u8Arr) {
  const { buffer, byteOffset, byteLength } = u8Arr;
  const view = new DataView(buffer, byteOffset, byteLength);
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

export function decode(string, start = 0) {
  const buffer = new ArrayBuffer(Math.floor(((string.length - start) * 3) / 4));
  const view = new DataView(buffer);

  for (let i = start; i < string.length; i += 4) {
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

  return new Uint8Array(buffer);
}
