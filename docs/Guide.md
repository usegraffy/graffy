# Graffy Guide

This is a quick tutorial introducing Graffy APIs by example.

## Data model

We'll continue with the example of a simple blog:

```js
{
  users: {
    1: { name: 'Alice', avatar: '👧', … },
    2: { name: 'Bob', avatar: '👨', … },
    …
  },
  posts: {
    1: { author: link('/users/2'), date: '2019-03-02', … },
    2: { author: link('/users/1'), date: '2019-03-04', … },
    …
  },
  postsByDate: {
    [key('2019-03-02', 1)]: link('/posts/1'),
    [key('2019-03-04', 2)]: link('/posts/2'),
  }
}
```

If you're unfamiliar with links, slices and indexes, please review the [Graffy concepts](Concepts.md).


## Client-side usage

Like Express, Graffy uses middleware to provide functionality. Graffy-cache provides client-side caching and Graffy-client makes requests to the server.

```js
import Graffy from '@graffy/core';
import GraffyCache from '@graffy/cache';
import GraffyClient from '@graffy/client';

const store = new Graffy();
store.use(GraffyCache());
store.use(GraffyClient('https://example.com/api'));
```

Queries are specified using plain JS objects; the `filter()` and `range()` helpers [encode](Encoding.md) GraphQL-like filtering and pagination parameters into strings. All required fields must be specified explicitly.

```js
import { filter, range } from `@graffy/core`;

const sliceArgs = { first: 10, filter: { tags: ['tag1'] } };

const query = {
  postsByTime: slice(
    sliceArgs,
    {
      title: 1, body: 1, author: 1, createdAt: 1
    }
  )
};
```

Use `store.get()` and `store.sub()` to make a query against the store. They return Promises and Async Iterables:

```js
const result = await store.get(query);

for await (const result of store.sub(query)) { /* ... */ }
```

React-Graffy provides an alternate API using React hooks.

```js
import { useQuery } from '@graffy/react';

<Query live store={store} query={query}>
  {(data, error) => ( /* ... */ )}
</Query>
```

## Server-side usage

Graffy-server creates HTTP request handlers that can be used with Express or with the Node HTTP servers.

```js
import http from 'http';
import Graffy, { range } from '@graffy/core';
import GraffyServer from '@graffy/server';
import myProvider from './provider';

const store = new Graffy();
store.use(myProvider);
http.createServer(new GraffyServer(store)).listen(4783);
```

The server uses server-sent events (event streams) for subscriptions.

## Writing custom providers

Code for reading and writing to your data sources live in custom providers. Providers are functions that receive a reference to the store:

```js
function provider(store) {
  /* Do things */
}
```

The store has APIs to attach request handlers:

```js
store.onGet((request, next) => {
  const { query } = request;
  return getInitialState(query);
});
```

And to publish changes to notify subscribers:

```js
store.pub(changes);
```

As an optional performance improvement, providers may choose to consume and publish only those upstream changes that are relevant to at least one subscriber. The request contains a "cancellation token" that represents the lifetime of subscriptions:

```js
store.onGet((request, next) => {
  const { query, token } = request;
  startConsuming(query);
  token.onCancel(() => stopConsuming(query));
});
```

Providers are middleware: if they cannot serve a query completely (for example on cache miss), they may yield to the next provider by calling next(). It may also modify the request object to forward only part of the request to the next provider.

## On the wire

In HTTP requests, queries are specified using the path and the `fields` parameter. For example:

```http
GET /posts/123?fields=title,author
```

The response is:

```json

```
