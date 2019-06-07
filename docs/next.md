intersect(query, graph) : graph

add(query, query)
subtract(query, query)

merge(graph, graph)
known(graph)

difference(query, graph) := subtract(query, Infinity * known(graph))
normalize(query, graph)  := known(intersect(query, graph))


Graph:

{ value: [ value, ( key, value, )* ]
  clock: [ clock, ( key, clock, )* ] }

Query:
{ query: [ count, ( key, count, )* ]
  clock: [ clock, ( key, clock, )* ] }


known(graph) => graph.map((from, to, value, clock) => {
  // TODO: Handle links
  return { value: 1, clock: 0 };
});


points: [{ key, value }]
ranges: [{ start, end }]
