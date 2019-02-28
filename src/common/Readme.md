# Nomenclature

Grue works with trees, and the operations are named accordingly.

- **sprout**: Given a _query_ and a _partial result_, return a new query for fetching remaining results. This follows symbolic links and
- **prune**: Given a _query_ and a _result_, remove extraneous parts of the result that were not requested by the query.
- **graft**
- **plant**
