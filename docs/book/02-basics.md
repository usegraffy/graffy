# Basic usage

Graffy uses just a few simple yet powerful concepts:

### Data model

All the data in your backend is _modeled_ like a single giant JSON tree. In addition to normal JSON values like strings and numbers, leaf nodes in Graffy may contain **links** to other parts of the tree. These work just like symlinks in a file system. If you've used Falcor, all this should sound pretty familiar - it's JSON Graph.

Here's an example JSON graph for a toy blog with some `users` and some `posts`:

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

The `author` property on each post is a link to the corresponding user. `link()` is a helper that creates a link object.

> **Note**: The Graffy data model isn't exactly JSON. Keys (property names) don't have to be strings, they can be any data type. Arrays come with many caveats and generally can't be used except as leaf nodes. (This is why `users` and `posts` are objects, not arrays.) `null` has special meaning (a value known to not exist) and can't be used to represent anything else.

### Queries

Graffy queries specify all the nodes (down to leaf nodes) they want to fetch, in a tree that mirrors the expected result. This works just like GraphQL:

```js
// Query
store.fetch({ posts: { 1: { author: { name: true, avatar: true } } } });

// Result
{ posts: { 1: { author: { name: 'Bob', avatar: '👨' } } } }
```

You might have noticed that the query went right through a symlink. This allows Graffy to return multiple nested resources in a single query.

### API

The API is fairly straightforward and familiar.

Graffy is highly modular, and uses plugins and middleware like Express or Koa Node.js frameworks. Clients typically use graffy-cache to provide in-memory caching and graffy-client, while servers would swap out graffy-client for graffy-server. Setting up a store is straightforward:

```js
import Graffy from '@graffy/core';
import GraffyCache from '@graffy/cache';
import GraffyClient from '@graffy/client';

const store = new Graffy();
store.use(GraffyCache());
store.use(GraffyClient('https://example.com/api'));
```

#### "Outer" APIs
- `store.fetch(query)` for one-time queries
- `store.watch(query)` for live queries
- `store.patch(graph)` for writes

Fetch and patch return promises, while watch returns async iterables.

```js
const result = await store.fetch(query);

await store.patch(changes); // Wait till complete.

for await (const result of store.watch(query)) {
  /* Each iteration has an updated value of result. */
}
```

#### "Inner" APIs
- `store.onFetch(path, handler)`
- `store.onWatch(path, handler)`
- `store.onPatch(path, handler)`

These handlers connect the store to your custom backend databases. Naturally, onFetch and onPatch handlers should return promises and onWatch handlers should return async iterables.

```js
store.onFetch('/users', query => {
  const ids = Object.keys(query);
  return db.collection('users').findAll(ids);
});

store.onWatch('/posts', query => {
  const ids = Object.keys(query);

  // makeAsyncIterable is a helper
  return makeAsyncIterable(push => {
    const stream = bus.on('posts', post => {
      if (ids.includes(post.id)) push(post);
    });
    return () => stream.close();
  });
});
```

The store has two more backend APIs, `on()` and `use()`. These will be covered in more detail later.

### Next

Pagination: Ordering and filtering data in queries, constructing indexes.
