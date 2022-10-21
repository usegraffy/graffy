/*
  getKnown accepts a graph and returns a query for the knowledge
  in that graph.
*/

import { cmp } from '../util';

export default function getKnown(graph, version = 0) {
  const query = [];
  for (const { key, end, children } of graph) {
    const node = { key, version };
    if (end) {
      if (cmp(end, key) !== 0) node.end = end;
      node.value = 1;
    }
    if (children) {
      node.children = getKnown(children);
    } else {
      node.value = 1;
    }
    query.push(node);
  }
  return query;
}
