import { isPlainObject, MIN_KEY } from '../util.js';
import {
  encode as encodeArgs,
  decode as decodeArgs,
  splitArgs,
} from './args.js';

const PATH_SEPARATOR = '.';

export function encode(path) {
  if (typeof path === 'string') {
    if (!path.length || path === PATH_SEPARATOR) return [];
    path = path.split(PATH_SEPARATOR);
  }

  if (!Array.isArray(path)) {
    throw Error('encodePath.invalid:' + JSON.stringify(path));
  }

  function encodeSegment(seg) {
    if (ArrayBuffer.isView(seg)) return seg;
    const node = encodeArgs(seg);
    if (node.end) return node;
    return node.key;
  }

  if (isPlainObject(path[path.length - 1])) {
    const [page, filter] = splitArgs(path[path.length - 1]);
    if (page) path = path.slice(0, -1).concat([filter || MIN_KEY]);
  }

  return path.map(encodeSegment);
}

export function decode(path) {
  if (!Array.isArray(path)) {
    throw Error('decodePath.invalid:' + JSON.stringify(path));
  }

  return path.map((key) => decodeArgs({ key }));
}

export function splitRef($ref) {
  if (!Array.isArray($ref)) return [];
  const tail = $ref[$ref.length - 1];
  if (!isPlainObject(tail)) return [];
  return splitArgs(tail);
}
