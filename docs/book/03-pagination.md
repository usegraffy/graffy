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

It's straightforward to get a post when you know its ID, but that's pretty limiting. More realistically, we might want to fetch, say, 10 posts at a time. We can specify that in the query using an array.

### Slices

```js
graffy.fetch({
  posts: [{ first: 10 }, {
    title: true,
    author: { name: true, avatar: true },
    date: true
  }]
});
```

See the `{ first: 10 }`? That tells Graffy which children of `posts` to include in the response. The second argument (`{ title, ... }`) is the sub-query to apply to each post (i.e. each grandchild of the `posts` node).

If you're used the GraphQL, you can probably guess how slice works. The first argument to `slice()` can be:
- `{ first: N }` or `{ last: N }` for the very first or last N children
- `{ first: N, after: key }`, `{ last: N, before: key }` for N children starting at the given key (post ID in this example)
- `{ after: firstKey, before: lastKey }` for all the children between the two keys; this could also have a `first` or `last` property to limit the result.

Slices by themselves have a pretty serious limitation: they operate on keys, not on values. In this example, we got the first 10 posts ordered by _post ID_. This isn't super useful.

More realistically, we might want the first 10 posts in January, ordered by date. That can't be accomplished by `slice()` alone, you need an _index_.

### Indexes

Indexes are a common Graffy pattern that uses links and slices to help queries order, filter and paginate over data in different ways.

For example, to query posts based on their date, we might define an index that links dates to the posts:

```js
// Data
{
  posts: {
    1: { …, date: '2019-03-02' },
    2: { …, date: '2019-03-04' }
  },
  // This is the index
  postsByDate: {
    [key('2019-03-02', 1)]: link('/posts/1'),
    [key('2019-03-04', 2)]: link('/posts/2'),
  }
}
```

Index keys must be unique; as two posts may have the same date, we append the ID to index keys to ensure uniqueness. We also use the `key()` helper to specify keys that contain multiple values and types other than strings.

> **Note**: The order matters! Keys are sorted by the first value, and subsequent values are only used to break ties.

```js
// Query: First 10 posts created in January
{
  postsByDate: slice(
    { after: '2019-01-01', before: '2019-01-31', first: 10 },
    {
      title: true,
      author: { name: true, avatar: true },
      date: true
    }
  )
}
```

### Next

Representing changes.
