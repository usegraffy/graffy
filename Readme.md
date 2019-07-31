![Graffy logo](docs/graffy-logo.svg)

# Graffy [![Build Status](https://travis-ci.org/aravindet/graffy.svg?branch=master)](https://travis-ci.org/aravindet/graffy)

Graffy is a Javascript library to power efficient and intuitive real-time APIs. It's built on a sound [set-theoretic model of queries and graphs](docs/Theory.md).

## Why Graffy?

Graffy provides [live queries](docs/LiveQuery.md), which give clients a real-time view of the data they need. Graffy supports complex queries with nested graph traversals and pagination, while exposing a simple and intuitive API for building clients and servers.

Graffy was inspired by (and borrows from) Facebook's GraphQL and Netflix's Falcor. Compared to GraphQL, Graffy offers a more familiar data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.

Unlike GraphQL resolvers and Falcor data providers, Graffy providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

Graffy providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.

## [Documentation](https://aravindet.github.io/graffy)

## Development status

**Graffy is under heavy development and not ready for production use.**

| Module | Status     | Provides                         |
| ------ | ---------- | -------------------------------- |
| core   | [![npm version](http://img.shields.io/npm/v/@graffy/core.svg?style=flat)](https://npmjs.org/package/@graffy/core "@graffy/core on npm") | -                                |
| client | [![npm version](http://img.shields.io/npm/v/@graffy/client.svg?style=flat)](https://npmjs.org/package/@graffy/client "@graffy/client on npm") | EventStream/HTTP client          |
| server | [![npm version](http://img.shields.io/npm/v/@graffy/server.svg?style=flat)](https://npmjs.org/package/@graffy/server "@graffy/server on npm") | EventStream/HTTP server          |
| cache  | [![npm version](http://img.shields.io/npm/v/@graffy/cache.svg?style=flat)](https://npmjs.org/package/@graffy/cache "@graffy/cache on npm")  | In-memory cache                  |
| react  | [![npm version](http://img.shields.io/npm/v/@graffy/react.svg?style=flat)](https://npmjs.org/package/@graffy/react "@graffy/react on npm") | Container and hooks API          |
| gql    | ⌛ backlog | GraphQL subset DSL for queries   |
| schema | ⌛ backlog | Validation, introspection API    |
| viewer | ⌛ backlog | Schema introspection client      |
| auth   | ⌛ backlog | Authentication and authorization |
| limit  | ⌛ backlog | Resource consumption accounting  |

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
