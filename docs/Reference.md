# Graffy API Reference

## @graffy/core

### new Graffy()

Constructs a store. Does not accept any arguments.

### store.**get**(query, options)

Parameters: [query](Encoding#Queries), options
Returns: Async Iterable or Promise

Retrieve data from the store.

**Options**

- **once**: If false (default), makes a live query and returns an async iterable; if true, makes a one-time query and returns a promise.
- **raw**: If false (default), returns full data objects with symbolic links replaced by the linked data; if true, returns [changes](Encoding#Changes) with symlinks preserved and linked data included at their canonical positions.

### store.**put**(change, options)

Parameters: [change](Encoding#Changes)
Returns: Promise that resolves on success

**Unimplemented.** Writes changes into the store.

**Options**

- **source**: A string identifying the source of the change. This value is opaque to graffy, but providers may use it property to avoid echoing writes back to their source.

### store.**onGet**(path, callback)

### store.**onPut**(path, callback)

### store.**use**(path, provider)

Parameters: [path](Encoding#Paths), provider

Mounts a provider to the store at the given path.

### Graffy.encode(params)



### Graffy.decode(key)



### Graffy.link(path)

Parameters: [path](Encoding#Paths)
Returns: A link object

## @graffy/server

## @graffy/client

## @graffy/cache
