## Key Encoding

Key encoding is used to encode map keys and set members into strings. Key encoding allows fixed-size data types such as tuples or structs to be used as JSON object keys, and ensures that the encoded strings sort in the same order as the original values.*

This allows Grue to reduce complex queries with filtering and cursor-based pagination to simple ranges of keys to retrieve.

## What values are allowed in keys?

Only a subset of the types supported by Grue are allowed to be used in Keys. This is motivated by the need for values to have an unambiguous sort order. The following types are not allowed:

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

Ranges of keys may be requested using the following patterns:

| Key      | Range Object                        | Meaning
|----------|-------------------------------------|-----------------------------
| `*`      | `{ all: true }`                     | All keys
| `n**`    | `{ first: n }`                      | The first n keys
| `**n`    | `{ last: n }`                       | The last n keys
| `k*`     | `{ after: k }`                      | All keys after k
| `*k`     | `{ before: k }`                     | All keys before k
| `j*k`    | `{ after: j, before: k }`           | All keys between j and k
| `k*n**`  | `{ first: n, after: k }`            | First n after k
| `**n*k`  | `{ last: n, before: k }`            | Last n before k
| `m*k*n`  | `{ first: n, last: m, around: k }`  | k, m before it and n after it
| `j*n**k` | `{ first: n, after: j, before: k }` | First n between j and k
| `j**n*k` | `{ last: n, after: j, before: k }`  | Last n between j and k
| multiple | `[ j, k, ... ]`               | Several keys

**Note:**
- The range object will be part of the path that's passed to resolver functions.
- Keys (j, k) are key-encoded strings
- It's possible that the "multiple keys" contain a mix of ranges and plain keys.
