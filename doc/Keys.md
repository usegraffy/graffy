## Key Encoding

Key encoding is used to encode map keys and set members into strings. Key encoding allows fixed-size data types such as tuples or structs to be used as JSON object keys, and ensures that the encoded strings sort in the same order as the original values.*

This allows Gru to reduce complex queries with filtering and cursor-based pagination to simple ranges of keys to retrieve.

## What values are allowed in keys?

Only a subset of the types supported by Gru are allowed to be used in Keys. This is motivated by the need for values to have an unambiguous sort order. The following types are not allowed:

- Nulls
- Links
- Maps & Sets
- Numbers with a NaN value
- Strings containing the null character \0

## How are values represented?
- Strings are represented as-is. Empty strings are valid keys, and they sort before all non-empty keys.
- Numbers are represented by base64 strings. -Infinity and +Infinity can be encoded and sort as expected.
- Booleans are encoded as a single `0` or `1` character.
- Tuples are represented by their parts in order, separated by the null character \0.
- Structs are flattened into tuples by considering keys in lexical order.

## How does pagination work?

If a map is defined with `Cursor` as its key type in the data model and responses, in queries it will expect the key type `Range(Cursor)` type. This is defined as:

```js
const Range = (Cursor) => {
  first: Number,
  after: Cursor,
  last: Number,
  before: Cursor
}
```
