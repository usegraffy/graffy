# Encodings

**TODO: Update this doc.**

## Paths

- [RFC6901 JSON Pointer](https://tools.ietf.org/html/rfc6901) with extensions.

## Queries

- JSON

## Changes

- [RFC7386 JSON Merge Patch](https://tools.ietf.org/html/rfc7386)

## Range Encoding

Sets of keys may be requested using several patterns:

```
String  Object                                Meaning
*       { $all: true }                        All keys
k*      { $after: k }                         All keys after k
*k      { $before: k }                        All keys before k
j*k     { $after: j, $before: k }             All keys between j and k
n**     { $first: n }                         The first n keys
**n     { $last: n }                          The last n keys
k*n**   { $first: n, $after: k }              First n after k
**n*k   { $last: n, $before: k }              Last n before k
m*k*n   { $first: n, $last: m, $around: k }   k, m before it and n after it
j*n**k  { $first: n, $after: j, $before: k }  First n between j and k
j**n*k  { $last: n, $after: j, $before: k }   Last n between j and k
(j,k)   [ j, k, ... ]                         Several keys
```


## Parameter Encoding

Parameter encoding is used to encode fixed-size data types such as tuples or structs into strings such that the encoded strings sort in the same order as the original values.

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
