# Introducing Graffy

Graffy is a real-time data reading library for the browser and Node.js. It occupies the same space as the highly popular GraphQL - which I've been working with for about a year - so it's important to explain why Graffy exists.

### Why not GraphQL?

GraphQL brings together a large number of good ideas, and Graffy shamelessly borrows many of them. Graffy is also heavily inspired by Falcor, another data reading library.

Graffy has several advantages over GraphQL such as improved caching and a simpler data model, but the biggest one - and the reason for starting this project - is support for efficient, scalable **live queries**.

Live queries are like queries where the server, after returning the initial results, keeps pushing updates to those results as long as the client needs them. These are often the most natural abstractions to use on the client, but GraphQL does not provide an easy way to build them. (No, [GraphQL subscriptions are not live queries](https://graphql.org/blog/subscriptions-in-graphql-and-relay/#why-not-live-queries).)

GraphQL rejected live queries because they are notoriously hard to implement on the server, especially in a distributed environment. GraphQL subscriptions, which allow server-side events to be pushed pushed more or less directly to the client, are much easier.

An ideal solution would let server-side code publish change events and client-side code make live queries, with the data reading library translating between them. This is what Graffy does.

To do this, Graffy uses data types that provide consistency guarantees and a wire protocol that can efficiently represent diffs, neither of which are available in GraphQL. This is why Graffy has to be a separate library rather than a GraphQL client.

### Theory of operation

Graffy is built on a sound mathematical theory of data and queries. There are two basic types - the Graph, containing data, and the Query, representing _data requirements_. These types are designed to have operations like addition, subtraction, intersection etc. that behave intuitively - that is, obeying associative, commutative and distributive identities.

This is the key idea that gives Graffy its advanced capabilities.

Take, for example, the _add_ and _subtract_ operations on queries. Different components on a page may make separate queries, and Graffy can add them up into a single, de-duplicated query that is sent to the backend. Edge servers can likewise combine queries from multiple clients before hitting backend services.

Similarly, the _merge_ operation on graphs can be used to combine results from the backend with the cache, or to combine live query change events with known results. The graph data structure is [conflict-free](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for the merge operation, so this is resilient to out-of-order updates.

Other key operations include _intersection_ and _difference_ between a query and a graph. When the graph contains cached data, intersection returns a sub-graph containing only the required data, while difference returns a new query for data that is not present in the cache.

### Next

The basics: How to model, read and write data with Graffy.
