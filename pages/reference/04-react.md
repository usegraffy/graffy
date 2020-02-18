# graffy/react

## GraffyProvider

- Props: `store` (the Graffy store).

Adds a Graffy store to a React subtree. The useQuery hook in that subtree will use this store.

## useQuery(query, [options])

- Arguments: [query](20-Types#Queries), options
- Returns: [[result](20-Types#Graphs), loading, error]

The `once` option is used to choose between `.watch()` (if false) and `.read()` (if true). Other options are passed to graffy.read() or graffy.write() unchanged.

`loading` is a boolean, and `error` an error object.

## useStore()

- Returns: `store` (the Graffy store)

Retrieve the store passed by the nearest GraffyProvider.

## Query

- Props: `query`, `options`, render prop child

The render prop equivalent of useQuery. The child function is called with an object with three properties, `result`, `loading` and `error`. They have the same meanings as in `useQuery`.
