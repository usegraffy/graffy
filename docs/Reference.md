# Graffy API Reference

## @graffy/core

### new Graffy()

Constructs a store. Does not accept any arguments.

### store.**get**(path, query, options)

- Arguments: *[path](Encoding#Paths)*, [query](Encoding#Queries), *options*
- Returns: Async Iterable or Promise, depending on options

Retrieve data from the store.

#### options

- **once**: If false (default), makes a live query and returns an async iterable; if true, makes a one-time query and returns a promise.
- **raw**: If false (default), returns full data objects with symbolic links replaced by the linked data; if true, returns [changes](Encoding#Changes) with symlinks preserved and linked data included at their canonical positions.

### store.**put**(path, change, options)

- Arguments: *[path](Encoding#Paths)*, [change](Encoding#Changes), *options*
- Returns: Promise of all changes applied

Writes changes into the store.

#### options

- **source**: A string identifying the source of the change. This value is opaque to Graffy, but providers may use it to avoid echoing writes back to their source.
- **clock**: A numeric timestamp for the change. Graffy uses this value to achieve eventual consistency in environments where changes are received out-of-order.

### store.**onGet**(path, handler)

- Arguments: *[path](Encoding#Paths)*, handler

#### handler

- Arguments: [query](Encoding#Queries), options, next
- Expected return value: Promise or undefined, depending on options

Called when fulfilling a `get()` that overlaps the path.

#### options

- **fetch**, If true, the handler should return a result tree fulfilling the query; If false, no return value is required.
- **watch**, If provided, the handler should ensure that subsequent changes to data matching the query are `put()` into the store until the `watch.onEnd` event fires or `watch.ended` turns true.

#### next

- Argument: nextQuery
- Returns: Promise or undefined, depending on options

The handler may call `next` to delegate fulfillment of all or part of its query to downstream handlers. It should then incorporate the tree returned by `next` into its own return value.

### store.**onPut**(path, handler)

- Arguments: *[path](Encoding#Paths)*, handler

#### handler

- Arguments: [change](Encoding#Changes), options, next
- Expected return value: Promise

Called when processing a `put()` that overlaps the path.

#### options

- **source**: A string identifying the source of the change.
- **clock**: A numeric timestamp for the change.

#### next

- Argument: nextChange
- Returns: Promise of all changes applied

The handler may call `next` to delegate the application of all or part of its changes, or additional changes that it constructed, to other handlers. It should then incorporate the changes returned by `next` into its own return value.

### store.**use**(path, provider)

Arguments: *[path](Encoding#Paths)*, provider

Mounts a provider to the store at the given path.

### Graffy.encode(params)



### Graffy.decode(key)



### Graffy.link(path)

- Arguments: *[path](Encoding#Paths)*, *object*
- Returns: A link object

## @graffy/server

## @graffy/client

## @graffy/cache
