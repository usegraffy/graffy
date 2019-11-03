# Core APIs

The core API is split into _consumer_ APIs, which are used by clients to get data or write data into a Graffy store, and _provider_ APIs, which are used by servers to persist store data into a backend or database.

Graffy's job is piping queries and data between the consumer and provider APIs, while transforming, aggregating and caching them along the way.

## Consumer APIs

- `store.read(path, query, options)` for one-time queries
- `store.watch(path, query, options)` for live queries
- `store.write(path, graph, options)` for writes

Read and write return promises, while watch returns async iterables.

```js
const result = await store.read(query);

await store.write(changes); // Wait till complete.

for await (const result of store.watch(query)) {
  /* Each iteration has an updated value of result. */
}
```

## Provider APIs

- `store.onRead(path, handler)`
- `store.onWatch(path, handler)`
- `store.onWrite(path, handler)`

These handlers connect the store to your custom backend databases. Naturally, onRead and onWrite handlers should return promises and onWatch handlers should return async iterables.

```js
store.onRead('/users', query => {
  const ids = Object.keys(query);
  return db.collection('users').findAll(ids);
});

store.onWatch('/posts', query => {
  const ids = Object.keys(query);

  // makeStream is a helper
  return makeStream(push => {
    const stream = bus.on('posts', post => {
      if (ids.includes(post.id)) push(post);
    });
    return () => stream.close();
  });
});
```

## use()

Graffy is highly modular, and uses modules similar to Express or Koa middleware. Clients typically use graffy-client to talk to servers, which in turn use graffy-server. The `.use()` function adds an module:

```js
import Graffy from '@graffy/core';
import GraffyCache from '@graffy/cache';
import GraffyClient from '@graffy/client';

const store = new Graffy();
store.use(GraffyCache());
store.use(GraffyClient('https://example.com/api'));
```

## Plumbing

The provider and consumer APIs we saw above are the high-level _porcelain_ APIs, and are intended for most use cases. However, two low-level _plumbing_ APIs - `.on()` and `.call()` - are also available. These provide more flexibility and performance, but require interacting with Graffy's internal data structures.

The Learn section of the website uses only the porcelain APIs and data structures.
