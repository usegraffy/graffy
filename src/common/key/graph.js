import { isRange, isBranch }

/*
  Node types:

  g - Graph Value
  G - Graph Branch
  r - Graph Range with start and end
  s - Graph Range with start only
  t - Graph Range with end only
  u - Graph Range with neither start nor end
  l - Graph Link

  q - Query Leaf
  Q - Query Branch
  p - Query Range with Leaf
  P - Query Range with Branch
*/


function encodeNode() {
  if (isRange)
}

export function encode(graph) {
  return graph.map(node => [

  ].join(' ')).join('\n');
}
