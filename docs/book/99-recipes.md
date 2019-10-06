# Graffy Recipies

These are recommended

# Fulfilling an index from a relational database

```js
store.onFetch('/postsByDate', async query => {
  const result = { posts: {}, postsByDate: {} };
  for (const key in query.postsByDate) {
    const { before, after, first, last } = decode(key);
    const { id, title, body, author, date } = query.postsByDate[key];

    const rows = await db.query(
      `SELECT ${[
        'id',
        'created_at',
        title && 'title',
        body && 'body',
        author && 'author_id',
      ]
        .filter(Boolean)
        .join(', ')} FROM posts WHERE ${[
        slice.before && 'date <= $before',
        slice.after && 'date >= $after',
      ]
        .filter(Boolean)
        .join(' AND ')} ORDER BY date ${last ? 'DESC' : 'ASC'} LIMIT ${last ||
        first}`,
      { before, after, count: last || first },
    );

    rows.forEach(row => {
      const post = {};
      if (id) post.id = row.id;
      if (title) post.title = row.title;
      if (body) post.body = row.body;
      if (author) post.author = link(`/users/${row.author_id}`);
      if (date) post.date = row.created_at;
      result.posts[row.id] = post;
      result.postsByDate[key(row.created_at, row.id)] = link(
        `/posts/${row.id}`,
      );
    });

    return result;
  }
});
```
