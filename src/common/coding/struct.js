import { encode as encodeString, decode as decodeString } from './string.js';
import { encode as encodeNumber, decode as decodeNumber } from './number.js';
import { encode as encodeB64, decode as decodeB64 } from './base64.js';

export const END = 0;
export const NULL = 1;
export const FALSE = 2;
export const TRUE = 3;
export const NUM = 4;
export const STR = 5;
export const ARR = 6;
export const OBJ = 7;

function encodeArray(array) {
  return [
    ARR,
    // encodeInteger(array.length),
    ...array.flatMap((value) => encodeParts(value)),
    END,
  ];
}

function encodeObject(object) {
  const keys = Object.keys(object).sort();
  return [
    OBJ,
    // encodeInteger(keys.length),
    ...keys.flatMap((key) => [
      STR,
      encodeString(key),
      END,
      ...encodeParts(object[key]),
    ]),
    END,
  ];
}

function encodeParts(value) {
  if (value === null) return [NULL];
  if (value === false) return [FALSE];
  if (value === true) return [TRUE];
  if (typeof value === 'number') return [NUM, encodeNumber(value)];
  if (typeof value === 'string') return [STR, encodeString(value), END];
  if (Array.isArray(value)) return encodeArray(value);
  if (typeof value === 'object') return encodeObject(value);
  return [NULL];
}

export function encode(value) {
  const parts = encodeParts(value);
  while (parts[parts.length - 1] === END) parts.pop();
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

const nextKey = new WeakMap();

export function decode(key) {
  let i = 0;
  const buffer = decodeB64(key, 0);

  /** @type {Array<{ [prop: string]: any }|Array>} */
  const stack = [[]];

  function readString() {
    let start = i;
    while (i < buffer.length && buffer[i] !== END) i++;
    const str = decodeString(buffer.subarray(start, i));
    i++;
    return str;
  }

  function pushToken(type, value) {
    const current = stack[stack.length - 1];
    if (type === ARR || type === OBJ) stack.push(value);
    if (!current) return;

    if (Array.isArray(current)) {
      current.push(value);
    } else {
      if (nextKey.has(current)) {
        current[nextKey.get(current)] = value;
        nextKey.delete(current);
      } else {
        nextKey.set(current, value);
      }
    }
  }

  function popToken() {
    stack.pop();
  }

  while (i < buffer.length) {
    const type = buffer[i];
    const start = ++i;
    switch (type) {
      case END:
        popToken();
        break;
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
        pushToken(type, []);
        break;
      case OBJ:
        pushToken(type, {});
        break;
      default:
        throw new Error('Invalid byte ' + type + ' at ' + start);
    }
  }

  return stack[0][0];
}
