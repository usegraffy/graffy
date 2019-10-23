# Graffy API Reference

## @graffy/core

### new Graffy()

Constructs a store. Does not accept any arguments.

### store.**get**(query, options)

- Arguments: [query](Encoding#Queries), _options_
- Returns: Promise:Graph

Retrieve data from the store.

### store.**sub**(query, options)

- Arguments: [query](Encoding#Queries), _options_
- Returns: AsyncIterable:Graph

#### options

- **raw**: If false (default), returns full data objects; if true, returns [changes](Encoding#Changes).

### store.**put**(change, options)

- Arguments: [change](Encoding#Changes), _options_
- Returns: Promise of all changes applied

Writes changes into the store.

### store.**onGet**(path, handler)

- Arguments: _[path](Encoding#Paths)_, handler

#### handler(query, options, next)

- Arguments: [query](Encoding#Queries), options, next
- Expected return value: Promise:Graph

Called when fulfilling a `get()` that overlaps the path.

#### next(nextQuery)

- Argument: nextQuery
- Returns: Promise:Graph

The handler may call `next` to delegate fulfillment of all or part of its query to downstream handlers. It should then incorporate the tree returned by `next` into its own return value.

### store.**onSub**(path, handler)

- Arguments: _[path](Encoding#Paths)_, handler

#### handler(query, options, next)

- Arguments: [query](Encoding#Queries), options, next
- Expected return value: AsyncIterable:Graph

Called when fulfilling a `sub()` that overlaps the path.

If this handler provides _live query_ semantics, the first value yielded by the returned AsyncIterable must be the full query results. Subsequent values may be partial changes. On the other hand, if the handler provides only a change stream, it must signal this by yielding `undefined` first.

#### next(nextQuery)

- Argument: nextQuery
- Returns: Promise:Graph

The handler may call `next` to delegate fulfillment of all or part of its query to downstream handlers. It should then incorporate the stream returned by `next` into its own return value.

### store.**onPut**(path, handler)

- Arguments: _[path](Encoding#Paths)_, handler

#### handler(change, options, next)

- Arguments: [change](Encoding#Changes), options, next
- Expected return value: Promise

Called when processing a `put()` that overlaps the path.

#### options

- **source**: A string identifying the source of the change.
- **version**: A numeric timestamp for the change.

#### next(nextChange)

- Argument: nextChange
- Returns: Promise of all changes applied

The handler may call `next` to delegate the application of all or part of its changes, or additional changes that it constructed, to other handlers. It should then incorporate the changes returned by `next` into its own return value.

### store.**use**(path, provider)

- Arguments: _[path](Encoding#Paths)_, provider

Mounts a provider to the store at the given path.

#### provider(shiftedStore)

- Argument: shiftedStore

Providers receive a Graffy store (shifted to the path) as argument. They typically attach handlers to the store.

## @graffy/common

This package provides a set of utilities to help work with graph and query data structures.

### Builders

- **graph(object)**: Constructs a graph.
- **query(object)**: Constructs a query.
- **page(object)**: Constructs a page in a graph.
- **link(object)**: Constructs a link in a graph.
- **key(object)**: Encodes non-string values into a string key.

### decorate(graph)

Converts a graph data structure into easier-to-use JS objects and arrays.

### Utilities

- **makePath(path)**: Converts JSONPointer strings into key arrays
- **wrap(value, path)**: Wraps a graph or query in a path. For example, `wrap(42, ['foo', 'bar'])` gives `graph({ foo: { bar: 42 } })`.
- **unwrap(value, path)**: Unwraps a path using a graph or query. Returns undefined if path is unknown and null if it does not exist.
- **isRange(node)**: Check if graph or query node is a range.
- **isBranch(node)**: Check if graph or query node is a branch.
- **isLink(node)**: Check if graph or query node is a link.
- **isOlder(node, version)**: Check if graph or query node is older than the version.
- **isNewer(node, version)**: Check if graph or query node is newer than the version.

### makeStream(initializer)

Constructs an async iterable. This utility is more convenient than async generator functions for consuming from a callback-based event emitter.

- Arguments: initializer
- Returns: AsyncIterable

#### initializer(push, end)

Called synchronously, the initializer should subscribe to the event emitter and return a function that, when called, unsubscribes from it.

- Arguments: push, end
- Returns: unsubscribe

#### push(value)

Yield this value from the async iterator. This function is typically called from the event emitter subscription handler.

- Argument: value
- Return: drainPromise

#### end(error)

Signal to the consumer of the async iterator that the event emitter has closed. The error argument is optional. This is typically called from the event emitter's close and error handlers.

#### unsubscribe(error)

The unsubscribe function returned by the initializer is called when the consumer of the async iterator stops consuming it. If it stopped consuming due to an error, the error argument will be passed.

#### drainPromise

**Advanced**: Async iterators are a pull-based streaming mechanism, whereas event emitters are push-based. If the event emitter is pushing values faster than the consumer is pulling, the internal value buffer used by makeStream might grow too big.

Some event emitters (e.g. Node.js streams) provide a "backpressure" mechanism to pause and resume the push of events. The drainPromise mechanism allows interfacing with this.

The push function returns a drainPromise when the buffer exceeds a predefined high water mark. (Note that this does not mean the push failed - it continues to accept pushes until the system runs out of memory.) The drainPromise resolves when the buffer falls below a predefined low water mark as it is 'drained' (emptied) by the consumer.

Typically, a backpressure-capable subscription should be paused when push returns a drainPromise, and resumed when that promise resolves.

## @graffy/server

## @graffy/client

## @graffy/fill
