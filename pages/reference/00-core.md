# graffy/core

## new Graffy()

Constructs a store. Does not accept any arguments.

## store.**read**([path], query, [options])

- Arguments: [path](20-Types#Paths), [query](20-Types#Queries), options
- Returns: Promise:[ObjectGraph](20-Types#ObjectGraphs)

Retrieve data from the store.

`options` is an object that's passed unchanged to providers.

## store.**watch**([path], query, [options])

- Arguments: [path](20-Types#Paths), [query](20-Types#Queries), options
- Returns: AsyncIterable:[ObjectGraph](20-Types#ObjectGraphs)

Retrieve data from the store, and receive a stream of changes to that data.

`options` is an object that's passed unchanged to providers.

## store.**write**([path], change, [options])

- Arguments: [path](20-Types#Paths), [change](20-Types#Graphs), options
- Returns: Promise:Any

Writes changes into the store. The write provider may return any data in the promise - Graffy makes no assumption about what's in it.

`options` is an object that's passed unchanged to providers.

## store.**onRead**([path], provider)

- Arguments: [path](20-Types#Paths), provider

Called when fulfilling a `read()` that overlaps the path. Handler

### provider(query, options)

- Arguments: [query](20-Types#Queries), options
- Expected return value: Promise:[Graph](20-Types#Graphs)

## store.**onWatch**([path], provider)

- Arguments: [path](20-Types#Paths), provider

Called when fulfilling a `watch()` that overlaps the path.

### provider(query, options)

- Arguments: [query](20-Types#Queries), options
- Expected return value: AsyncIterable:[Graph](20-Types#Graphs)

If this provider provides _live query_ semantics, the first value yielded by the returned AsyncIterable must be the full query results. Subsequent values may be partial changes. On the other hand, if the provider provides only a change stream, it must signal this by yielding `undefined` first.

## store.**onWrite**([path], provider)

- Arguments: [path](20-Types#Paths), provider

Called when processing a `write()` that overlaps the path.

### provider(change, options)

- Arguments: [change](20-Types#Graphs), options
- Expected return value: Promise:Any

## store.**use**([path], module)

- Arguments: [path](20-Types#Paths), module

Mounts a module to the store at the given path.

### module(shiftedStore)

- Argument: shiftedStore

Providers receive a Graffy store (with all the APIs shifted to reflect the path) as argument. Typically, modules attach providers to the store.

----

## store.**call**(operation, payload, [options])

- Arguments: operation, payload, options
- Return value: Depends on operation

A low-level (plumbing) API that's used by `read()`, `watch()` and `write()`. Operation may be `'read'`, `'watch'` or `'write'`.

The payload and return value should be queries and graphs in Graffy's internal representation.

Options is an object that's passed to the providers.

## store.**on**(operation, [path], provider)

- Arguments: operation, path, provider
- Expected return value: Promise

A low-level (plumbing) API that's used by onRead, onWatch and onWrite. Operation may be `'read'`, `'watch'` or `'write'`.

### provider(payload, options, next)

- Arguments: payload, options, next

`payload` is a query or graph (depending on operation) in Graffy's internal representation. Options is the object passed to `.call()`.

### next(nextChange)

- Argument: nextChange
- Returns: Promise of all changes applied

A provider may call `next` to delegate fulfillment of all or part of the operation to downstream providers. It should incorporate the value returned by `next` into its own return value.
