## Cursor Encoding

Cursor encoding is used to encode fixed-size data types such as tuples or structs into strings such that the encoded strings sort in the same order as the original values.

This allows Grue to reduce complex queries with filtering and cursor-based pagination to simple ranges of keys to retrieve.

## What values are allowed in keys?

Only a subset of the types supported by Grue are allowed to be used in cursors. This is motivated by the need for values to have an unambiguous sort order. The following types are not allowed:

- Maps & Sets
- Numbers with a NaN value
- Strings containing the null character \0

## How are values represented?
- Strings are represented as-is. Empty strings are valid keys, and they sort before all non-empty keys.
- Numbers are represented by base64 strings. -Infinity and +Infinity can be encoded and sort as expected.
- Booleans are encoded as a single `0` or `1` character.
- Tuples are represented by their parts in order, separated by the null character \0.
- Structs are flattened into tuples by considering keys in lexical order.
