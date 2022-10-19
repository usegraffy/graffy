import { decode } from './base64';

export function serialize(obj) {
  return JSON.stringify(obj).replace(/\uffff/g, '\\uffff');
}

export function deserialize(str) {
  return JSON.parse(str, (key) =>
    typeof key === 'string' && key[0] === '\0' ? decode(key.slice(1)) : key,
  );
}
