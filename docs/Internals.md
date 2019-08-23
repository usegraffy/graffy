This document is intended for those working on Graffy project itself (i.e. the core and built-in modules).

# Part 1: How code is organized

Graffy is intended to be very modular, and each module is published as a separate NPM module in the @graffy scope. It's all in one repo using yarn workspaces. The current codebase has the following modules:

- core. It is very similar to the middleware router in Express or Koa. There are 6 basic APIs: get, put, sub, onGet, onPut and onSub. When get is called, it calls the relevant handlers registered with onGet in sequence; similarly for the rest.

  You can register modules at different routes. For example you could have one for /users, one for /posts etc.

  All the other modules simply register stuff with core's onGet, onPut and onSub. This means that third-party modules get the same level of access as first-party ones, and the hope is that there will be an ecosystem of plugins connecting Graffy to all sorts of data stores and message brokers.

  The middleware architecture is pretty powerful; people may write modules to do authorization, validation, rate limiting etc. It is also planned that the type system will be implemented as a module.

- testing. This module provides a mock, in-memory "backend" middleware that simply stores whatever is put into it, returns the same if queried, and pushes updates on writes. Will have other unit testing helpers.

- fill. This middleware module ensures that deep queries are fulfilled by traversing symlinks. If the query results contain symlinks that need to be traversed, it makes another query to retrieve the linked parts (recursively). It also does something equivalent (but a bit more involved) for live queries.

- react. This middleware module provides hook and render prop - based API for binding components to Graffy queries.

- client and server. These middleware modules implement an HTTP-based transport. The client runs on the browser and uses the EventStream API. Server runs in Node.js.

- cache. Middleware module implementing an in-memory cache.

- schema. Type checking and introspection as middleware. This is just a stub right now.

- graphql. This library allows people to write queries using a subset of GraphQL syntax. It uses graphql-js parser under the hood and transforms the parsed document into an equivalent Graffy query.

The "common" module exports a set of utility methods that used by the middleware above.

- build. This provides helper functions to create queries and graphs in their internal representation from a friendly JSON-like representation.

- decorate. It converts graphs from the internal representation used by Graffy to a friendly JSON representation. In some ways the opposite of build.

- graph. This provides the basic set operations on queries and graphs. At some point I want to experiment with rewriting this module in Rust and compiling it to WASM.

  - slice. Given a graph G and a query Q, it returns `known`, a graph representing the intersection, and `unknown`, a query representing Q - G.
  - merge. Given graphs G and H, it updates G to include all the paths that are present in H. Paths that are common in both will have the newer value.
  - seive. Given graphs G and H, it updates those paths in G that are present in both G and H (if newer), and returns a new graph containing only those parts.
  - add. Given queries Q and R, it returns a new query containing all the paths in both the queries. For paths that are common in both, their values are added together and the newer clock is kept.

- key, node, path. Small utility functions

- stream. Helper for creating JS async iterators from an event emitter-style source.

# Part 2: Keys.

I'm assuming familiarity with the tree-with-symlinks approach to modelling graphs (otherwise it's a quick one-paragraph read). Falcor calls this JSON Graph, but it's actually a lot closer to a filesystem than to JSON. Keys are always strings. For pagination purposes, the children of a node are considered sorted by key.

A lot of the interesting things that Graffy can do depend on cleverly encoding things into key strings.

For example, I wrote a function to encode floating point numbers into strings such that the resulting strings sort the same way as the original numbers.

But before we get into that, an aside on nulls and ranges.

Graphs usually represent a partial knowledge of the application's data - think caches, change sets etc. This means we often need to distinguish between keys that we don't know about, and keys we know don't exist. Unknown keys are simply not present in the tree, while those known to be absent are represented by the value null.

Sometimes we also need to represent the fact that a range of keys are absent. For example, say we query the backend for the first 3 users after 'a', and we got the results "alice" and "bob". The fact that these are the "first 3" means that we also know there is no user between a and alice, between alice and bob, or after bob. If a subsequent query wants to query for "charlie", we know it's null without going to the server. More commonly, if we try to query for the "first 5 users after a", or "first 2 users after alice", we can also serve those requests from the cache without going to the server.

To do this, the cache needs to store its knowledge that there are no keys in the ranges: [a, alice), (alice, bob), (bob, MAX_KEY]. Note the mix of inclusive and exclusive intervals. We do this using range keys.

Back to keys.

We restrict non-range keys to non-empty unicode strings that do not contain the null character (\0). However we relax these conditions for range keys in order to succinctly represent the "highest possible key" (MAX_KEY) and "smallest possible key" (MIN_KEY):

- MIN_KEY is the empty string, '', which will sort before all other strings.
- MAX_KEY is '\uFFFF', which is not a valid UTF-16 character (but works fine in JS anyway) and will sort higher than all valid unicode strings.

Another requirement is to distinguish between inclusive and exclusive bounds in ranges. We do this by making range bounds inclusive by default, and where we need an exclusive bound for a given key K using either "the highest possible key less than K" (keyBefore)or "the lowest possible key higher than K" (keyAfter) instead of K. Those are defined by:

- keyAfter(K) is just K + '\0'. e.g. keyAfter("alice") = "alice\0"
- keyBefore(K) is computed by decrementing the final character of K by one codepoint and then appending a '\uFFFF'. e.g. keyBefore("alice") = "alicd\uFFFF".

I'm totally aware that they look fairly ugly (especially in JS; they would look much less ugly in C or Rust) but it greatly simplifies implementation of a lot of the operations. Plus, it is an internal concept - range keys usually aren't exposed to users (unless they are doing something low-level, like implementing an alternate cache).

