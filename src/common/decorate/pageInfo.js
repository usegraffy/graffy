import { isRange } from '../node';
import { decodeArgs } from '../encode/index.js';

export default function pageInfo(graph) {
  if (!graph || !graph.length) return {};
  const key = graph[0].key;
  const lastNode = graph[graph.length - 1];
  const end = isRange(lastNode) ? lastNode.end : lastNode.key;

  const page = decodeArgs({ key, end });

  return {
    start: page.since || page.after,
    end: page.until || page.before,
    hasPrev: key !== '\0',
    hasNext: end !== '\0\uffff',
  };
}
