# Nomenclature

Grue works with trees, and the tree operations are named accordingly.

- **sprout**: Given a _query_ and a _result tree_ that partially satisfies it, return a new, smaller query for fetching remaining parts of the result.
- **prune**: Given a _query_ and a _result tree_, returns a new result tree with extraneous branches (those that were not requested by the query) removed.
- **graft**: Given a _result tree_, returns a _result graph_ with symlinks replaced with JS references. The value returned is in general not JSON-serializable.
- **strike**: Given a _query_ and a _result tree_, returns a new query where parts of the query that cross symlinks are moved to their canonical locations.
