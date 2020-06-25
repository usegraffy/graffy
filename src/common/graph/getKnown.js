/*
  getKnown accepts a graph and returns a query for the knowledge
  in that graph.
*/

export default function getKnown(graph, version = 0) {
  const query = [];
  for (const { key, end, children } of graph) {
    const node = { key, version };
    if (end) {
      if (end !== key) node.end = end;
      node.options = { subtree: true };
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
