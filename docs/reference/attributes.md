---
title: Attributes
---

# Attributes

Graphs and Queries may have *attributes* to encode concepts that aren't expressible in JSON.

- `$key`, `$ref` and `$chi` on both graphs and queries
- `$val`, `$put`, `$ver` and `$err` on graphs

## `$key`

Specifies a key range on a node, particularly when the keys aren't strings. These are equivalent:

```javascript
users: {
  uid1: {
    name: 'Alice'
  }
}
```

Here, the `users` node has only one child. When this happens we may skip the array.

```javascript
users: [{
  $key: 'uid1',
  name: 'Alice'
}]
```

```javascript
users: {
  $key: 'uid1',
  name: 'Alice'
}
```

[Pagination](pagination) uses specially crafted objects as keys, called range keys.

## `$ref`

Refers to a specific node in the tree using its path. In graphs, they are used to specify *links*, while in queries, they help specify *aliases*.

**Links** are similar to symbolic links in a filesystem, and "redirect" queries from one part of the tree to another.

For example, a post object may link to the user who wrote it, or a user object may link to a collection of their posts. Here, `author` is a link to a user object, and `posts` is a link to a collection of post objects.

```javascript
author: { $ref: 'users.uid1' }
```

```javascript
posts: { $ref: [
  'posts',
  { authorId: 'uid1', $all: true }
] }
```

**Aliases** allow us to rename parts of a query to make it easier to process the results. This query, for instance, makes a query under `comments` and renames the result to `firstComments`.

Here, `firstComments` is an alias of the comments query.

```javascript
{
  firstComments: {
    $ref: ['comment', { $first: 2 }],
    title: true
  },
}
```

Queries can *traverse* these [references](references).

## `$chi`

Options are additional data interpreted by providers when fulfilling for a read or write operation. For example, authentication credentials may be provided under options. `$opt` is valid only at the root of a query or change graph tree; it is not valid on result graphs.

Conventionally, read operations support two boolean options, `fetch` (whether the initial result should be retrieved) and `watch` (whether change stream should be retrieved). Both are `true` by default.

## `$val`

By default, Graffy considers JS objects and arrays to be graph nodes. Sometimes, it is useful to store a JS object or array in a Graffy leaf node and treat it as a simple, atomic value: `$val` does that.

For example, imagine that you are storing some geographic information in a GeoJSON object, within Graffy. As this structure has arrays, and we don't need to query parts of it using Graffy, this should be stored as a scalar value.

There are two equivalent ways to use `$val`:

```javascript
{ worldCoastlines: { $val: true, ...geoJson } }
```

```javascript
{ worldCoastlines: { $val: geoJson } }
```

## `$put`

By default, Graffy graphs are *change objects* containing only the properties that changed.

```javascript
user: {
  123: {
    name: 'Alice'
  }
}
```

If this graph is written, pre-existing properties, say `email`, will be kept.

Sometimes, we need to write a full object and drop any unspecified properties. Passing `$put` accomplishes this.

```javascript
{
  user: {
    123: {
      $put: true,
      id: '123',
      name: 'Alice'
    }
  }
}
```

<details markdown="1">
<summary>Advanced usage</summary>

In rare situations, we may wish to specify that certain ranges of properties should be dropped while others are preserved. The `$put` attribute can be an array of range objects to express this.

These objects may have the properties `$after`, `$before`, `$until`, `$since` and `$version`.

This example specifies that "id" and "name" should be preserved, and other properties reset.

```javascript
$put: [
  { $before: 'id' },
  { $after: 'id',
    $before: 'name' },
  { $after: 'name' }
]
```

</details>

## `$ver`

Specifies the version of a node in a query or graph, which may be a string or a number. [Versioning](versioning) is used to provide eventual consistency, resume-able subscriptions and atomic write operations.

When `$ver` is specified on a node, all its children are assumed to have the same version. If a node has descendants of different versions, it must not have a `$ver` attribute.

<details markdown="1">
<summary>Advanced usage</summary>

In rare occasions, sibling leaf nodes (i.e. strings, numbers etc.) may have different versions. We represent this using an object form of the `$ver` attribute.

Here, the name and email properties have different versions. An analogous situation might occur when using the array form of `$put`, in which case the range objects contain a `$version` property.

```javascript
{
  name: 'Alice',
  email: 'alice@example',
  $ver: {
    name: 38,
    email: 35
  }
}
```

</details>

## `$err`

Errors encountered when processing a read or write operation. These may be on the root object or, if an operation was partially successful, only on the branches that failed.
