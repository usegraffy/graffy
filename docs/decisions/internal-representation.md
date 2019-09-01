# Decisions about the internal representation

1. For data, should there be a single tree with both versions and values, or a separate versions tree?

  If versions are very fragmented, it makes sense to have a single tree. If not, we might save by using separate trees. Versions for queries will likely not be very fragmented but those for data might be.

  Decision: Single tree.

2. For queries, should it be possible to specify different versions for different parts?

  Decision: Yes; Without this, query addition will be very limited.

3. For data, should there be node objects for intermediate levels, or some flat structure of key:value pairs (perhaps stored as a prefix tree for space efficiency)?

  Decision: Nodes should be objects; otherwise, evaluating counted ranges become very complicated. (It is required to count distinct keys at a level in the node hierarcy.)

4. Should query subtraction be supported?

  Preferably, but this is not a hard requirement.

5. Should there be "version" for branch nodes to optimize searches?

  No. Because of links, this will be misleading anyway.
  Update: Yes for Query branches, to avoid jumping through obsolete links.

6. Should branch nodes be flattened?

  No, for consistency.

# Rejected options

// Option 1, flat nodes
// May be simpler to implement and more efficient if version numbers are very fragmented.

[
  undefined,
  undefined, // Up to key_1 is unknown

  key_1,
  version_null,
  null,

  key_2,
  version_value,
  value_2,

  key_2 + \0,  // key_2
  version_null,
  null,

  key_3,
  version_null, // key_2 to key_4 is null, but version changes at key_3
  null,

  key_4,
  undefined,  // From key_4 to key_5 we are explicitly setting undefined.
  undefined,

  key_5,
  version_null,
  null,

  key_6
  undefined,
  undefined // From last key to end is unknown.
]

Record:

{
  __versions__: {
    key_1: version_1,
    key_2: version_2
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

  version: {
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
