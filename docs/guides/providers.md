---
title: Providers
---

# Providers

These are used to process and respond to read and write requests. The typical API that users expect from Graffy providers is:

```javascript
store.use(provider(providerOptions));
```

A custom provider can be written like:

```javascript
export default const customProvider = (providerOptions) => (store) => {
  // The user calls customProvider with the options, while Graffy calls
  // the inner function with a reference to the store.

  store.onRead(readHandler);
  store.onWrite(writeHandler);
}
```

> Custom providers **MUST NOT** import your application's store directly, and should instead use the store that is passed to it. This lets Graffy keep track of which provider added which handler.

Within the custom provider, you may use the [store APIs](../reference/store-api).

## Examples

### Database provider

Consider the typical Graffy schema below. We'll write a custom provider that can be used to read and write data into the "posts" *collection*.

The provider is intended to be used like:

```javascript
store.use('posts', dbProvider());
```

```
(root)
└── posts
    └── (id or query keys)
        ├── title
        ├── body
        ├── author
        └── date
```

A single Graffy read or write may specify multiple queries or change multiple objects. Providers **MUST** handle this, typically by looping over the query.

As the "posts" level might contain either string IDs or complex key objects, it may be either an object `{ id:... }` or an array `[{ $key: keyObject, ... }]`. Both need to be handled.

First, the read handler:

```javascript
const readHandler = (query, options, next) => {
  const keys = Array.isArray(query)
    ? query.map(({ $key }) => $key)
    : Object.keys(query);

  const keyResults = Promise.all(keys.map(async (key) => {
    const objects = await db.getAll(getDbQuery(key));

    return objects.map((obj) => {
      // Result objects must have $key matching the query key.
      obj.$key = key;

      // If this query key was not the canonical path of this object,
      // add a $ref to the canonical path.
      if (obj.id !== key) obj.$ref = [...store.path, obj.id];

      return obj;
    });
  }));

  // Flatten the results of the different queries into one array.
  return keyResults.flat();
});
```

> The result from read providers MUST have the same structure as the query, i.e the keys must match. Here, we ensure that by adding `$key` to the result.

The write handler follows a similar pattern:

```javascript
const writeHandler = (change, options, next) => {
  const changeEntries = Array.isArray(change)
    ? change.map(({ $key, ...obj }) => [$key, obj])
    : Object.entries(change);

  return Promise.all(keys.map(async ([key, obj]) => {
    if (obj.$put) {
      // $put: true indicates that this change contains the entire object.
      await db.insertOrReplace(key, obj);
    } else {
      // This is a partial change, preserve other fields.
      await db.updateFields(key, obj);
    }

    // Return the changes that were actually written.
    return { $key: key, ...obj };
  }));
});
```

### Cache provider

TBD

### Auth provider

TBD
