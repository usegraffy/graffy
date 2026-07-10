---
title: Internals
---

# Internals

The structures used by the public API of Graffy are called *porcelain* data structures, and they are converted to an internal representation for processing.

These pages describe the internal *plumbing* data structures of Graffy and the core operations that make it work. While these data structures are not exposed to typical applications, understanding them is essential to port Graffy to other languages and to write high-performance modules.

The core of Graffy is fairly compact. There are:

- Two tree data structures: graphs (data) and queries (data requirements)
- Seven tree operations on these data structures
- Methods to encode various concepts into string keys

- [Data structures](data-structures)
- [Tree operations](tree-operations)
- [Key encoding](key-encoding)
- [Graffy Core](graffy-core)
