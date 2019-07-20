import { isRange } from '../node';

export default function pageInfo(graph) {
  if (!graph || !graph.length) return {};
  const start = graph[0].key;
  const lastNode = graph[graph.length - 1];
  const end = isRange(lastNode) ? lastNode.end : lastNode.key;
  return { start, end, hasPrev: start !== '', hasNext: end !== '\uffff' };
}
