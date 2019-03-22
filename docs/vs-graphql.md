# Graffy vs GraphQL

## Live queries, not subscriptions

Quite often, clients need to keep the query results up-to-date as they change on the server. Polling is an obvious solution to this, but the latencies and resource usage make this infeasible for most use-cases.

GraphQL offers subscriptions as the mechanism to do this, but GraphQL subsccriptions are are very a poor fit for this use case.

A key benefit of using GraphQL for one-time queries is that deeply nested relations can be fetched in one round trip. It also makes it easy to keep complex business logic on the backend and compute and send results to the client only when requested.

Unfortunately subscriptions do not provide these benefits; nested relations are difficult to support and perform poorly, and using subscriptions to synchronize state with the server requires the client to implement state transition logic, duplicating server-side logic.

The GraphQL docs [explain](https://graphql.org/blog/subscriptions-in-graphql-and-relay/#why-not-live-queries) why Facebook decided not to support live queries. Here's the gist:

Even something as simple as the "Person and 3 others liked this" message change on lots of events:
- Someone liked or unliked your post 👍
- Someone who liked your post deactivated or re-activated their account
- Someone who liked your post changed their name
- Facebook's algorithm for choosing the clickbaitiest name changed 🙄

Building a live query framework that updates all interested clients when any of these things happen is understandably hard. In their words,

> “Implementing live queries for this set of data proved to be immensely complicated.”

Translation: It’s a hard problem, so let the frontend do it. 😂

As I understand it, GraphQL's recommendation is that the frontend:
1. query the initial state
2. subscribe to frequent events (likes and unlikes)
3. update the count (using frontend logic) when they happen
4. call it a day.

Infrequent events, like Facebook changing their algorithm, are okay to ignore until the user refreshes the page. This is perfectly reasonable - this is essentially manual polling, and for infrequent changes polling is an efficient approach.

However, it's not explained is why each user should poll separately; it would be a lot cheaper for the API server to poll the database periodically and send updates to subscribers.

There are likely solid technical reasons why this is hard to do at Facebook - legacy services, infrastructure, scale, etc. However, Facebook's problems are not your problems, and a technology that's narrowly tailored to solve Facebook's problems might not be the best fit for you.


### Problems with the recommended approach

“Query, then subscribe?” Events that occurred in between will be dropped.
“Subscribe, then query?” Events already accounted for in the query result may be re-sent.
Solution: Subscribe, then query, then de-duplicate in event-specific ways. 😭
Event-handling logic is duplicated on the backend and frontend.
Different parts of the frontend update on different sets of events and fall inconsistent.


### The DB Centered approach

Create / update / delete subscriptions for each entity type
AKA shitty live queries on top of a protocol that really doesn’t want it.
Subscription payloads duplicate records
Pagination is hard to do
Expanding linked resources (the “graph” in GraphQL) does not work

## Path-specific middleware over Type-specific resolvers

Note: Graffy will have an _optional_ type system for automatic validation and self-documenting APIs.




## Differences

- All data is placed in a single tree with symlinks
- Every node has a canonical path in the tree
- Queries may request a range of keys in lexical order

Backend is a middleware framework similar to Express. Planned providers (middlware) include:

- Graffy-Cache (which uses JS memory and works on both client and server)
- Graffy-Schema (provides type validation and introspection endpoints)
- Graffy-Http (communicates with an express-graffy server)

Other planned modules:

- Express-Graffy (express middleware that creates an HTTP and Websockets API)
- React-Graffy (react components for making queries and subscriptions)
