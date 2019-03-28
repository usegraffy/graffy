# Graffy

Graffy is a live query library for the browser and Node.js, built on a sound theory of queries on graphs.

Graffy was inspired by (and borrows concepts from) GraphQL and Falcor. Compared to GraphQL, Graffy offers a simpler and more intuitive data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.

Unlike GraphQL resolvers and Falcor data providers, Graffy providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

Graffy providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.
