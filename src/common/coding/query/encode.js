import { encode as encodeTree } from '../tree.js';

export default function query(obj, version = 0) {
  return encodeTree(obj, { version, isGraph: false });
}