One more thing about keys: the application might need to construct keys from multiple values of different types, especially to create indexes. This works just like indexes in MySQL: you can reference multiple columns in a CREATE INDEX ... to match the query you want to use.

For example, you might have blog posts that you want sorted by date, and then (in case of duplicate dates) by ID. The keys would then contain both date and ID.

In Graffy, the plan is to separate these different segments with '\0', so that if a segment is empty for a particular key we would get the same behaviour as NULLS LAST in MySQL.

# Part 3: Data structures

The internal representation of queries and graphs is based on arrays. These are constructed from the friendlier representations used in the docs using the query and graph builder functions.

## Graphs

For example,

```js
graph({
    foo: 10,
    bar: {
        baz: 'a',
    },
}, 1)
```
will return the internal representation, which is:

```js
[
  { key: 'bar', clock: 1, children: [
    { key: 'baz', clock: 1, value: 'a' },
  ] },
  { key: 'foo', clock: 1, value: 10 },
]
```

Note that the order of foo and bar have been reversed, because a node's children must always be sorted by key. Maintaining order greatly speeds up most operations as we can now use binary search. (Before the CRDT refactor I used a more straightforward approach of just storing JSON objects. This had really bad performance as many operations required iteration in key order.)

The "clock" attribute on each node stores a timestamp which serves as a version number or cache "age" measure. There is some logic around how the clocks affect the operations fetch (query), watch (live query) and patch (apply a change set).

I'll skip the clock property from now to reduce noise.

## Queries

Queries are very similar. Let's switch the example a bit, here's a query to get the first 3 posts for a blog:

```js
query({
  posts: [ { first: 3 }, {
    title: true,
    author: true,
  } ],
}, 1)
```

which returns the internal representation:

```js
[
  { key: 'posts', children: [
    { key: '', end: '\uFFFF', count: 3, children: [
      { key: 'title', value: 1 },
      { key: 'author', value: 1 }
    ] }
  ] }
]
```

`key: '', end: '\uFFFF', count: 3` is the internal representation of `{ first: 3 }`. It identifies a range with start and end keys and a count. To simplify in-order graph traversal, the start key is just called "key".

Here, as "before" and "after" where not specified, the start key is MIN_KEY ('') and the end key is MAX_KEY ('\uFFFF'). "first" is represented by a positive count, and "last" by a negative count.

This transformation helps us normalize all possible GraphQL-style pagination arguments into a standard format with 3 mandatory keys, and avoid all the branching into different cases we'd otherwise have to do.

The value is a count of how many clients are interested in that leaf node. When you construct a query this is always 1, but it changes when some middleware adds or subtracts queries.

Ranges in Graphs

If we send the query above to a backend, it might return a graph like this:

```js
[
  { key: 'posts', children: [
    { key: '', end: 'post0\uFFFF' },
    { key: 'post1', children: [
      { key: 'title', value: 'A post' },
      { key: 'author', path: [ 'users', 'user1' ] }
    ] },
    { key: 'post1\0', end: 'post1\uFFFF' },
    { key: 'post2', children: [ ... ] },
    { key: 'post2\0', end: 'post2\uFFFF' },
    { key: 'post3', children: [ ... ] },
  ] }
]
```

Here, the actual results (keys post1, post2 and post3) are interleaved with "ranges", highlighted in blue. These represent the fact that there are no keys before 'post1', between 'post1' and 'post2', or between 'post2' and 'post3'.

Also, the red highlight shows how symbolic links (to other parts of the tree) are represented.

## Differences between Graph and Query Representations

In both graphs and queries, children are sorted by key.

In graphs, there is the additional restriction that ranges and keys must not overlap. i.e. the item following a range must have a key greater than the range's end.

There is no such restriction in queries. We could construct a single query requesting both the first 3 children and the last 3 children: it would look like:

```js
[
  { key: '', end: '\uFFFF', count: -3, children: [ ... ] },
  { key: '', end: '\uFFFF', count: 3, children: [ ... ] },
]
```

So children in queries are sorted by key first, then by end, and finally by count.

A few other differences might also be apparent:

- Ranges in graph nodes have no value or children. Ranges in query nodes must have a value or children and a count attribute.
- Ranges can't have paths.
- Values in query nodes must be integers, while those in graphs can be any value.

Despite these differences, they are close enough that the implementations of most operations can be shared.

You can find a formal spec for these data structures [here](../src/common/graph).

# Part 4: Authoritative and non-authoritative Providers (in graffy-core)

Providers are the callback functions you attach via "on('get', callback)", "on('sub', callback)" etc. When a "get" or "sub" happens, these providers are called sequentially in the order they are attached.

Providers are passed three arguments - the first is the query (get / sub) or change set (put), the second is an options dictionary and the third is a "next" function, used to yield to the next provider. For example, providers doing caching, validation, authentication etc. will call next() conditionally.

Very often, Graffy users (as opposed to graffy module developers) will write authoritative providers. These providers are connected to the "source of truth" database for the paths they handle, and only call next() for paths that they are not handling.

For example, if we have an authoritative handler on /users and it is passed a query for both users and posts, it must call next() with a new query for posts.

As a convenience, we do this automatically for authoritative providers, which are attached using the onGet, onSub methods rather than on('get', ...). If you look at the implementation, the wrapGet and wrapSub functions add the logic for calling next. Authoritative providers aren't passed the next function.

p.s. Node.js frameworks like Express also make this distinction between "authoritative" handlers that are attached using .get(), .post() etc. and non-authoritative ones that are attached with .use().
