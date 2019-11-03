# @graffy/common

This package provides a set of utilities to help work with graph and query data structures.

## Builders

- **graph(object)**: Constructs a graph.
- **query(object)**: Constructs a query.
- **page(object)**: Constructs a page in a graph.
- **link(object)**: Constructs a link in a graph.
- **key(object)**: Encodes non-string values into a string key.

## decorate(graph)

Converts a graph data structure into easier-to-use JS objects and arrays.

## Utilities

- **makePath(path)**: Converts JSONPointer strings into key arrays
- **wrap(value, path)**: Wraps a graph or query in a path. For example, `wrap(42, ['foo', 'bar'])` gives `graph({ foo: { bar: 42 } })`.
- **unwrap(value, path)**: Unwraps a path using a graph or query. Returns undefined if path is unknown and null if it does not exist.
- **isRange(node)**: Check if graph or query node is a range.
- **isBranch(node)**: Check if graph or query node is a branch.
- **isLink(node)**: Check if graph or query node is a link.
- **isOlder(node, version)**: Check if graph or query node is older than the version.
- **isNewer(node, version)**: Check if graph or query node is newer than the version.
