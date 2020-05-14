import { encode as encodeString, decode as decodeString } from './string.js';
import { encode as encodeNumber, decode as decodeNumber } from './number.js';
import { encode as encodeB64, decode as decodeB64 } from './base64.js';

const END = 0;
const NULL = 1;
const FALSE = 2;
const TRUE = 3;
const NUM = 4;
const STR = 5;
const ARR = 6;
const OBJ = 7;

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
  return '\0' + encodeB64(buffer);
}

const NEXTKEY = Symbol();

export function decode(key) {
  let i = 0;
  if (key[0] !== '\0') throw Error('decode.not_encoded_key');
  const buffer = decodeB64(key, 1);
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
      if (NEXTKEY in current) {
        current[current[NEXTKEY]] = value;
        delete current[NEXTKEY];
      } else {
        current[NEXTKEY] = value;
      }
    }
  }

  function popToken() {
    if (stack.length) delete stack[stack.length - 1][NEXTKEY];
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
