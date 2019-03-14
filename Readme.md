# Graffy [![Build Status](https://travis-ci.org/aravindet/graffy.svg?branch=master)](https://travis-ci.org/aravindet/graffy)

Graffy is a JavaScript library for building intuitive APIs with efficient live queries.

Graffy was inspired by (and borrows from) GraphQL and Falcor. Compared to GraphQL, Graffy offers a simpler and more intuitive data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.

Unlike GraphQL resolvers and Falcor data providers, Graffy providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

Graffy providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.

## [Documentation](https://aravindet.github.io/graffy)

## Development status

**Graffy is under heavy development and not ready for production use.**

| Module | Status     | Provides                         |
| ------ | ---------- | -------------------------------- |
| core   | 🚧 in dev  | -                                |
| client | 🚧 in dev  | EventStream/HTTP client          |
| server | 🚧 in dev  | EventStream/HTTP server          |
| cache  | ⌛ backlog | In-memory cache                  |
| react  | ⌛ backlog | Container API                    |
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
