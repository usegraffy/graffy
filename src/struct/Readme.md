# Graffy Data Structures

Graph         :=  [ GraphNode  | GraphRange ]
GraphNode     :=  GraphBranch | GraphLeaf
GraphBranch   :=  { key, children: Graph }
GraphLeaf     :=  GraphValue | GraphLink
GraphValue    :=  { key, value, clock }
GraphLink     :=  { key, path, clock }
GraphRange    :=  { key, end, clock }


Query         :=  [ QueryNode | QueryRange ]
QueryNode     :=  QueryBranch | QueryLeaf
QueryBranch   :=  { key, clock, children: Query }
QueryLeaf     :=  { key, sum, clock }
QueryRange    :=  { key, end, count, clock, (sum | children) }


Notes:
- Ranges are specified by `key` and `end`, where `key <= end`.
- In QueryRanges, a positive count specifies the first N items while a negative count specifies the last N items.
- Children are sorted by `key`.
- In Graphs, Ranges may not overlap with each other or with the keys of other nodes. In Queries they may.

# APIs

## graph.put(graph)

Merges a change into the graph. No return value.

## graph.get(query)

Extracts values from a graph. Returns a tuple **(known, unknown)**, where **known** is a graph containing nodes from the original graph that match the passed query, and **unknown** is a query representing parts of the passed query that are not known in the graph.

## graph.getSieve()

Returns a query that matches any change that may modify known parts of the graph.

## query.add(query)
## query.subtract(query)





# Examples

## Graph

```js
[
  { key: 'posts', children: [
    { key: '1', children: [
      { key: 'title', value: '1984', clock: 1 },
      { key: 'author', path: ['users', '1'], clock: 1 }
    ] }
  ] },
  { key: 'postsByTime', children: [
    { key: '', end: '1233\xff', clock: 1 },
    { key: '1234', path: ['posts', '1'], clock: 1 },
    { key: '1234\0', end: '2000', clock: 1 },
  ] },
  { key: 'users', children: [
    { key: 1, ... }
  ] }
]
```


## Query

```js
[
  { key: 'postsByTime', children: [
    { key: '', end: '2000', count: 10, children: [
      { key: 'title', sum: 1, clock: 0 },
      { key: 'author', children: [
        { key: 'name', sum: 1, clock: 0}
      ] }
    ] }
  ] }
]
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
    }
  ],
  topPosts: alias('postsByTime', [
    last(3, '343'),
    {
      title: 1,
      cover: 1
    }
  ])
})
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


# Decisions

1. For data, should there be a single tree with both clocks and values, or a separate clocks tree?

  If clocks are very fragmented, it makes sense to have a single tree. If not, we might save by using separate trees. Versions for queries will likely not be very fragmented but those for data might be.

  Decision: Single tree.

2. For queries, should it be possible to specify different clocks for different parts?

  Decision: Yes; Without this, query addition will be very limited.

3. For data, should there be node objects for intermediate levels, or some flat structure of key:value pairs (perhaps stored as a prefix tree for space efficiency)?

  Decision: Nodes should be objects; otherwise, evaluating counted ranges become very complicated. (It is required to count distinct keys at a level in the node hierarcy.)

4. Should query subtraction be supported?

  Preferably, but this is not a hard requirement.

5. Should there be "clock" for branch nodes to optimize searches?

  No. Because of links, this will be misleading anyway.
  Update: Yes for Query branches, to avoid jumping through obsolete links.

6. Should branch nodes be flattened?

  No, for consistency.

# Rejected options

// Option 1, flat nodes
// May be simpler to implement and more efficient if clock numbers are very fragmented.

[
  undefined,
  undefined, // Up to key_1 is unknown

  key_1,
  clock_null,
  null,

  key_2,
  clock_value,
  value_2,

  key_2 + \0,  // key_2
  clock_null,
  null,

  key_3,
  clock_null, // key_2 to key_4 is null, but clock changes at key_3
  null,

  key_4,
  undefined,  // From key_4 to key_5 we are explicitly setting undefined.
  undefined,

  key_5,
  clock_null,
  null,

  key_6
  undefined,
  undefined // From last key to end is unknown.
]

Record:

{
  __clocks__: {
    key_1: clock_1,
    key_2: clock_2
  }
  key_1: value_1,
  key_2: null
}

Query:

{

}

[
  { key: 'key_1', children: [ ... ] },
  { key: 'key_2', }
]





Query:

{
  postsByTime: [{ after: '123', first: 10, query: {
    title: 1,
    subtitle: 1,
    timestamp: 1,
    author: {
      name: 1,
      avatar: 1
    }
  }}]
}


Graph:

{
  values: {
    posts: {
      22: {
        title: 'adsf'
      }
    }

    postsByTime: [
      undefined,
      '123',
      { __ref__: ['posts', '22'] },
      '123\0',
      undefined
    ]
  }

  clock: {
    posts: {
      22: 2837
    },
    postsByTime: [

    ]
  }
}







gql`{

  postsByTime(after: 123, first: 10) {
    title
    subtitle
    timestamp
    author {
      name
      avatar
    }
  }
}`;

query({
  currentUser: alias(''),
  firstPosts: [
    'posts',
    { first: 10, after: ['234'] },
    {
      title: 1,
      subtitle: 1,
      timestamp: 1,
      author: {
        name: 1,
        avatar: 1
      }
    }
  ]
}, 3)


['postsByTime', r.first(10).after('234'), [
  'title',
  'subtitle',
  'timestamp',
  ['author', [
    'name',
    'avatar'
  ]]
]]












// Discarded options.



leaf := {}
record := {  }
collection := [
  value, ( key, value )*
]

Node {
  data: [ val, ( key, val ) ]
  vers: [ ver, ( key, ver ) ]
}

Trie option:

Graph:
{
  "f": { "o": { "o": 42 } },
  "b": { "a": { "r": 1, "z": 2 } }
}


Query:
[ 'postsByTime', { after: '123', first: 10 }, [
  'title',
  'subtitle',
  'timestamp',
  [ 'author', [
    'name',
    'avatar'
  ] ]
] ]
