import { v4 } from 'uuid';
import { encode as b64encode, decode as b64decode } from './base64.js';

function doEncode(u8arr) {
  const { buffer, byteOffset, byteLength } = u8arr;
  const view = new DataView(buffer, byteOffset, byteLength);
  const int3 = view.getUint32(8);
  const int4 = view.getUint32(12);
  if (int3 >>> 30 !== 2) throw Error('encode_uuid.not_variant_1');

  view.setUint32(8, ((int3 & 0x3fffffff) << 2) | (int4 >>> 30));
  view.setUint32(12, (int4 & 0x3fffffff) << 2);

  return b64encode(u8arr).substr(0, 21);
}

export function id() {
  const u8arr = new Uint8Array(16);
  v4({}, u8arr);
  return doEncode(u8arr);
}

export function encode(u8arr) {
  // Make a copy so we aren't modifying the original
  return doEncode(new Uint8Array(u8arr));
}

export function decode(id) {
  const u8arr = b64decode(id);
  const { buffer, byteOffset, byteLength } = u8arr;
  const view = new DataView(buffer, byteOffset, byteLength);
  const int3 = view.getUint32(8);
  const int4 = view.getUint32(12);

  view.setUint32(8, (int3 >>> 2) | 0x80000000);
  view.setUint32(12, (int4 >>> 2) | (int3 << 30));

  return u8arr;
}
