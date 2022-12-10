import { decode, encode } from './base64.js';
import { decodeValue, encodeValue } from './index.js';
import { STR } from './struct.js';

const props = [
  'end',
  'version',
  'limit',
  'value',
  'path',
  'prefix',
  'children',
];

function serializeKey(key) {
  if (key[0] === STR) {
    const last = key[key.length - 1];
    if (last !== 0 && last !== 0xff) {
      return decodeValue(key);
    }
  }
  return `\0${encode(key)}`;
}

function deserializeKey(key) {
  if (key[0] === '\0') return decode(key.slice(1));
  return encodeValue(key);
}

export function pack(children, parentVersion) {
  if (!Array.isArray(children)) return children;
  const array = children.map((node) =>
    props.reduce(
      (array, prop, i) => {
        if (!(prop in node)) return array;
        let value = node[prop];
        if (prop === 'version' && value === parentVersion) return array;
        if (prop === 'children') value = pack(value, node.version);
        if (prop === 'end') value = serializeKey(value);
        if (prop === 'path') value = value.map(serializeKey);
        array[1] |= 1 << i;
        array.push(value);
        return array;
      },
      [serializeKey(node.key), 0],
    ),
  );
  return array;
}

export function unpack(children, parentVersion) {
  if (!Array.isArray(children)) return children;
  const node = children.map(([key, type, ...values]) =>
    props.reduce(
      (node, prop, i) => {
        if (!(type & (1 << i))) return node;
        let value = values.shift();
        if (prop === 'children') value = unpack(value, node.version);
        if (prop === 'end') value = deserializeKey(value);
        if (prop === 'path') value = value.map(deserializeKey);
        node[prop] = value;
        return node;
      },
      { key: deserializeKey(key), version: parentVersion },
    ),
  );
  return node;
}

// export function serialize(payload) {
//   return JSON.stringify(pack(payload));
// }

// export function deserialize(str) {
//   return unpack(JSON.parse(str));
// }
