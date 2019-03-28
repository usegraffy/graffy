# Concepts

Graffy uses just a few simple, intuitive yet powerful concepts:

### JSON Graph

The state of the system is modeled as a single JSON document, with symbolic links (making it a graph). If you've used Falcor, this should be familiar.

```js
{
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
}
```

### Narrow Queries

Queries specify all the nodes (down to leaf nodes) they want to fetch, in a tree that mirrors the expected result. This works just like GraphQL.

Queries cross links transparently.

```js
// Query
{ users: { 1: { avatar: true } } }

// Result
{ users: { 1: { avatar: '👧' } } }

// Query
{ posts: { 1: { author: { avatar: true } } } }

// Result
{ posts: { 1: { author: { avatar: '👨' } } } }
```

Queries are specified in plain JSON, and any truthy value can be used in queries as a placeholder for leaf nodes.

### Slices

To paginate, queries may specify _slices_ of keys, like `{ first: 10 }` or `{ last: 10, before: 'some-key' }`.

Slices are calculated with the keys sorted alphabetically.

```js
// Query
{
  posts: slice(
    { first: 10 },
    { title: true, author: { name: true, avatar: true }, date: true }
  );
}
```

Graffy slices operate on the keys - not on values; For example you cannot slice the `posts` node to, say, get all the posts in January. To do that, you need an index.

### Indexes

Indexes are a common Graffy pattern that uses links and slices to enable queries that can order, filter and paginate over data in different ways.

For example, to query posts based on their date, you could construct an index that links dates to the posts:

```js
// Data
{
  posts: {
    1: { …, date: '2019-03-02' },
    2: { …, date: '2019-03-04' }
  },
  postsByDate: { // This is the index
    [key('2019-03-02', 1)]: link('/posts/1'),
    [key('2019-03-04', 2)]: link('/posts/2'),
  }
}

// Query: All posts created in January
{
  postsByDate: slice(
    { after: '2019-01-01', before: '2019-01-31' },
    { title: true, author: { name: true, avatar: true }, date: true }
  )
}
```

A few things to note about indexes.

1. Index keys must be unique; as two posts may have the same date, we do this by putting both the date and the ID in our index keys. The `keys()` helper encodes multiple values into a single string key.

2. When an index is created with multiple values, the order matters! Slices can specify earlier values and skip later values (as we do here - the slice specifies dates but not ids) but not the other way around.

3. Index keys can contain many data types, not just strings. The `key()` helper encodes other types into strings in an way that works with slices (it's important to encoded strings sort in the same order as the original values).

### Handlers

Graffy uses a middleware framework similar to Express or Koa to build up complex behaviours from simple parts. Different read and write handlers (`onGet` and `onPut`) can be attached to different paths in the tree.

Read handlers are typically used to load the parts of the tree that match queries. For example:

```js
// On the server
import Graffy from '@graffy/core';
const store = new Graffy();

store.onGet('/users', query => db.query(
  `SELECT * FROM users WHERE id in ($ids)`,
  { ids: Object.keys(query) }
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
