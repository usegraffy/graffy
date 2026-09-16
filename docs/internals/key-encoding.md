---
title: Key encoding
---

# Key encoding

The basic operations treat keys as byte strings, and this is sufficient for core and many built-in modules.

This means that some higher-level features such as *indexes*, *query parameters* and *pagination* require other data types and concepts to be encoded into keys.

## Restrictions

While the internal (*plumbing*) operations can handle any string of bytes as a key, the application-facing *porcelain* API distinguishes between simple property name strings, and keys that encode other things such as a pagination cursor.

There are a few restrictions on strings that can be used as property names: They may contain only valid Unicode characters, and may not contain a null character (`\0`).

## Indexes

TBD

## Query parameters

TBD

## Pagination

The "decoded" range is an object with the following properties.

```typescript
{
  ...params,

  before?: [ ...values ],
  after?: [ ...values ],
  since?: [ ...values ],
  until?: [ ...values ],
  first?: integer,
  last?: integer,

  cursor?: [ ...values ],
  id?: string,
}
```

It is encoded into:

```typescript
{
  key: string,
  end?: string,
  count?: integer,
}
```

The following use cases are supported:

1. In a query: looking up an object by ID. This uses the `id` property, which becomes the `key`.
2. In a query: filtering, sorting and paginating over a list of items. This must use `order`, and may also specify `first` / `last`, `filter`, `after` / `since` and `before` / `until`. This populates `key`, `end`, and perhaps `count`.
3. In a graph: placing an item within a paginated list. This uses the `cursor` property and echoes the query's `filter` and `order` properties.
4. In a graph: specifying a range of non-existent values in a paginated list. This uses the `after` or `since`, and `before` or `until` properties, and echoes the query's `filter` and `order` properties.
5. In a query: looking up an object by an exact search query. This uses `filter` for the search query.
6. In a graph: a response to an exact search query. This also uses `filter` for the query.

### Why id?

```typescript
{ id: 'something' }

// Encodes into
{ key: 'something' }
```

This allows us to support GraphQL syntax:

```graphql
{
  node(id: $id) { /* ... */ }
}
```

Constructing a graph:

```typescript
graph({
  users: [
    { _key_: 'u1', name: 'Alice' },
    { _key_: 'u2', name: 'Bob' },
    // ----------------------------
    { _key_: { filter, order, cursor }, _ref_: ['users', 'u2'] }
  ]
});
```

Query: filter, order, first, after

Draft encoding (superseded, kept for context):

```javascript
// OLD
query: {
   [filter, order]: {
        [first + after]: { ... }
   }
}

result: {
     [filter, order]: {
          [cursor]: { ... }
     }
}
```

```javascript
// NEW
query: {
     [filter, order, first + after]: { ... }
}

result: {
      [cursor]
}
```

```javascript
{
  id1,
  id2,
  [filter, order, first, after]: { ... },
  [filter2, order2, first2, after2]: { ... }
}
```

```javascript
// Fetcher
graffy.use(fetcher({
  byIds: (ids) => ...; // [ id1, id2 ]
  byQuery: ({ first, after, before, ...filter }) => ... db.query(...)
    .map(doc => ({
      _key_: [doc.createTime],
      ...doc
    }))
}));
```
