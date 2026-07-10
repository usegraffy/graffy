---
title: Patterns
---

# Patterns

These are some common data modeling patterns.

## Canonical paths

Graffy's caching algorithms work better if every value in the data has only one *canonical path*. Consider, for example, a provider that allows users to be retrieved by ID as well as by email address. Both these queries are supported:

```javascript
{ user: { uid1: { name: true } } }
```

```javascript
{ user: [{
  $key: { email: 'bob@example' },
  name: true
}] }
```

Result graphs must have the same keys as the query, so when the query uses a path that is not the canonical one, we provide it in `$ref`. The results for the query above would then be:

```javascript
{ user: [{
  $key: { email: 'bob@example' },
  $ref: ['users', 'uid1'],
  name: 'Bob Example'
}] }
```

## Arrays

Graffy doesn't really support mutable arrays. Sure, we can use integers as keys, but there are no operations to insert or remove items while ensuring sequential array indices. Writing an array in Graffy will therefore replace the existing value completely, rather than adding or removing elements.

When specifying a query or graph, arrays are used commonly to represent nodes whose children have non-string keys (i.e. using the `$key` attribute). If the `$key` attribute is absent, or if the values in the array are not objects, we consider the integer index to be the key.

There are different scenarios where we might use an array in JavaScript, and there are different ways to represent them in Graffy.

### Integer-indexed lists

For example, an array of sentences in an article. We want to preserve order and allow storing duplicates. Paginated reads are possible, but partial updates are not.

This is the default treatment of arrays in graphs. They may be written like `{ prop: ['item1', 'item2'] }` and read like `{ prop: [{ $first: 3 }] }`.

These may hold any sort of JSON value, not just scalars.

### Integer-indexed tuples

For example, an array representing a game state in a board game like [Battleship](https://en.wikipedia.org/wiki/Battleship_(game)). These have the same properties as lists, but also require updates to values at specific indexes. We still can't add or remove items.

These can be created using arrays and read using range keys just as with lists. To write to a specific index, use `{ prop: [{ $key: 2, $val: 'FF' }] }`.

It is usually more convenient to give string names to each item in a small tuple. For example, if you're storing coordinates of a point in a tuple, consider modelling it as an object with properties x and y instead.

### Stacks and queues

TBD

### Linked lists

These support inserts and removals at any location in the array; when that happens, the index of subsequent elements get shifted.

This can be modeled in Graffy by using floating-point numbers as indices. When inserting an element between two existing ones, it is inserted at the mid-point of its neighbors' indexes ± a random jitter. (The random jitter allows two concurrent inserts to both succeed and not overwrite one another.)

### Sets

For example, the array of tags to a post. Each tag is a string with no identity, and its position in the array is unimportant. We want to add or remove specific elements, check if some specific elements are in the set, and get all the set members. Paginating over set members isn't possible.

We model these sets as key-value pairs where the set member is the key, and the value is always `true`, like `{ prop: { key1: true, key2: true } }`. To retrieve the whole set, we use the query `{ prop: true }`, while to read or write a particular element we use `{ prop: { key1: true } }`. To remove a member, write the value `null`.

This also works with sets of any type of data, not just strings. For example, with objects we may use `{ prop: [ { $key: { foo: 43 }, $val: true } ] }`.

### Lists or sets of objects with ID

For example, an array of comments under a post.

We should have a globally unique ID for each comment, and the comment object should have a `postId` property. It should be possible to read comments with a particular `postId` from a root `comments` collection. Each post could have a `comments` property which links to `$ref: [ 'comments', { postId: self.id, all: true } ]`.
