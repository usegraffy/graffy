import { encode as encodeArgs, decode as decodeArgs } from './args.js';

const PATH_SEPARATOR = '.';

export function encode(path) {
  if (typeof path === 'string') {
    if (!path.length || path === PATH_SEPARATOR) return [];
    path = path.split(PATH_SEPARATOR);
  }

  if (!Array.isArray(path)) {
    throw Error('encodePath.invalid:' + JSON.stringify(path));
  }

  let encoded = path.slice(0, -1);
  const { key, end } = encodeArgs(path[path.length - 1]);
  encoded.push(typeof end === 'undefined' ? key : { key, end });
  return encoded;
}

export function decode(path) {
  if (!Array.isArray(path)) {
    throw Error('decodePath.invalid:' + JSON.stringify(path));
  }

  if (!path.length) return [];

  let decoded = path.slice(0, -1);
  decoded.push(decodeArgs(path[path.length - 1]));
  return decoded;
}
