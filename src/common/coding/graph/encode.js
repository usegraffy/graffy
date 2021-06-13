import { encode as encodeTree } from '../tree.js';

export default function graph(obj, version = Date.now()) {
  return encodeTree(obj, { version, isGraph: true });
}
