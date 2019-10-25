# @graffy/core

## new Graffy()

Constructs a store. Does not accept any arguments.

## store.**get**(query, options)

- Arguments: [query](Encoding#Queries), _options_
- Returns: Promise:Graph

Retrieve data from the store.

## store.**sub**(query, options)

- Arguments: [query](Encoding#Queries), _options_
- Returns: AsyncIterable:Graph

### options

- **raw**: If false (default), returns full data objects; if true, returns [changes](Encoding#Changes).

## store.**put**(change, options)

- Arguments: [change](Encoding#Changes), _options_
- Returns: Promise of all changes applied

Writes changes into the store.

## store.**onGet**(path, handler)

- Arguments: _[path](Encoding#Paths)_, handler

### handler(query, options, next)

- Arguments: [query](Encoding#Queries), options, next
- Expected return value: Promise:Graph

Called when fulfilling a `get()` that overlaps the path.

### next(nextQuery)

- Argument: nextQuery
- Returns: Promise:Graph

The handler may call `next` to delegate fulfillment of all or part of its query to downstream handlers. It should then incorporate the tree returned by `next` into its own return value.

## store.**onSub**(path, handler)

- Arguments: _[path](Encoding#Paths)_, handler

### handler(query, options, next)

- Arguments: [query](Encoding#Queries), options, next
- Expected return value: AsyncIterable:Graph

Called when fulfilling a `sub()` that overlaps the path.

If this handler provides _live query_ semantics, the first value yielded by the returned AsyncIterable must be the full query results. Subsequent values may be partial changes. On the other hand, if the handler provides only a change stream, it must signal this by yielding `undefined` first.

### next(nextQuery)

- Argument: nextQuery
- Returns: Promise:Graph

The handler may call `next` to delegate fulfillment of all or part of its query to downstream handlers. It should then incorporate the stream returned by `next` into its own return value.

## store.**onPut**(path, handler)

- Arguments: _[path](Encoding#Paths)_, handler

### handler(change, options, next)

- Arguments: [change](Encoding#Changes), options, next
- Expected return value: Promise

Called when processing a `put()` that overlaps the path.

### options

- **source**: A string identifying the source of the change.
- **version**: A numeric timestamp for the change.

### next(nextChange)

- Argument: nextChange
- Returns: Promise of all changes applied

The handler may call `next` to delegate the application of all or part of its changes, or additional changes that it constructed, to other handlers. It should then incorporate the changes returned by `next` into its own return value.

## store.**use**(path, provider)

- Arguments: _[path](Encoding#Paths)_, provider

Mounts a provider to the store at the given path.

### provider(shiftedStore)

- Argument: shiftedStore

Providers receive a Graffy store (shifted to the path) as argument. They typically attach handlers to the store.
