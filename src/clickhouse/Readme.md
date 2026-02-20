# ClickHouse Provider

Read-only Graffy provider for ClickHouse.

Current scope is intentionally minimal and focused on read patterns used by
tracker-like workloads:

- ID reads and `$key` reads
- Range args: `$all`, `$first`, `$last`, `$order`, `$after`, `$before`
- Filter operators: `$eq`, `$not`, `$lt`, `$lte`, `$gt`, `$gte`, `$re`, `$ire`,
  `$cts`, plus list shorthand (`prop: [a, b]`)
- Dot-path filters on JSON-encoded string columns (for example
  `sources.messageId`)
- Nested projection from JSON-encoded string columns
- Join filters via subqueries (for example `$key: { syncJob: { ... } }`)
- Aggregates: `$count`, `$sum`, `$avg`, `$max`, `$min`, `$card` with
  `$group: true` and `$group: [..]`

Writes are out of scope.
