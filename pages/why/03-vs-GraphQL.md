# Graffy vs GraphQL?

GraphQL brings together a large number of good ideas, and Graffy shamelessly borrows many of them. Graffy is also heavily inspired by Falcor, another data fetching library.

Graffy has several advantages over GraphQL such as improved caching and a simpler data model, but the biggest one - and the reason for starting this project - is support for efficient, scalable **live queries**.

## Live queries vs subscriptions

Quite often, clients need to keep query results up-to-date as they change on the server. Polling is an obvious solution to this, but the latencies and resource usage make this infeasible for many use-cases.

Live queries are the friendliest solution to this - they are queries where the server, after returning the initial results, keeps pushing updates to those results as long as the client needs them. These are often the most natural abstractions to use on the client, but GraphQL does not provide an easy way to build them.

[GraphQL subscriptions are not live queries](https://graphql.org/blog/subscriptions-in-graphql-and-relay/#why-not-live-queries). GraphQL rejected live queries because they are hard to implement on the server, especially in a distributed environment.

GraphQL subscriptions, where server-side events (such as those published to a message queue) are pushed more or less unchanged to the client, are much easier to build. However they simply end up transfering that complexity to the front-end, at significant performance and complexity cost.

A key benefit of using GraphQL for one-time queries is that deeply nested relations can be fetched in one round trip. It also makes it easy to keep complex business logic on the backend and compute and send results to the client only when requested.

Unfortunately subscriptions do not provide these benefits; nested relations are difficult to support and perform poorly, and using subscriptions to synchronize state with the server requires the client to implement state transition logic, duplicating server-side logic.

An ideal solution would let server-side code continue to publish change events - just like with GraphQL subscriptions - while client-side code makes live queries, with the data fetching library translating between them. This is what Graffy does.

To do this, Graffy uses data types that provide consistency guarantees and a wire protocol that can efficiently represent diffs, neither of which are available in GraphQL. This is why Graffy has to be a separate library rather than a GraphQL client.

## Paths vs Types

> Note: Graffy will have an _optional_ type system for automatic validation and self-documenting APIs.

Graffy lets you think of all your data as a single global filesystem, parts of which are synced with clients. This is familiar and intuitive, compared to the type-based mental model that GraphQL imposes.

Every scalar value (string, number) is a "file" in this virtual tree, each with its own unique path. Some values are "symbolic links" pointing to other paths in the filesystem - making the data model a graph rather than a tree.

Different parts of the graph can live on different databases and backend systems, just as (in Unix-like systems) different parts of the filesystem can live on different physical devices. Graffy lets you "mount" a _provider_ at any path in your data model.

## Providers vs. Resolvers

Unlike GraphQL resolvers, Graffy providers can be _composed_ - i.e. providers can delegate to each other. This works just like the familiar middleware model used by Express or Koa, and allows authentication, validation, custom caches and resource limiting to be implemented easily and distributed as modules.

In fact, the core of Graffy is just a simple middleware framework; most of the functionality is provided by built-in modules like [@graffy/fill](https://www.npmjs.com/package/@graffy/fill) and [@graffy/cache](https://www.npmjs.com/package/@graffy/cache).

Graffy's provider model can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries with range operations, joins etc.). This is particularly hard, if not impossible, to do with GraphQL resolvers - making hacks like [dataloader](https://github.com/graphql/dataloader) necessary.

## Pagination

Graffy also has built-in, efficient pagination, avoiding the `edges`, `node` and `pageInfo` boilerplate of the Relay cursor specification.
