# Indexes

Indexes are a common Graffy pattern that uses links and ranges to help queries order, filter and paginate over data in different ways.

For example, to query posts based on their date, we might define an index that links dates to the posts:

```js
import { key, link } from '@graffy/common';
// Data
{
  posts: {
    1: { …, date: '2019-03-02' },
    2: { …, date: '2019-03-04' }
  },
  // This is the index
  posts$date: {
    [key('2019-03-02', 1)]: link('/posts/1'),
    [key('2019-03-04', 2)]: link('/posts/2'),
  }
}
```

By convention, indexes are named with the name of the resource (`posts`), and the sort order (`time`), separated by a `$`.

Index keys must be unique; as two posts may have the same date, we append the ID to index keys to ensure uniqueness. We also use the `key()` helper to specify keys that contain multiple values and types other than strings.

> **Note**: The order matters! Keys are sorted by the first value, and subsequent values are only used to break ties.

```js
// Query: First 10 posts created in January
{
  posts$date: [
    { after: ['2019-01-01', 0], before: ['2019-01-31', 0], first: 10 },
    {
      title: true,
      author: { name: true, avatar: true },
      date: true,
    },
  ];
}
```

## Index providers

Indexes aren't usually stored in backend systems - they are just a way for Graffy to make sense of backend queries that involve filtering and sorting.

A provider for an index can simply translate a Graffy query to the corresponding database query, and transform the results into the index graph shown.

Here's an example provider for the `posts$date` index:

```js
import { key, decodeKey } from '@graffy/common';
import _ from 'lodash';

store.onRead('/posts$date', async query => {
  const { first, after } = query[0]; // Range queries are [ range, subQuery ]
  const [ date, id ] = decodeKey(after);

  const posts = await db.query(`
    SELECT * FROM posts
    WHERE date > $date OR (date = $date AND id > $id)
    ORDER BY date, id
    LIMIT $first
  `, { date, id, first });
  return _.fromPairs(posts.map(post => [key(post.date, post.id), post]));
});
```
> Warning: This code is missing essential validations for the sake of brevity. For a complete example, see the SQL recipe.

## Filtering

It's possible to create indexes that support filtering as well as pagination. For example let's say we only want posts with author ID `14` and the tags `english` and `coffee` the query would then look like:

```js
{
  posts$date: {
    [key({authorId: 14, tags: ['english', 'coffee']})]: [
      { first: 10 },
      {
        title: true,
        author: { name: true, avatar: true },
        date: true,
      }
    ]
  }
}
```

Note that the "filter" parameters are passed as-is to the index provider - they don't need to correspond to fields of the object, and Graffy makes no special assumptions about them.
