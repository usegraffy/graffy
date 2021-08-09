import { isPlainObject } from '../util.js';
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
    if (typeof seg === 'string') return seg;
    const { key, end } = encodeArgs(seg);
    if (end) throw 'encodePath.unexpected_range_key';
    return key;
  }

  if (!isPlainObject(path[path.length - 1])) return path.map(encodeSegment);

  const [page, filter] = splitArgs(path[path.length - 1]);
  if (!page) return path.map(encodeSegment);

  return path.slice(0, -1).concat([filter]).map(encodeSegment);
}

export function decode(path) {
  if (!Array.isArray(path)) {
    throw Error('decodePath.invalid:' + JSON.stringify(path));
  }

  return path.map((key) => decodeArgs({ key }));
}
