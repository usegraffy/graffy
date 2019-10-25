# Changes

Graffy uses graphs to represent several different things:

- The conceptual "total" graph, containing _all_ the data in the system. Except for trivial applications, it isn't possible to materialize this graph in a single machine. For any possible path, this graph will have either a value or `null` if the path does not exist.

- A "cached" subgraph of the total graph which _is_ loaded on a single machine. Looking for a path in this graph may have one of three outcomes: A valid value, `null` if the path is known to not exist, or unknown if the path may exist in the total graph but this information isn't available in this cache.

- A "result" is the subgraph of the total graph matching a query. For every path in the original query, this graph will have a value or `null`. This is similar to a cached subgraph.

- A "change" is a subgraph encoding the new state of paths that have changed. This is either written to the store (as an argument to `write()`), or received from the store (in the stream returned by `watch()`)
