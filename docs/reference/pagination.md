---
title: Pagination
---

# Pagination

Pagination in Graffy is implemented using range keys, which are objects with one or more of the range properties below.

- `$first`, `$last`: integers; limits the result size from the beginning or end of the result range, respectively.
- `$all`: `true`; specifies that there is no limit.
- `$after`, `$before`: any value; the cursor position of the start or end of the result range (exclusive)
- `$since`, `$until`: any value; the cursor position of the start or end of the result range (inclusive)

These properties may be combined in various ways:

- Only one of the properties `$first`, `$last` and `$all` may be specified in a range key. If `$first` and `$last` are absent, `$all` is assumed and may be omitted, as long as there is at least one other range property.
- Only one of the properties `$after` and `$since`, and only one of `$before` and `$until`, may be present in a range key.

In the result graph, each child has a key that mirrors the original query, but with the range properties replaced with the cursor:

- `$cursor`: any value; the cursor position of this node

Range keys may also have other properties that specify filters, sort order etc. These must be echoed back in the result graph's keys.

For example, let's make a query for the first 2 users, ordered by their creation time. Note that `$order` is not a range property, but this is a conventional property name used by Graffy storage modules.

```javascript
// Query
{
  user: {
    $key: {
      $first: 2,
      $order: 'createTime'
    },
    name: true
  }
}
```

Keys in the result will have `$first` replaced with `$cursor`.

```javascript
// Result
{
  user: [
    {
      $key: {
        $order: 'createTime',
        $cursor: 1684939475
      },
      name: 'Alice'
    },
    {
      $key: {
        $order: 'createTime',
        $cursor: 1684984752
      },
      name: 'Bob'
    },
  ]
}
```

The `result.user` array will have three additional properties `$key`, `$next` and `$prev`. These contain range keys to re-fetch this page of results or to get the next or previous page of results, respectively. `$prev` or `$next` may be `null` if this is the first or last page of results, respectively.
