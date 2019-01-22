Grue
====

**Grue is under heavy development and not ready for production use.**
Please use it in toy projects and open issues with bugs and suggestions.

Grue is an API layer comparable to GraphQL or Firebase, designed for efficient live queries and caching while using simple and familiar abstractions.

It creates APIs that follow REST patterns while offering expressive power and capabilities comparable to GraphQL.

## Overview of concepts

- The full state of the backend is modelled as a single tree. Every node has a unique canonical path, permitting a familiar REST+JSON API.
- Nodes may be symbolic links to other parts of the tree. Queries follow these links transparently to fetch related resources without multiple round trips.
- Queries may request ranges of paths, to perform efficient pagination.

## Making queries

Like Express, Grue uses middleware to provide functionality. Grue-cache provides client-side caching and grue-http makes requests to the server.

```js
import Grue, { range } from 'grue-core';
import GrueCache from 'grue-cache';
import GrueHttp from 'grue-http';

const store = new Grue();
store.use(new GrueCache());
store.use(new GrueHttp('https://example.com/api'));
```

Queries are specified using plain JS objects; the `range` helper turns GraphQL-like pagination parameters into a string representation. All required fields must be specified explicitly.

```js
const query = {
  posts: {
    [range({ first: 10 })]: {
      title: 1, body: 1, author: 1, createdAt: 1
    }
  }
};
```

Imperative APIs on the store are written using Promises and Async Iterables.

```js
const { posts } = await store.get(query);

for await (const { posts } of store.sub(query)) { /* ... */ }
```

React-Grue provides an alternate declarative API using React render props.

```js
import { Query } from 'react-grue';

<Query live store={store} query={query}>
  {(data, error) => ( /* ... */ )}
</Query>
```

## Writing providers

Providers are functions that receive a reference to the store:

```js
function provider(store) { /* Do things */ }
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

_TODO: Add code sample_


## On the wire

_TODO: Document the HTTP and WebSockets wire protocols._
