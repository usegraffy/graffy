# Pagination

Let's take a look at our blog example again.

```js
{
  posts: {
    1: { title: 'Introduction', … },
    2: { title: 'Basics', … },
    …
  }
}
```

It's straightforward to get a post when you know its ID, but that's pretty limiting. More realistically, we might want to read, say, 10 posts at a time. We can specify that in the query using an array.

## Ranges

```js
graffy.read({
  posts: [
    { first: 10 },
    {
      title: true,
      author: {
        name: true,
        avatar: true,
      },
      date: true,
    },
  ],
});
```

See the `{ first: 10 }`? That's a _range_ - it tells Graffy which children of `posts` to include in the response. The second argument (`{ title, ... }`) is the sub-query to apply to each post (i.e. each grandchild of the `posts` node).

If you're used the GraphQL, you can probably guess how ranges works. The first argument to `ranges()` can be:

- `{ first: N }` or `{ last: N }` for the very first or last N children
- `{ first: N, after: key }`, `{ last: N, before: key }` for N children starting at the given key (post ID in this example)
- `{ after: firstKey, before: lastKey }` for all the children between the two keys; this could also have a `first` or `last` property to limit the result.

## Range results

If you `.read()` or `.watch()` the query above, it might return something like:

```js
{
  posts: [
    { title: 'Introduction', … },
    { title: 'Basics', … },
    … // 8 more items
  ]
}
```

Note how posts is an array. Graphs don't really support arrays, so the provider for the query above should return something like:

```js
{
  posts: {
    1: { title: 'Introduction', … },
    2: { title: 'Basics', … },
    …
  }
}
```

which Graffy converts to an array and adds pagination properties to.

Note that keys are not included in the final array; if your application requires the properties used to construct the key, they should be explicitly requested and provided.

In the example above, if the consumer requires post IDs, it should request `id` alongside `title`, and the provider should return them in the posts as well as the post keys. This small duplication helps Graffy avoid a magic `_id_` property.

## Pagination properties

The array returned by `.read()` and `.watch()` for range queries has two useful non-enumerable properties, `nextRange` and `prevRange`. For example:

```js
const query = { posts: [{ first: 10 }, { title: true }] };

const result = graffy.read(query);
console.log(result);
// { posts: [ ... ]}

console.log(result.posts.nextRange);
// { first: 10, after: 'some_key' }

console.log(result.posts.prevRange);
// null - this is the first page.
//
```

Typically, if the UI has a Next button, clicking it should make the query:

```js
{
  posts: [prevResult.posts.nextRange, { title: true }];
}
```

This works for multiple levels of nested pagination.

## Why Indexes

Ranges by themselves have a pretty serious limitation: they operate on keys, not on values. In this example, we got the first 10 posts ordered by _post ID_. This isn't super useful.

More realistically, we might want the first 10 posts in January, ordered by date. That can't be accomplished by ranges alone, you need an _index_.
