
# Future enhancements

## Index Watcher middleware

Consider a tree `posts/:id` and an index `posts$/:params/:key`. Some changes to posts might alter its position in the index, which will require a push to all the watch streams on `posts$`.

The index watcher middleware will make this easy. It should accept custom index functions.

## Write Watcher middleware

## Fill Watcher middleware
