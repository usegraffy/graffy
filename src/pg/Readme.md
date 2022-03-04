# Postgres

The standard Postgres module for Graffy. Each instance this module mounts a Postgres table as a Graffy subtree.

Requires the [pg](https://github.com/brianc/node-postgres) library to be installed as a peer dependency.

## Usage

```js
import pg from '@graffy/pg';
import Graffy from '@graffy/core';
import link from '@graffy/link';

const store = new Graffy();
store.use(path, pg(options));
```

### Options

- `table`, the name of the table. If not provided, the last segment of the `path` is used. This table must exist.
- `idCol`: the name of the column to use as ID. Defaults to `id`. This column must exist and be the primary key or have a unique constraint.
- `verCol`: the name of the column to store the Graffy version number. This column must exist, and must have a `DEFAULT` SQL expression defined - this expression is evaluated to calculate the version number. Graffy versions must monotonically increase, so this expression is typically based on `CURRENT_TIMESTAMP`.
- `connection`: a [pg](https://github.com/brianc/node-postgres) Client or Pool object (recommended), or the arguments for constructing a new Pool object. Optional.

### Database connection

Graffy Postgres can be configured to use a specific pg.Client object on a per-request basis, by including a `pgClient` property on the read or write options. This is useful for implementing transactions, partitioning, row-level security, etc.

If no `pgClient` is provided for a particular operation, Graffy Postgres falls back to the "global" pg.Client or pg.Pool object defined in the `connection` parameter in the initialization options. If no `connection` parameter was passed, a new pg.Pool will be created using PSQL environment variables.

## Data model

Graffy Postgres interprets each property as the name of a column, except for `$count`, `$sum` etc. as described in the aggregation section below.

It also interprets the `$key` as specifying filtering, sorting, pagination and aggregation parameters.

### Filters

Query filters are JSON-based, somewhat like MongoDB.

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

The root of the Graffy filter object must be an object. (Use `$or` if required.) The property `$order` specifies the order. Its value must be an array of order specifiers, each of which may be a string property name or an object with property names, sort direction, collation and text search relevance. (TBD)

### Full Text Search

A full-text search query typically has three requirements:

- Filter: `{ tsv: { $text: 'query' } }`. Return only results that match.
- Order: `{ $order: [{ $text: ['tsv', 'query'] }], ... }`. Sort results by relevance.
- Projection: `{ tsv: { query: true } }`. Return snippets of the document surrounding matches.

In all three, `tsv` is a computed column of type TSVector.

### Aggregations

In Graffy PG, aggregations are specified using the `$group` argument in $key, and special properties like `$count`, `$sum` etc. in the projection. `$group` may be `true` or an array.

Consider a table of books with columns `authorId` and `copiesSold`. We want the to compute aggregates on the `copiesSold` column.

#### Without Group By

Let's say we want the total copies sold of all the books in our database. We use `$group: true`, like:

```js
{
  books: {
  $key: { $group: true },
  $sum: { copiesSold: true }
}
```

Note how the field to sum is specified; this way, multiple fields may be specified.

As always, the result will mirror the query:

```js
books: [{
  $key: { $group: true },
  $sum: { copiesSold: 12345 }
}]
```

#### With Group By

Now let's say we want the separate totals for each author. As we might have a very large number of authors, we might need to paginate over the results.

The grouping properties (e.g. `authorId`) may also be included in the projection, and these values may even be used to construct links.

```js
{
  books: {
  $key: { $group: ['authorId'], $first: 30 },
  authorId: true,
  author: { namme: true }, // Link to ['users', authorId]
  $sum: { copiesSold: true }
}
```

#### Aggregate functions

Graffy supports the following aggregate functions.

- `$count` of rows; this is just specified as `$count: true`, without any fields under it. (All other aggregate functions require fields to be specified.)
- `$sum`, `$avg`, `$max`, `$min`
- `$card` (cardinality), or the number of unique values in a column
