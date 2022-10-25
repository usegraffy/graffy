import { decode, encode } from './base64.js';

export function serialize(obj) {
  return JSON.stringify(obj, (_key, value) => {
    return ArrayBuffer.isView(value) ? '\0' + encode(value) : value;
  });
}

export function deserialize(str) {
  return JSON.parse(str, (_key, value) =>
    typeof value === 'string' && value[0] === '\0'
      ? decode(value.slice(1))
      : value,
  );
}
