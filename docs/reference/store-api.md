---
title: Store API
---

# Store API

A store is constructed with `new Graffy()`, and exposes a handful of APIs:

- `store.use(provider)` attaches a provider to the store. Providers provide all the useful functionality of Graffy, like accessing data sources, caching and authentication.
- The two *consumer-side* APIs `store.read(query)` and `store.write(change)` let you access the data in the store.
- There are two *provider-side* APIs `store.onRead(handler)` and `onWrite(handler)` that let you handle read and write requests. These are typically used in custom providers.

## `.read(path?, query, options)`

Accepts a path and a query and returns a stream of graphs — the initial results and any subsequent updates to it. If a path is omitted, the query is considered to be at the root.

It is also possible to perform a one-time read (without streaming); the stream object that is returned by `.read()` works both as a Promise and as an AsyncIterable, and if used as a Promise (with `await` or `.then()`) a one-time read is performed.

## `.write(path?, change, options)`

Accepts a path and a graph (conventionally called *change*) and returns a Promise that resolves when the change has been committed.

## `.onRead(path?, handler)`

The handler function gets three arguments, `query`, `options` and `next`, and may return a value, a promise or an Async Iterable. If a `path` is provided, the handler will only be invoked for queries that intersect this path.

`options` contains whatever the client sent.

Graffy works like Express or Koa, and supports multiple providers that are invoked in a sequence.

The `next` function passed to each handler allows it to forward all or part of the query to the subsequent handlers. It accepts a query and returns a stream of graphs.

This example shows a caching provider that forwards queries that miss the cache.

```javascript
store.onRead((query, next) => {
  const result = cache.get(query);
  return result ?? next(query);
});
```

## `.onWrite(path?, handler)`

The handler function gets three arguments, `change`, `options` and `next`, and may return nothing or a Promise.

## `.use(path?, provider)`

Providers are functions that are called with one argument, the store itself. They may then call other functions on that store, such as `.onWrite` and `.onRead`.
