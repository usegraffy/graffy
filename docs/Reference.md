Grue API Reference
==================

## `store.get(path, query)`

Parameters: [path](Encoding#Paths), [query](Encoding#Queries)
Returns: Promise resolving to a JSON tree

Retrieve data from the store, replacing links with the linked data. If path is provided, only that subtree is returned.

## `store.getRaw(query)`

Parameter: [query](Encoding#Queries)
Returns: Promise resolving to a result tree

Retrieve data from a store, leaving linked nodes in their canonical positions.

## `store.put(path, change)`

Parameters: [path](Encoding#Paths), [change](Encoding#Changes)
Returns: Promise that resolves on success

**Unimplemented.** Writes changes into the store.

## `store.sub(path, query)`

Parameters: [path](Encoding#Paths), [query](Encoding#Queries)
Returns: Async iterable of result trees

Subscribes to data in the store, replacing links with the linked data and returning a full result object on every change. If path is provided, only that subtree is returned.

## `store.subRaw(query)`

Parameters: [path](Encoding#Paths), [query](Encoding#Queries)
Returns: Async iterable of [changes](Encoding#Changes)

**Unimplemented.** Subscribes to data in the store. First value is the result of the query, subsequent values are sparse objects representing changes. Linked nodes are left at their canonical positions.

## `store.pub(changes)`

Parameters: [change](Encoding#Changes)
Returns: Nothing

Publishes a change to the store; all subscribers interested in that change are notified.

## `store.use(path, provider)`

Parameters: [path](Encoding#Paths), provider

Mounts a provider to the store, at the given path.
