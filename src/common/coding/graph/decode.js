import { decode as decodeTree } from '../tree.js';

export default function decodeGraph(graph) {
  return decodeTree(graph, { isGraph: true });
}
