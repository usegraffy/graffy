![Graffy logo](docs/graffy-logo.svg)

# Graffy [![Build Status](https://travis-ci.org/usegraffy/graffy.svg?branch=master)](https://travis-ci.org/usegraffy/graffy) [![NPM version](https://img.shields.io/npm/v/graffy)](https://www.npmjs.com/org/graffy)

Graffy is a Javascript library to power efficient and intuitive real-time APIs. It's based on a novel application of [set theory](docs/Theory.md) to data exchange.

## Example

```js
import Graffy from '@graffy/core';
import GraffyClient from '@graffy/client';

const store = new Graffy();
store.use(new GraffyClient('/api'));

const query = {
  posts: [{ last: 10 }, { // Pagination parameters
    title: true,
    author: { name: true }
  }]
};

for await (const state of store.watch(query)) {
  // Iterates each time relevant data changes on the server.
  console.log(state);
}
```

## Why Graffy?

Graffy provides [live queries](docs/LiveQuery.md), which give clients a real-time view of the data they need. Graffy supports complex queries with nested graph traversals and pagination, while exposing a simple and intuitive API for building clients and servers.

Graffy was inspired by (and borrows from) Facebook's GraphQL and Netflix's Falcor. Compared to GraphQL, Graffy offers a more familiar data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.

Unlike GraphQL resolvers and Falcor data providers, Graffy providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

Graffy providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.

## [Documentation](https://graffy.js.org)

## Modules

All the Graffy packages are published under the [@graffy scope](https://www.npmjs.com/org/graffy) on NPM.

| Module   | Description                         |
| -------- | ----------------------------------- |
| core     | Module management                   |
| fill     | Fulfil queries from many providers  |
| client   | EventStream/HTTP client             |
| server   | EventStream/HTTP server             |
| cache    | In-memory cache                     |
| common   | Shared utilities                    |
| react    | React container and hooks API       |
| stream   | Utility for making AsyncIterables   |
| testing  | Testing and debugging utilities     |
| graphql  | Translate GraphQL to Graffy      |
| schema   | ⌛ Validation, introspection API    |
| viewer   | ⌛ Schema introspection client      |
| auth     | ⌛ Authentication and authorization |
| limit    | ⌛ Resource consumption accounting  |
| mysql    | ⌛ Data source connector            |
| postgres | ⌛ Data source connector            |

⌛ = On the roadmap.

## Capabilities

|                    | Graffy | GraphQL | Falcor | Description                                              |
| ------------------ | :--: | :-----: | :----: | -------------------------------------------------------- |
| Narrow queries     |  ✅  |   ✅    |   ✅   | Queries specify required fields; Allows API evolution    |
| Deep queries       |  ✅  |   ✅    |   ✅   | Queries can expand nested resources; Reduces round-trips |
| Live queries       |  ✅  |   ❌    |   ❌   | Push changes to query results in real time               |
| Pagination cursors |  ✅  |   ✅    |   ❌   | Enables efficient pagination on the server               |
| Parameters         |  ✅  |   ✅    |   ❌   | Custom filtering criteria, etc.                          |
| Caching pages      |  ✅  |   ❌    |   ✅   | Cache result of paginated queries                        |
| Atomic writes      |  ✅  |   ❌    |   ✅   | Writes that trigger accurate cache invalidation          |
| Non-data endpoints |  ✅  |   ✅    |   ❌   | Mutations, subscriptions, cross-resource search          |
