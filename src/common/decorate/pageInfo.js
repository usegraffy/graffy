import { isRange } from '../node';
import { decodeArgs } from '../encode/index.js';

export default function pageInfo(graph) {
  if (!graph || !graph.length) return {};
  const key = graph[0].key;
  let lastNode;
  for (let i = graph.length - 1; i >= 0; i--) {
    lastNode = graph[i];
    if (lastNode.key[0] === '\0') break;
  }
  const end = isRange(lastNode) ? lastNode.end : lastNode.key;

  const page = decodeArgs({ key, end });

  return {
    start: page.since || page.after,
    end: page.until || page.before,
    hasPrev: key !== '\0',
    hasNext: end !== '\0\uffff',
  };
}
