# @graffy/pg Agent Guide (Repo-Verified)

This guide is for contributors working in `src/pg`.
It is intentionally constrained to behavior that is verified by the current implementation and tests.

## Scope

- Package: `@graffy/pg`
- Main files:
  - `src/pg/index.js` provider wiring
  - `src/pg/Db.js` DB I/O and schema checks
  - `src/pg/filter/*` filter AST and SQL translation
  - `src/pg/sql/*` SQL builders
  - `src/pg/test/*` behavioral source of truth

## Quick Start

```js
import Graffy from '@graffy/core';
import Fill from '@graffy/fill';
import Cache from '@graffy/cache';
import { pg } from '@graffy/pg';
import { Pool } from 'pg';

const store = new Graffy();
store.use(Fill());
store.use(Cache()); // Optional

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

store.use(
  'users',
  pg({
    table: 'users',
    idCol: 'id',
    verCol: 'version',
    connection: pool,
  }),
);
```

Notes:

- In this repository, package internals/tests usually import via `import { pg } from '../index.js'`.
- If `connection` is omitted, `@graffy/pg` creates a `pg.Pool` from default environment/config.

## Table Options

Supported options for `pg({...})`:

- `table`: SQL table name. Defaults to mounted path segment.
- `idCol`: ID column. Default: `'id'`.
- `verCol`: Version column. Default: `'updatedAt'`.
- `joins`: object map for join filters.
- `connection`: `pg.Pool`, `pg.Client`, or `Pool` constructor config.

Join option fields:

- `table`: joined table name.
- `idCol`: joined table ID column.
- `refCol`: FK in joined table referencing parent table ID.
- `verCol`: joined table version column.

Important:

- For normal tables (non-views), `verCol` must have a SQL default expression.
- `idCol` should be primary key or unique.

## Read Patterns

Read by ID:

```js
const row = await store.read(['users', userId], {
  id: true,
  name: true,
  email: true,
});
```

Read a filtered page:

```js
const rows = await store.read(['users'], {
  $key: {
    $first: 10,
    $order: ['name', 'id'],
    name: { $ire: '^al' },
  },
  id: true,
  name: true,
});
```

Cursor page after a previous cursor:

```js
const nextRows = await store.read(['users'], {
  $key: {
    $first: 10,
    $order: ['name', 'id'],
    $after: ['alan', '1b2f...'],
  },
  id: true,
  name: true,
});
```

## Filter Operators

Supported operators in current implementation:

- Comparison: `$eq`, `$not`, `$lt`, `$lte`, `$gt`, `$gte`
- Text: `$re`, `$ire`, `$text`
- Logic: `$and`, `$or`
- Collection/object: `$any`, `$all`, `$has`, `$cts`, `$ctd`, `$keycts`, `$keyctd`

Notes:

- Dot paths on JSONB columns are supported (example: `'settings.theme'`).
- Joins are supported by using join names inside filter objects.

## Joins

Configure joins:

```js
store.use(
  'users',
  pg({
    table: 'users',
    idCol: 'id',
    verCol: 'version',
    joins: {
      posts: {
        table: 'posts',
        refCol: 'authorId',
        verCol: 'version',
      },
    },
    connection: pool,
  }),
);
```

Filter parent rows using joined table predicates:

```js
const authors = await store.read('users', {
  $key: {
    posts: { title: { $ire: '^extra' } },
    $all: true,
  },
  id: true,
  email: true,
});
```

## Aggregations

Aggregate all matching rows:

```js
const stats = await store.read('users', {
  $key: { $group: true },
  $count: true,
  $card: { name: true },
});
```

Grouped aggregates:

```js
const grouped = await store.read('users', {
  $key: {
    $group: ['name'],
    $all: true,
  },
  $count: true,
  $sum: { version: true },
});
```

Supported aggregate projections:

- `$count`
- `$sum`, `$avg`, `$max`, `$min`
- `$card`

## Write Patterns

Patch by ID:

```js
await store.write(['users', userId], {
  name: 'Alice',
  settings: { theme: 'dark' },
});
```

Patch by filter key:

```js
await store.write(['users'], {
  $key: { email: 'alice@acme.co' },
  name: 'Alicia',
});
```

Upsert/replace semantics:

```js
await store.write(['users', userId], {
  $put: true,
  name: 'Alice',
  email: 'alice@acme.co',
});
```

Delete by ID:

```js
await store.write(['users', userId], null);
```

## Transactions and Per-Request Clients

Use `pgClient` in the third argument (options) for transaction-scoped operations:

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');

  await store.write(
    ['users', userId],
    { name: 'In Transaction' },
    { pgClient: client },
  );

  const row = await store.read(
    ['users', userId],
    { name: true },
    { pgClient: client },
  );

  await client.query('COMMIT');
  console.log(row);
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Verified Constraints and Footguns

- `$order` with `$group` is currently unsupported and throws.
- `\$after`, `\$before`, `\$since`, `\$until` must be arrays.
- If using `$order` or grouped `$group` (`$group: [...]`), include a range arg (`$first`, `$last`, `$after`, `$before`, `$since`, `$until`, or `$all`).
- `$put` must be exactly `true` when present.
- Do not use Mongo-style mutators like `$inc`; they are not implemented here.
- Do not document/use per-query cache keys like `$cache` or `$invalidate` for `@graffy/pg`.

## Testing

Run all pg package tests:

```bash
npm test -- src/pg
```

Run only e2e tests:

```bash
npm test -- src/pg/test/e2e.test.js
```

Docker behavior for e2e tests:

- Tests start a container named `graffypg` (mapped to host port `15432`).
- Teardown removes the container automatically.
- If a run is interrupted, cleanup manually:

```bash
docker rm -f graffypg || true
```

## Rule for Future AGENTS Updates

Only include examples that are validated by one of:

- current code in `src/pg/*`, and
- current tests in `src/pg/test/*`.

Avoid speculative APIs, framework-agnostic boilerplate, or patterns not exercised in this repo.
