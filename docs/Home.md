# Graffy

Graffy is a Javascript library to power efficient and intuitive real-time APIs. It's built on a sound [set-theoretic model of queries and graphs](Theory.md).

## Why Graffy?

Graffy provides advanced [live queries](LiveQuery.md) capabilities, providing clients a real-time view of of server data. Graffy supports complex live queries with nested graph traversals and pagination, while exposing a simple and intuitive API for building clients and servers.

Graffy was inspired by (and borrows from) Facebook's GraphQL and Netflix's Falcor. Compared to GraphQL, Graffy offers a more familiar data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.

Unlike GraphQL resolvers and Falcor data providers, Graffy providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

Graffy providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.
