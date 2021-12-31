# Postgres

The standard Postgres module for Graffy. Each instance this module mounts a Postgres table as a Graffy subtree.

## Usage

```js
import pg from '@graffy/pg';

graffyStore.use(pg(options));
```

Connection parameters should be set in environment variables. Uses the [pg](https://github.com/brianc/node-postgres) library.

### Query filters

Query filters are passed in `$key` and are JSON-based, somewhat like MongoDB.

1. Filters expressions follow a **property**, **operator**, **value** order. Values are scalar values (strings or numbers).
2. Property names are always object keys. They may be strings with dots `.`.
3. Operators are placed in objects as well and have a leading `$`.
4. Values are JSON values.
5. Multiple properties in an object are combined with `AND`. Items in an arrays are combined with `OR`.
6. The supported operators are:
    - `$eq`: optional in most cases.
    - `$lt`, `$lte`, `$gt`, `$gte`: Ranges
    - `$re`, `$ire`: Regex match (case sensitive and insensitive versions)
    - `$text`: Full text search, always case insensitive
    - `$not`: Modifies other filters or inverts a condition
    - `$and`, `$or`: Combines conditions; optional in most cases
    - `$all`, `$has`, `$any`: Apply conditions to the elements of a collection (list or map)

#### Basic

1. `{ foo: 5 }` and `{ foo: { $eq: 5 } }` compile to SQL `foo = 5`.
2. `{ foo: { $gt: 5, $lt: 6 } }` becomes `foo > 5 AND foo < 6`.
3. `{ foo: { $ire: '^wor.*' } }` becomes `foo ~* "^wor.*"`.
4. `{ foo: { $text: 'potatoes' } }` becomes `foo @@ websearch_to_tsquery('potatoes')`.
For this to work, `foo` must be a TSVector column.

#### Or

1. `{ foo: [5, 6] }` means *foo equals 5 or foo equals 6*, and the compiler is smart enough to simplify this to `foo IN (5, 6)`. There is no separate $in.
2. `{ foo: [ 5, { $gt: 6 } ] }` becomes `foo = 5 OR foo > 6`
3. `[ { foo: 6 }, { bar: 7 } ]` becomes `foo = 6 OR bar = 7`

#### Not

1. `{ foo: { $not: 6 } }` becomes `foo <> 6` (the SQL not equals operator)
2. `{ foo: { $not: [5, 6] }` becomes `foo NOT IN (5, 6)`
3. `{ foo: { $not: [ 5, { $gt: 6 } ] } }` becomes `NOT (foo = 5 OR foo > 6)`

#### Logic

1. By default, objects mean `AND` and arrays mean `OR`:
`[ { foo: 5, bar: 6 }, { baz: 7, qux: 4 } ]` becomes
`(foo = 5 AND bar = 6) OR (baz = 7 AND qux = 4)`
2. Use `$and` and `$or` operators explicitly to use any structure in either context:
    
    `{ $and: [ { $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } } ] }` becomes
    `(foo = 5 OR bar = 6) AND (baz = 7 OR qux = 4)`.

#### Contains and Contained by

1. `{ tags: { $cts: ['foo', 'bar'] } }` becomes `tags @> '{"foo","bar"}'`.
Tags must contain both *foo* and *bar*. Note that the array of conditions here does not have `OR` semantics.
2. `{ tags: { $ctd: ['foo', 'bar', 'baz'] } }` becomes `tags <@ '{"foo","bar","baz"}'`.
Every tag must be one of *foo*, *bar* or *baz*.

#### Notes

1. We drop several MongoDB operators while retaining the capability:
    - `$ne`: Use $not instead.
    - `$in`: Use an array of values; it is a combination of implicit $or and $eq.
    - `$nin`: Use $not and an array of values.
    - `$exists`: Use `null` or `{ $not: null }`. Postgres does not distinguish between `undefined` and `null`, and neither does Graffy (in this context at least; it's complicated.)
2. Graffy `$has` is equivalent to MongoDB `$all` (each of the provided conditions is met by  at least one element in the array). Graffy `$all` (every element of the array meets a condition) has no direct MongoDB equivalent, but can be expressed as `{ $not: { $elemMatch: { $not: (cond) } } }`
3. Graffy has a separate operator for case-insensitive regex, and configures the text search locale in the database object rather than the query. This makes MongoDB's regex `$options`, full text `$language` etc. unnecessary.
4. Graffy does not have equivalents for MongoDB operators `$type`, `$expr`, `$jsonSchema`, `$where`, `$mod`, `$size` and the geospatial operators.

### Order by

The root of the Graffy filter object must be an object. (Use `$or` if required.) The property `order` specifies the order. This means `order` cannot be used as the name of a column, just as with `before`, `last` etc.

Its value may be a single property name, an array of property names, or an object containing a `$text` filter to sort by the match relevance.

### Full Text Search

A full-text search query typically has three requirements:

- Filter: `{ ix: { $text: 'query' } }`. Return only results that match.
- Order: `{ $order: { $text: ['ix', 'query'] }, ... }`. Sort results by relevance.
- Projection: `{ ix: { query: true } }`. Return snippets of the document surrounding matches.

In all three, `ix` is a computed column of type TSVector.

### Aggregations

```js
// Query
{
  books: [{
    $key: { published { $gte: '2000-01-01' }, $agg: true },
    genre: true,
    author: { name: true },
    $count: true,
    $sum: {
      price: true
    }
  }]
}

```

This is converted into some SQL like:

```sql
SELECT
  genre,
  authorId, -- used to construct the author link
  count(id) count,
  sum(price) sum_price
FROM
  books
WHERE
  published >= '2000-01-01'
GROUP BY
  genre,
  authorId;
```


