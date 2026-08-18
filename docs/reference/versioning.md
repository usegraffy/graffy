---
title: Versioning
---

# Versioning

The *version clock* in Graffy is a global, monotonically increasing number or string used to provide a consistent global ordering for changes. Version is used to achieve consistency, fetch data incrementally and ensure atomic writes. For most purposes, timestamps make good version clocks; in distributed systems the timestamp should be suffixed by a unique server ID (as in version 1 UUIDs).

The `$ver` attribute on queries, result graphs and writes all refer to this global version clock, but with different semantics.

In **queries**, `$ver` specifies that only data that has changed after that version number are required. Servers may use this hint to reduce the amount of data returned, but they don't have to. This is used to perform incremental reads. If no version is specified, it is interpreted as a request for all matching data.

```javascript
{
  $ver: 23,
  user: { 123: { name: true } }
}
```

The query will return the name of user 123 only if it has changed since version 23.

In **result graphs** (those returned by a read operation), `$ver` specifies the value of the global clock at the time this value was fetched from its authoritative data source. This helps readers achieve a consistent view even if results are received out of order.

The result version is used to ensure that newer versions of a node are never overwritten by older ones. This makes the Graffy graph structure a CRDT, and a distributed system using Graffy eventually consistent.

In **write graphs**, `$ver` specifies the latest version of this node that the writer has knowledge of. The server must abort the write if the data has changed since this version.

It is quite common for an application to read an object first, and then write some changes to it. If another instance of the application had updated this object in between, some data might be lost. This mechanism prevents this.
