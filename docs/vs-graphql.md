# Graffy vs GraphQL

## Live queries, not subscriptions

Quite often, clients need to keep the query results up-to-date as they change on the server. Polling is an obvious solution to this, but the latencies and resource usage make this infeasible for most use-cases.

GraphQL offers subscriptions as the mechanism to do this, but GraphQL subsccriptions are are very a poor fit for this use case.

A key benefit of using GraphQL for one-time queries is that deeply nested relations can be fetched in one round trip. It also makes it easy to keep complex business logic on the backend and compute and send results to the client only when requested.

Unfortunately subscriptions do not provide these benefits; nested relations are difficult to support and perform poorly, and using subscriptions to synchronize state with the server requires the client to implement state transition logic, duplicating server-side logic.

### Why GraphQL does not have live queries

The GraphQL docs [explain](https://graphql.org/blog/subscriptions-in-graphql-and-relay/#why-not-live-queries) why Facebook decided not to support live queries. Here's the gist:

Even something as simple as the "Person and 3 others liked this" message change on lots of events:
- Someone liked or unliked your post 👍
- Someone who liked your post deactivated or re-activated their account
- Someone who liked your post changed their name
- Facebook's algorithm for choosing your bestest friend changed 🙄

Building a live query framework that updates all interested clients when any of these things happen is understandably hard. In their words,

> “Implementing live queries for this set of data proved to be immensely complicated.”

Translation: It’s a hard problem, so let the frontend do it. 😂

### GraphQL live queries vs Graffy

As I understand it, GraphQL's recommendation for frontends that require real-time view of data is:

1. query the current count
2. subscribe to frequent events (likes and unlikes)
3. update the count (using frontend logic) when they happen
4. repeat when the user refreshes the page

In comparison, with Graffy the frontend would do this:

1. make a live query to the like count
2. there is no step 2

There are several problems with GraphQL's recommended approach.

First is the need to write state update logic on the frontend - this logic already exists on the backend, and reimplementing it on the frontend will cause maintainability and consistency problems down the line.

With Graffy, the frontend receives a diff between the old and new states rather than the raw event.

Second, the lack of an atomic "query and subscribe" operation makes consistency hard. If we query and then subscribe, events that occurred in between will be dropped; if we subscribe and then query, events already accounted for in the query result may be re-sent, and we will require even more frontend logic to de-duplicate them.

With Graffy, the live query is an atomic operation. The Graffy backend guarantees this even when there are delays between the different upstream providers, by using the subscribe-first approach and using data structures (CRDTs) that make state updates idempotent (i.e. applying a change twice has no effect).

Third, as the subscription does not include infrequent events, it relies on the user refreshing the page periodically and manually polling the backend for changes.

With Graffy, providers can perform this polling automatically on the backend instead, and push changes to all users in their live update streams. Polling becomes much cheaper (by doing it once for thousands of users) and can be made much more frequent; clients do not need to do anything different.

## Parameters vs Paths, Filters and Ranges

TODO

## Path-specific middleware over Type-specific resolvers

Note: Graffy will have an _optional_ type system for automatic validation and self-documenting APIs.

TODO
