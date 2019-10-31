import { Demo } from '@graffy/website';

# Bring your APIs a_live_

### [Live queries](why/02-Live-Queries) let each client _watch_ the data it needs.

Graffy is a live query library for the browser and Node.js. Graffy-powered servers fulfill each query with its initial result followed by a stream of relevant incremental updates. This is different (and better!) than GraphQL subscriptions, PouchDB sync, etc.

Graffy supports complex, expressive live queries - like multiple levels of resource expansion and pagination - with a novel application of [set theory and CRDTs](theory/01-Theory).

Give it a try! Change the data or query below.

<Demo />

## Simple, intuitive data model

Graffy lets you think of all your data as a single global filesystem, parts of which are synced with clients.

Every scalar value (string, number) is a "file" in this virtual tree, each with its own unique path. Some values are "symbolic links" pointing to other paths in the filesystem - making the data model a graph rather than a tree.

Different parts of the graph can live on different databases and backend systems, just as (in Unix-like systems) different parts of the filesystem can live on different physical devices. Graffy lets you "mount" a _provider_ at any path in your data model.

## Expressive queries

Graffy queries can express 

## Highly modular

Unlike GraphQL resolvers and Falcor data providers, Graffy providers can be _composed_ like Express/Koa middleware. This allows authentication, validation, custom caches and resource limiting to be implemented in a straightforward manner.

## Built-in pagination

Graffy queries

Graffy provides [live queries](why/02-Live-Queries), which give clients a real-time view of the data they need. Graffy supports complex queries with nested graph traversals and pagination, while exposing a simple and intuitive API for building clients and servers.

Graffy was inspired by (and borrows from) Facebook's GraphQL and Netflix's Falcor. Compared to GraphQL, Graffy offers a more familiar data model, true live queries and more efficient caching. Compared to Falcor, it provides cursor-based pagination and real-time subscriptions.


Graffy providers can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries). This is particularly hard to do with GraphQL (see dataloader) and Falcor.
