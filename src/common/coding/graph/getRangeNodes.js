import { isRange, findFirst, findLast } from '../../node/index.js';
import { keyAfter, keyBefore } from '../../ops/index.js';

export default function getRangeNodes(graph, { key, end, limit = Infinity }) {
  const result = [];

  if (key < end) {
    for (let i = findFirst(graph, key); key <= end && limit > 0; i++) {
      const node = graph[i];
      if (!node || key < node.key) break;
      result.push(node);
      if (!isRange(node)) limit--;
      key = keyAfter(node.end || node.key);
    }
  } else {
    for (let i = findLast(graph, key) - 1; key >= end && limit > 0; i--) {
      const node = graph[i];
      if (!node || key > (node.end || node.key)) break;
      result.unshift(node);
      if (!isRange(node)) limit--;
      key = keyBefore(node.key);
    }
  }
  return result;
}
