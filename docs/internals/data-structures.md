---
title: Data structures
---

# Data structures

Graffy has two main **tree** structures - Graphs and Queries. These are quite similar to a file system trees.

Nodes are either *leaf* nodes (analogous to files) or *branch* nodes containing arrays of child nodes that may be leaves or other branches (analogous to directories). Each node has a unique string *key* (analogous to the file or directory name), and children are always sorted by key. As you would expect, each tree has exactly one root node.

Graph nodes have an additional attribute, *version*, which serves the same purpose as a file's last modified time. In addition, leaf nodes in graphs may be *links* to another part of the filesystem — these are just like [symbolic links](https://en.wikipedia.org/wiki/Symbolic_link) in filesystems.

Queries represent data requirements in a tree structure that matches the expected data. Leaf nodes in queries therefore don't have a *value* attribute. Instead, query leaf nodes contain an integer *sum* attribute, which is a count of the number of clients requesting that data. This is loosely analogous to a count of open file handles.

## Range Nodes

Graffy does have one other type of node that has no analogy in a filesystem (that I know of): range nodes.

In Graphs, there may be a special leaf node, called a **null range node**, that expresses the *absence* of children with a given range of names (in alphabetic order). This uses the properties *key* and *end* to demarcate the range.

For example, a null range node `{ key: "alice", end: "charlie" }` encodes the fact that keys like "bob", "barbara", "alice" and "charlie" do not exist. It conveys nothing about whether "david" exists.

This data structure typically represents a partial view of some larger graph; it is therefore necessary to distinguish between parts of the graph that are unknown, and parts that are known to not exist. Null ranges let us do that.

**Query range** nodes are used to request data with keys that fall within a range. The range is expressed using *key* and *end* attributes, just as with null ranges in graphs. Query range nodes can be either leaf or branch nodes, and they additionally have a *limit* attribute to express a maximum number of matching nodes to return.

For example, `{ key: "alice", end: "charlie", limit: 3 }` represents a request for up to 3 non-null nodes, starting with and including "alice", and stopping at "charlie" even if we haven't reached 3 yet.

## Paths

A path may be represented by an array of string path segments or by a string with the segments separated by dots.

## Definitions

These type definitions use Typescript syntax.

```typescript
class GraphNode {
  key: string,
  end: string?, // Must be after the key
  version: string | number,

  children: [GraphNode]?,
  value: any?,
  path: [string]?, // Represents a link.
  // One of the properties children, value or path must exist
}
```

```typescript
class QueryNode {
  key: string,
  end: string?, // May be before or after key.
  limit: number?, // Only valid if end is non-null
  version: string | number,

  children: [QueryNode]?,
  sum: number?, // Number of clients requesting this
  // Either children or sum should exist
}
```

```typescript
interface MetaObject {
  [name: string]: MetaObject | string | number | boolean
}
```

## Attributes

- `key`
- `end`; ranges extend from key to end. In graphs and in queries without the limit property, key is always less than end; in limited queries (where the limit property is set), end may be less than key (for requesting the last N children) or greater than key (for first N).
- `children`
- `value`, any value that is treated as a scalar. Compared with `===` in JavaScript.
- `path`, an array of string path segments (keys)
- `limit`, an integer in query ranges to limit the result size
- `sum`, in queries, the number of readers on a leaf node
- `version`, on graphs, a monotonically increasing number or string

## Notes

- Empty branch nodes should not exist and must be cleaned up automatically. Branch nodes exist only to hold children.
- The values of graph leaf nodes are usually scalars (strings, numbers etc.) but may also be any JSON object that Graffy should treat as an atomic value.
