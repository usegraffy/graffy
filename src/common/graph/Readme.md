# Graph Operations

Specifications for data structures used by Graffy:

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

# Examples

## Graph

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

## Query

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

## Decorated Query

The aim is to be as close to the response structure as possible.

```js
query({
  currentUser: alias('users', userId, {
    name: 1,
    email: 1,
  }),
  postsByTime: [
    first(10, '123'),
    {
      title: 1,
      subtitle: 1,
    },
  ],
  topPosts: alias('postsByTime', [
    last(3, '343'),
    {
      title: 1,
      cover: 1,
    },
  ]),
});
```

`first` and `last` create QueryRanges.

## Decorated Graph

QueryRanges result in arrays, QueryBranches result in objects.

```js
{
  currentUser: {
    name: 'bob', ... },
  postsByTime: [
    { title: '1984', ... }
  ]
}
```
