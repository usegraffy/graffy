Grue
====

Grue is a JavaScript library for building familiar RESTful APIs with expressive power and capabilities that exceed GraphQL.

Grue was inspired by (and borrows from) GraphQL and Falcor. Compared to GraphQL, Grue offers a simpler and more intuitive data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.

Unlike GraphQL resolvers and Falcor data providers, Grue providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

Grue providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.

## [Documentation](https://aravindet.github.io/grue)

## Development status

**Grue is under heavy development and not ready for production use.**

| Module | Status     | Provides
|--------|------------|-------------
| core   | 🚧 in dev  | - |
| client | 🚧 in dev  | EventStream/HTTP client
| server | 🚧 in dev  | EventStream/HTTP server
| cache  | ⌛ backlog | In-memory cache
| react  | ⌛ backlog | Container API
| schema | ⌛ backlog | Validation, introspection API
| viewer | ⌛ backlog | Schema introspection client
| auth   | ⌛ backlog | Authentication and authorization
| limit  | ⌛ backlog | Resource consumption accounting

## Capabilities

|                    | Grue | GraphQL | Falcor | Description
|--------------------|:----:|:-------:|:------:|-------------
| Narrow queries     | ✅ | ✅ | ✅ | Queries specify required fields; Allows API evolution
| Deep queries       | ✅ | ✅ | ✅ | Queries can expand nested resources; Reduces round-trips
| Live queries       | ✅ | ❌ | ❌ | Push changes to query results in real time
| Pagination cursors | ✅ | ✅ | ❌ | Enables efficient pagination on the server
| Parameters         | ✅ | ✅ | ❌ | Custom filtering criteria, etc.
| Caching pages      | ✅ | ❌ | ✅ | Cache result of paginated queries
| Atomic writes      | ✅ | ❌ | ✅ | Writes that trigger accurate cache invalidation
| Non-data endpoints | ✅ | ✅ | ❌ | Mutations, subscriptions, cross-resource search
