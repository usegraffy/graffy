# Data structures

## Graphs

Graphs are modeled as trees with symbolic links. Interior nodes are _functions_ mapping string keys to children, while leaf nodes are either values or links to other nodes in the tree. Every node also has a clock (timestamp).

An interior node must return one of three values for every possible string: a child node, if one exists at that key; `null`, if it is known that there is no such key, and `undefined` if the existence of the key is not known. The last case occurs in graphs that represent cached data, query results, change sets etc.







Graffy has only one simple pagination concept: A query may specify a subset of the keys of a node to retrieve.

The keys of a node are always strings and sorted alphabetically. Queries may specify subsets using "ranges" composed of a start key, an end key and a signed integer count. A positive count N requests the first N non-null items between the start and end keys (inclusive), while a negative count -N requests the last N.







A segment is a valid Unicode string that does not contain the NUL character (\0).

Keys are composed of segments separated by NUL; in the normal case, a key just contains on segment, multi-segment keys are typically used in indexes.
