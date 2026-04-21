# ClickHouse Provider

Graffy provider for ClickHouse.

Current scope is intentionally minimal and focused on tracker-like workloads:

- ID reads and `$key` reads
- Range args: `$all`, `$first`, `$last`, `$order`, `$after`, `$before`
- Filter operators: `$eq`, `$not`, `$lt`, `$lte`, `$gt`, `$gte`, `$re`, `$ire`,
  `$cts`, plus list shorthand (`prop: [a, b]`)
- Dot-path filters on JSON-encoded string columns and native `Map(...)`
  columns (for example `sources.messageId` or `recordIds.gmailMessageId`)
- Nested projection from JSON-encoded string columns
- Join filters via subqueries (for example `$key: { syncJob: { ... } }`)
- Aggregates: `$count`, `$sum`, `$avg`, `$max`, `$min`, `$card` with
  `$group: true` and `$group: [..]`
- Writes: single-row id writes and single-row filter writes with `$put`

The default table model is append-only `MergeTree`. Reads do not add `FINAL`
unless you explicitly opt into `final: true` for a legacy
`ReplacingMergeTree` table.

Write support is append-only. `$put` is mandatory, and each write must create a
new row. If a write matches an existing row, the adapter throws
`clickhouse_write.update_unsupported`. Patch-style updates and deletes are not
supported.

## E2E tests

ClickHouse e2e coverage lives in `src/clickhouse/test/e2e.test.js`.

- Start server: `npm run ch:up`
- Stop/clean server: `npm run ch:clean`
- Run ClickHouse tests (unit + e2e): `npm test -- src/clickhouse`
