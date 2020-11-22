// import { isRange } from '../node';
// import { keyAfter } from './step';

export default function setVersion(graph, version) {
  // mergeRanges(graph);
  for (const node of graph) {
    node.version = version;
    if (node.children) setVersion(node.children, version);
  }
  return graph;
}

// function mergeRanges(graph) {
//   for (let i = 0; i < graph.length; i++) {
//     if (!isRange(graph[i])) continue;
//     let j = i;
//     do {
//       j++;
//     } while (isRange(graph[j]) && graph[j].key === keyAfter(graph[j - 1].end));
//     j = j - 1;
//     if (j === i) continue;
//     graph.splice(i, j - i + 1, {
//       key: graph[i].key,
//       end: graph[j].end,
//       version: graph[i].version,
//     });
//     // i = j;
//   }
// }
