import { decode, encode } from './base64';

export function serialize(obj) {
  return JSON.stringify(obj, (_key, value) =>
    ArrayBuffer.isView(value) ? '\0' + encode(value) : value,
  );
}

export function deserialize(str) {
  return JSON.parse(str, (key) =>
    typeof key === 'string' && key[0] === '\0' ? decode(key.slice(1)) : key,
  );
}
