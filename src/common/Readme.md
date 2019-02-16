# Nomenclature

Grue works with trees, and the operations are named accordingly.

- **sprout**: Given a *query* and a *partial result*, return a new query for fetching remaining results. This follows symbolic links and
- **prune**: Given a *query* and a *result*, remove extraneous parts of the result that were not requested by the query.
- **graft**
- **plant**
