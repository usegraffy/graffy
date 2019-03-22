# Graffy Guide

This is a quick tutorial introducing Graffy concepts by example. We'll build an API for a simple blog.

## Data modelling

The data model for our blog may look like this:

![Example data model](example-model.png)

Every Graffy data model is a tree with a single root node, denoted by `/`. First-level children are typically nodes representing the main resources of our application, `/posts` and `/users`.

### Resources

Under them are individual resource entities, with their unique IDs as keys. Therefore `/posts/123` is the canonical path for the post with ID 123.

Resource entities typically have several fields, some of which (like `/posts/:id/author` above) may be _links_ to other places in the tree.

### Indexes

To fetch resources using parameters other than their ID, we use indexes like `/postsByTime`. Here, "ByTime" indicates that posts are ordered by the "time" field within this index.

First level children under this index have filtering parameters as keys. Here, posts may be filtered by tags, so there are children `tags:[]` (containing posts with no tags), `tags:[tag1]` (posts with one tag, _tag1_), `tags[tag1,tag2]` (posts with both _tag1_ and _tag2_), etc.

Under the filtering parameters are nodes linking to the posts at their canonical locations (like `/posts/:id`). The keys of these links are values of the ordering field (time).

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

const filterKey = filter({ tags: ['tag1'] });
const rangeKey = range({ first: 10 });

const query = {
  postsByTime: {
    [filterKey]: {
      [rangeKey]: {
        title: 1, body: 1, author: 1, createdAt: 1
      }
    }
  }
};
```

Use `store.get()` and `store.sub()` to make a query against the store. They return Promises and Async Iterables:

```js
const result = await store.get(query);

for await (const result of store.sub(query)) { /* ... */ }
```

React-Graffy provides an alternate API using React render props.

```js
import { Query } from '@graffy/react';

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
const server = new GraffyServer();
store.use(myProvider);
store.use(server.graffy);
http.createServer(server.http).listen(4783);
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
