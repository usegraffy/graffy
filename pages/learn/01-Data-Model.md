# Data model

Graffy lets you think of all your data as a single global tree – like a filesystem. Parts of which are fetched by or synced with clients.

Every scalar value (string, number) is a "file" in this virtual tree, each with its own unique path. Some values are "symbolic links" pointing to other paths in the filesystem - making the data model a graph rather than a tree.

If you've ever used Falcor, this should sound pretty familiar - it's JSON Graph.

Different parts of the graph can live on different databases and backend systems, just as (in Unix-like systems) different parts of the filesystem can live on different physical devices. Graffy lets you "mount" a _provider_ at any path in your data model.

Here's an example graph for a toy blog with some `users` and some `posts`:

```js
{
  users: {
    1: { name: 'Alice',
         avatar: '👧', … },
    2: { name: 'Bob',
         avatar: '👨', … },
    …
  },
  posts: {
    1: { author: link('/users/2'), … },
    2: { author: link('/users/1'), … },
    …
  }
}
```

The `author` property on each post is a link to the corresponding user. `link()` is a helper that creates a link object.

> **Note**: The Graffy data model isn't exactly JSON. Keys (property names) don't have to be strings, they can be any data type. Arrays come with many caveats and generally can't be used except as leaf nodes. (This is why `users` and `posts` are objects, not arrays.) `null` has special meaning (a value known to not exist) and can't be used to represent anything else.

## Queries

Graffy queries specify all the nodes (down to leaf nodes) they want to read, in a tree that mirrors the expected result.

```js
// Query
store.read({
  posts: { 1: {
    author: {
      name: true,
      avatar: true
    }
  } }
});

// Result
{ posts: { 1: {
  author: {
    name: 'Bob',
    avatar: '👨'
  }
} } }
```

You might have noticed that the query went right through a symlink. This allows Graffy to return multiple nested resources in a single query.

Note how the "symlink" in the underlying graph isn't visible in the query results; query results are converted from JSON Graphs with links to plain JS object graphs with object references.
