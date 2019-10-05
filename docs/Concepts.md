# Concepts

Graffy uses just a few simple, intuitive yet powerful concepts:

### Tree with Links

Graffy models the entirety of an application's data as a tree with links. This is very similar to a file system with symbolic links. If you've used Falcor, this is just like JSON Graph.

```js
graph({
  users: {
    1: { name: 'Alice', avatar: '👧', … },
    2: { name: 'Bob', avatar: '👨', … },
    …
  },
  posts: {
    1: { author: link('/users/2'), … },
    2: { author: link('/users/1'), … },
    …
  }
})
```

### Narrow Queries

Queries specify all the nodes (down to leaf nodes) they want to fetch, in a tree that mirrors the expected result. This works just like GraphQL.

Queries cross links transparently.

```js
// Query
query({ users: { 1: { avatar: true } } })
// Result
graph({ users: { 1: { avatar: '👧' } } })

// Query
query({ posts: { 1: { author: { avatar: true } } } })
// Result
graph({ posts: { 1: { author: { avatar: '👨' } } } })
```

### Ranges

To paginate, queries may specify a range of the keys like `{ first: 10 }` or `{ last: 10, before: 'some-key' }`. Keys sorted alphabetically.

```js
// Query
query({
  posts: [
    { first: 2 },
    { title: true, author: { name: true } }
  ]
})
```

Graffy pagination operates on keys and not on values; For example you cannot slice the `posts` node to, say, get all the posts in January. To do that, you need an index.

### Indexes

Indexes are a common Graffy pattern that uses links and ranges to enable queries that can order, filter and paginate over data in different ways.

For example, to query posts based on their date, you could construct an index that links dates to the posts:

```js
// Data
graph({
  posts: {
    1: { …, date: '2019-03-02' },
    2: { …, date: '2019-03-04' }
  },
  postsByDate: page({ // This is the index
    [key('2019-03-02', 1)]: link('/posts/1'),
    [key('2019-03-04', 2)]: link('/posts/2'),
  })
})

// Query: All posts created in January
query({
  postsByDate: [
    { after: '2019-01-01', before: '2019-01-31' },
    { title: true, author: { name: true, avatar: true }, date: true }
  ]
})
```

A few things to note about indexes.

1. Index keys must be unique; as two posts may have the same date, we make it unique by putting both the date and the ID in our index keys. The `keys()` builder encodes multiple values into a single string key.

2. When an index is created with multiple values, the order matters! Ranges can specify earlier values and skip later values (as we do here - the range specifies dates but not ids) but not the other way around.

3. Index keys can contain many data types, not just strings. The `key()` builder encodes other types into strings in an way that works with ranges (it's important to encoded strings sort in the same order as the original values).

### Handlers

Graffy uses a middleware framework similar to Express or Koa to build up complex behaviours from simple parts. Different handlers (`onRead`, `onWatch` and `onWrite`) can be attached to different paths in the tree.

Read handlers are typically used to load the parts of the tree that match queries. For example:

```js
// On the server
import Graffy from '@graffy/core';
import { unwrap } from '@graffy/common';
const store = new Graffy();

store.onRead('/users', q => db.query(
  `SELECT * FROM users WHERE id in ($ids)`,
  { ids: q.map(({ key }) => key) }
))
```

Write handlers are used to persist changes.

Handlers can also be combined to make reusable plugins such as graffy-client:

```js
// On the browser
import Graffy from '@graffy/core';
import client from '@graffy/client';
const store = new Graffy();
store.use('/', client('https://example.com/api'));
```
