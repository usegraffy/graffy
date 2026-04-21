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
- Writes: single-row id writes, single-row filter writes, `$put`, and patch

Write support is append-based. The adapter reads the current row, applies the
change in JavaScript, and inserts a replacement row with a newer `verCol`
value. Deletes are not supported. Tables should use
`ReplacingMergeTree(verCol)` with reads going through `FINAL`.

## E2E tests

ClickHouse e2e coverage lives in `src/clickhouse/test/e2e.test.js`.

- Start server: `npm run ch:up`
- Stop/clean server: `npm run ch:clean`
- Run ClickHouse tests (unit + e2e): `npm test -- src/clickhouse`
