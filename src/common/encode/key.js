import { encode as encodeString, decode as decodeString } from './string.js';
import { encode as encodeNumber, decode as decodeNumber } from './number.js';
import { encode as encodeB64, decode as decodeB64 } from './base64.js';

const NULL = 0;
const FALSE = 1;
const TRUE = 2;
const NUM = 3;
const STR = 4;
const ARR = 5;
const OBJ = 6;

function encodeArray(array) {
  return [
    ARR,
    encodeInteger(array.length),
    ...array.flatMap(value => encodeParts(value)),
  ];
}

function encodeObject(object) {
  const keys = Object.keys(object).sort();
  return [
    OBJ,
    encodeInteger(keys.length),
    ...keys.flatMap(key => [
      encodeString(key),
      NULL,
      ...encodeParts(object[key]),
    ]),
  ];
}

function encodeInteger(n) {
  // Note: Cannot use Uint32Array: We need to ensure big-endian for sortability.
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, n);
  return new Uint8Array(buffer);
}

function decodeInteger(u8Arr) {
  const { buffer, byteOffset, byteLength } = u8Arr;
  const view = new DataView(buffer, byteOffset, byteLength);
  return view.getUint32(0);
}

function encodeParts(value) {
  if (value === null) return [NULL];
  if (value === false) return [FALSE];
  if (value === true) return [TRUE];
  if (typeof value === 'number') return [NUM, encodeNumber(value)];
  if (typeof value === 'string') return [STR, encodeString(value), NULL];
  if (Array.isArray(value)) return encodeArray(value);
  if (typeof value === 'object') return encodeObject(value);
  return [NULL];
}

export function encode(value) {
  const parts = encodeParts(value);
  const length = parts.reduce(
    (sum, part) => sum + (typeof part === 'number' ? 1 : part.length),
    0,
  );
  const buffer = new Uint8Array(length);
  let i = 0;
  for (const part of parts) {
    if (typeof part === 'number') {
      buffer[i] = part;
      i++;
    } else {
      buffer.set(part, i);
      i += part.length;
    }
  }
  return encodeB64(buffer);
}

const COUNT = Symbol();
const NEXTKEY = Symbol();

export function decode(key) {
  let i = 0;
  const buffer = decodeB64(key);
  const root = [];
  root[COUNT] = Infinity;
  const stack = [root];

  function readString() {
    let start = i;
    while (i < buffer.length && buffer[i] !== 0) i++;
    const str = decodeString(buffer.subarray(start, i));
    i++;
    return str;
  }

  function pushToken(type, token) {
    let value;

    if (type === ARR) {
      value = [];
      if (token) {
        value[COUNT] = token;
        stack.push(value);
        return;
      }
    } else if (type === OBJ) {
      value = {};
      if (token) {
        value[COUNT] = token;
        value[NEXTKEY] = readString();
        stack.push(value);
        return;
      }
    } else {
      value = token;
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = stack[stack.length - 1];
      if (Array.isArray(current)) {
        current.push(value);
        current[COUNT]--;
      } else {
        current[current[NEXTKEY]] = value;
        if (--current[COUNT]) current[NEXTKEY] = readString();
      }
      if (current[COUNT]) break;

      delete current[COUNT];
      delete current[NEXTKEY];
      value = stack.pop();
    }
  }

  while (i < buffer.length) {
    const type = buffer[i];
    const start = ++i;
    switch (type) {
      case NULL:
        pushToken(type, null);
        break;
      case FALSE:
        pushToken(type, false);
        break;
      case TRUE:
        pushToken(type, true);
        break;
      case NUM:
        i += 8;
        pushToken(type, decodeNumber(buffer.subarray(start, i)));
        break;
      case STR:
        pushToken(type, readString());
        break;
      case ARR:
      case OBJ:
        i += 4;
        pushToken(type, decodeInteger(buffer.subarray(start, i)));
        break;
      default:
        throw new Error('Invalid byte ' + type + ' at ' + start);
    }
  }

  return stack[0][0];
}
