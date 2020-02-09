# graffy/react

## GraffyProvider

- Props: `store` (the Graffy store).

Adds a Graffy store to a React subtree. The useQuery hook in that subtree will use this store.

## useQuery(query, [options])

- Arguments: [query](20-Types#Queries), options
- Returns: [[result](20-Types#Graphs), loading, error]

The `once` option is used to choose between `.watch()` (if false) and `.read()` (if true). `loading` is a boolean, and `error` an error object.

## useStore()

- Returns: `store` (the Graffy store)

Retrieve the store passed by the nearest GraffyProvider.
