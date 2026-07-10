---
title: References
---

# References

Queries *traverse* references. Consider this query:

```javascript
{
  posts: { pid1: {
    title: true,
    author: { name: true }
  } }
}
```

The first result of this query may be:

```javascript
{
  posts: { pid1: {
    title: 'Hello, world',
    author: { $ref: 'users.uid1' }
  } }
}
```

The `{ name: true }` part of the query (which gets the author's name) is still *unfulfilled*. Graffy will then construct a *follow-up query* to fulfill that, by combining the unfulfilled sub-query with reference path `'users.uid1'`.

```javascript
{
  users: { uid1: { name: true } }
}
```

If the path has a trailing range key *and* the root of the sub-query has a range key, the two range keys are merged when constructing this follow-up query. Here's an example:

```javascript
{
  users: { uid1: {
    name: true,
    posts: [{
      $key: { first: 10 },
      title: true
    }]
  } }
}
```

Graffy combines the reference `['posts', { authorId: 'uid1', all: true }]` with the unfulfilled sub-query `[{ $key: { first: 10 }, title: true }]` to construct the follow-up query.

```javascript
{
  users: { uid1: {
    name: 'Alice',
    posts: { $ref: [
      'posts',
      { authorId: 'uid1', all: true }
    ] }
  } }
}
```

```javascript
{
  posts: [{
    $ref: {
      authorId: 'uid1',
      first: 10
    },
    title: true
  }]
}
```
