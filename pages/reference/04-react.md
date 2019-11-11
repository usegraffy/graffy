# graffy/react

## GraffyProvider

- Props: `store` (the Graffy store).

Adds a Graffy store to a React subtree. The useGraffy hook in that subtree will use this store.

## useGraffy(query, [options])

- Arguments: [query](20-Types#Queries), options
- Returns: [[result](20-Types#Graphs), status]

The `live` option is used to choose between .watch (if true) and .read (if false). Status may be `'loading'`, `'ready'`, or an error object.
