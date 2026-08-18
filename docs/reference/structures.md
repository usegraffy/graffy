---
title: Structures
---

# Structures

Graffy uses two main tree-like structures, *graphs* and *queries*. It also uses *paths* and *keys* to identify nodes within these trees.

## Graphs

APIs built with Graffy model the application's data in a single tree, not unlike a filesystem. The standard convention is to have your data organized into *collections* of different object types (say a **user** collection and a **post** collection).

Graffy also supports *links* from one point in the tree to another, much like symbolic links in a filesystem. In this example, the post has a link, **author**, which refers to a particular user object using its absolute path in the tree.

The special property `$ref`, which specifies the link, is an *attribute*. Graffy has a few others — we'll get to them soon.

All data in Graffy is represented using these JSON trees-with-links, which we call *graphs*.

```javascript
{
  users: {
    uid1: { name: 'Alice' },
    uid2: { name: 'Bob' }
    ...
  },
  posts: {
    pid1: {
      title: 'Hello world',
      author: { $ref: 'users.uid2' }
    },
    ...
  }
}
```

## Queries

**Queries** represent data requirements in a tree structure that matches the expected results, with `true` in place of the leaf nodes to fetch.

Here's an example query and its result. Note how we *traverse* the author link to get the user name.

```javascript
// Query
{
  posts: {
    pid1: {
      title: true,
      author: { name: true }
    }
  }
}
```

```javascript
// Result
{
  posts: {
    pid1: {
      title: 'Hello world',
      author: {
        $ref: 'users.uid2',
        name: 'Bob'
      }
    }
  }
}
```

## Keys

In a graph or query tree, **keys** identify a node in the context of its parent. Here, `'users'`, `'uid1'` and `'name'` are keys.

When all of a node's children have string keys, it can be written as a plain JSON object.

```javascript
{
  users: { uid1: { name: 'Alice' } }
}
```

On occasion, we may want to use other JSON values as keys. For example, we may want to use a JS object as a key to identify a user by their email address, rather than the user ID.

Here we write the parent node as a JSON array, and add keys to each child node with the `$key` attribute.

```javascript
{
  users: [{
    $key: { email: 'bob@example' },
    name: 'Bobby Tables'
  }]
}
```

In queries, *range keys* can be used to refer to multiple children rather than a single child. Range keys are JS objects with one of the range properties `$first`, `$last`, `$after`, `$before`, `$since`, `$until` and `$all`.

In this example query, we're requesting the titles of the 3 latest posts tagged "javascript". See [Pagination](pagination) for more details.

```javascript
{
  posts: [{
    $key: {
      tags: ['javascript'],
      $last: 3
    },
    title: true
  }]
}
```

## Paths

We refer to locations in a graph using their absolute paths, which are sequences of keys. They are either string keys joined using dots, like `'users.uid2'`, or arrays of keys (e.g. `['users', 'uid2']` or `['users', { email: 'bob@example' }]`).

Paths may include one range key, and if it does, it must be the last key in the path. This is useful when we need to specify a *subset* of the children of a node, rather than the node itself. For example, a path that refers to the last 3 posts can be written as `['posts', { $last: 3 }]`.
