---
title: Tree operations
---

# Tree operations

Graffy's basic algorithms use seven fundamental tree operations on Graphs and Queries. They are:

1. **known**(Graph, Query) → Graph — Extract the parts of a graph that match the given query.
2. **unknown**(Graph, Query) → Query — Extract the parts of the query that are not matched by the given graph.
3. **diff**(Graph, Graph) → Graph — Extracts parts of the second graph that overlap with and differ from the first one.
4. **merge**(Graph, Graph) → Graph — Combine two graphs; in case of overlap, the newer version wins.
5. **add**(Query, Query) → Query — Combines two queries; in case of overlap, *sum*s are added.
6. **unwrap**(Tree: Query \| Graph, Path) → Tree — Extracts a sub-tree at the given path.
7. **wrap**(Tree: Query \| Graph, Path) → Tree — The inverse of the peel operation.

## Details

These operations can be explained in detail using an analogy from set operations. Trees can be represented by a flat set of paths to the leaf nodes, with corresponding nodes. For example:

```typescript
// Original Graffy tree:
{ children: [
  { key: 'alice', children: [
    { key: 'name', value: 'Alice' },
    { key: 'email', value: 'alice@example.com' },
  { key: 'bob', children: [
    { key: 'name', value: 'Bob' },
    { key: 'email', value: 'bob@example.com' }
  ] }
] }

// Flattened tree:
'alice.name': { value: 'Alice' }
'alice.email': { value: 'alice@example.com' }
'bob.name': { value: 'Bob' }
'bob.email': { value: 'bob@example.com' }
```

These operations can be defined in terms of these flattened trees. Note that the actual implementation is different and does not flatten trees, but produces the same results.

### known(G, Q) → R

- Get P, the intersection of the sets Paths(G) ∩ Paths(Q)
- Construct R using the paths P and the corresponding leaf nodes from G

### unknown(G, Q) → R

- Get P, the difference between the sets Paths(Q) − Paths(G)
- Construct R using the paths P and the corresponding leaf nodes from Q

### diff(G, H) → R

- Get P, the intersection of the sets Paths(G) ∩ Paths(H)
- From P, remove all paths whose nodes in G and H are identical, disregarding version
- Construct R using the paths P and the corresponding leaf nodes from H

### merge(G, H) → R

- Get P, the union of the sets Paths(G) ∪ Paths(H)
- Construct R using the paths P and the corresponding leaf nodes from G or H, whichever exists and has the higher *version*.

### add(P, Q) → R

- Get P, the union of the sets Paths(P) ∪ Paths(Q)
- Construct R using the paths P and the corresponding leaf nodes from P and Q, whichever exists. If a path exists in both P and Q, construct a leaf node whose:
  - *sum* is computed through addition of the two nodes' *sum*s
  - *options* is computed by merging the two nodes' *options*.

### peel(T, P) → R

- Construct R using all the paths in T that start with P, and their leaf nodes from T

### wrap(T, P) → R

- Construct R using all the paths and leaf nodes from T, but prefix every path with P.

## Query range nodes with limit

Converting a tree into a set of paths is straightforward in all cases, except for query range nodes with a *limit* property. Here, the set of paths depend on what data is available, and cannot be defined with respect to just the query.

The *includes* and *excludes* operations aren't affected by this, as graphs are available in those contexts; this only affects the *add* operation, which performs a union of two path sets.

We work around this by ignoring the possibility that two query ranges might overlap - we treat every query range as distinct, except when all the properties - key, end, limit and children - are identical.

This is sufficient for the situations where we use the *add* operation, but it is not a reasonable basis to implement an equivalent to the *diff* operation.
