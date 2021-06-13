import { decode as decodeTree } from '../tree.js';

export default function decodeQuery(query) {
  return decodeTree(query, { isGraph: false });
}
