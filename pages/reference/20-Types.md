# Types

## Paths

Paths are specified by [RFC6901 JSONPointer](https://tools.ietf.org/html/rfc6901) strings or by arrays of path segments.

## Graphs

Graphs in Graffy are represented as JSONGraph structures. They may be specified using JSON objects, using the `link(path)` helper to create links:

```js
{
  me: link('/users/123'),
  users: { ... }
}
```

## Queries

Queries mirror the shape of the JSONGraph, with the leaf values replaced with `true`. In addition, queries may specify ranges (for pagination) - these are arrays with two elements. The first element is an object with pagination parameters, and the second element is the subquery for each element in the range.

```js
{
  me: {
    name: true,
    email: true,
  },
  users: [
    { first: 10 },
    { name: true }
  ]
});
```

## Object Graphs

Object graphs are the output format for query results. They are constructed from JSONGraphs by replacing symbolic links with actual JavaScript object references, and converting paginated nodes into arrays with `nextRange` and `prevRange` properties.

Note that the object graphs may have more internal object references than was requested in the query - this is because we ensure referential equality of identical nodes.

## Plumbing

**Advanced**: You would not normally need to interact with plumbing data structures, unless you are writing a Graffy plugin or optimizing for performance.

Specifications for plumbing data structures used by Graffy:

```
Graph         :=  [ GraphNode  | GraphRange ]
GraphNode     :=  GraphBranch | GraphLeaf
GraphBranch   :=  { key, children: Graph }
GraphLeaf     :=  GraphValue | GraphLink
GraphValue    :=  { key, value, version }
GraphLink     :=  { key, path, version }
GraphRange    :=  { key, end, version }
```

```
Query         :=  [ QueryNode | QueryRange ]
QueryNode     :=  QueryBranch | QueryLeaf
QueryBranch   :=  { key, version, children: Query }
QueryLeaf     :=  { key, value, version }
QueryRange    :=  { key, end, count, version, (value | children) }
```

Notes:

- Ranges are specified by `key` and `end`, where `key <= end`.
- In QueryRanges, a positive count specifies the first N items while a negative count specifies the last N items.
- Children are sorted by `key`.
- In Graphs, Ranges may not overlap with each other or with the keys of other nodes. In Queries they may.

### Example Graph

```js
[
  { key: 'posts', children: [
    { key: '1', children: [
      { key: 'title', value: '1984', version: 1 },
      { key: 'author', path: ['users', '1'], version: 1 }
    ] }
  ] },
  { key: 'postsByTime', children: [
    { key: '', end: '1233\xff', version: 1 },
    { key: '1234', path: ['posts', '1'], version: 1 },
    { key: '1234\0', end: '2000', version: 1 },
  ] },
  { key: 'users', children: [
    { key: 1, ... }
  ] }
]
```

### Example Query

```js
[
  {
    key: 'postsByTime',
    children: [
      {
        key: '',
        end: '2000',
        count: 10,
        children: [
          { key: 'title', value: 1, version: 0 },
          { key: 'author', children: [{ key: 'name', value: 1, version: 0 }] },
        ],
      },
    ],
  },
];
```
