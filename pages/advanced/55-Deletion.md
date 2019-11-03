# Deletion tombstones

In Graphs, deletions are represented by setting a value to `null`. It's important that these `null`s are stored and versioned, so that caches can ignore late-arriving updates that happened before the value was deleted, while correctly applying a subsequent update that re-create the deleted value.

The versioned `null` value that's stored in the cache is called a tombstone. The problem is that these tombstones can never be deleted, and might result in bloat and poor performance, especially in applications with a lot of short-lived data.

The solution is for the deletion to not just set the single key to null, but to set the entire range of keys between the neighboring keys (that are still present) to null. For example, imagine a node `posts` with keys `a`, `b` and `c`. The deletion of `b` will not be represented merely by a `{ b: null }`, but by `{ <a..c>: null }`, where `<a..c>` represents the full range of keys between `a` and `c` (excluding them). This range includes b, so this change set will end up deleting `b` from all caches that receive it.

It's important that this change set is specified by only by services that have knowledge that there are no other values between `a` and `c`.

# Open Slices

The keys specified in the `after` and `before` parameters are included in the results from a slice. If this is undesirable (e.g. pagination), the `nextKey()` and `prevKey()` helpers can be used. The former appends `\0` to the key, while the latter decrements the key by one bit (a trailing 'b' becomes 'a', for instance) and appends '\xff'.

We take advantage of the limitation that `\0` and `\xff` are not valid characters in keys.
