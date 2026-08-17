# ClickHouse Provider

Graffy provider for ClickHouse.

Current scope is intentionally minimal and focused on tracker-like workloads:

- ID reads and `$key` reads
- Range args: `$all`, `$first`, `$last`, `$order`, `$after`, `$before`
- Filter operators: `$eq`, `$not`, `$lt`, `$lte`, `$gt`, `$gte`, `$re`, `$ire`,
  `$text`, `$cts`, plus list shorthand (`prop: [a, b]`)
- `$text` performs case-insensitive substring search and is designed for a
  matching `lowerUTF8(column)` `ngrambf_v1` index. For native `Array(...)`
  columns, `$cts` checks that every supplied value is present.
- Dot-path filters on JSON-encoded string columns and native `Map(...)`
  columns (for example `sources.messageId` or `recordIds.gmailMessageId`)
- Projection pushdown for ID and `$key` reads. Graffy selects only requested
  columns plus the ID, version, and ordering values needed for read metadata
  and pagination. Nested projections on JSON-encoded strings use
  `JSONExtractRaw`; native `JSON` projections read direct subcolumns. Both are
  rebuilt into the requested nested shape before decoding.
- Join filters via subqueries (for example `$key: { syncJob: { ... } }`)
- Aggregates: `$count`, `$sum`, `$avg`, `$max`, `$min`, `$card` with
  `$group: true` and `$group: [..]`
- Writes: single-row id writes with `$put`

The default table model is append-only `MergeTree`. Reads do not add `FINAL`
unless you explicitly opt into `final: true` for a legacy
`ReplacingMergeTree` table.

Write support is append-only. `$put` is mandatory, writes must target a scalar
id path, and the adapter always does a blind insert. Filter writes, patch-style
updates, and deletes are not supported.

The default `idCol` is `id`, and the default `verCol` is `time`.

`idCol` and `verCol` must be Graffy-compatible: when loaded through the
ClickHouse client they should be strings or numbers. `verCol` should also be
backed by a table `DEFAULT` expression. If a write provides a value for
`verCol`, it is inserted as-is. If not, the column is omitted from the insert
and ClickHouse supplies the default value.

## E2E tests

ClickHouse e2e coverage lives in `src/clickhouse/test/e2e.test.js`.

- Start server: `npm run ch:up`
- Stop/clean server: `npm run ch:clean`
- Run ClickHouse tests (unit + e2e): `npm test -- src/clickhouse`
