import { isRange } from '../node';
import rangeToPage from './rangeToPage';

export default function pageInfo(graph) {
  if (!graph || !graph.length) return {};
  const start = graph[0].key;
  const lastNode = graph[graph.length - 1];
  const end = isRange(lastNode) ? lastNode.end : lastNode.key;

  const page = rangeToPage(start, end);

  return {
    start: page.after,
    end: page.before,
    hasPrev: start !== '',
    hasNext: end !== '\uffff',
  };
}
