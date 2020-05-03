# Graffy Index Watcher

Watch provider for the index pattern:

```js
{
  users: { userId: { ... }, ... },
  users$: {
    encodedParameters: page({
      [indexKey]: link('/users/userId'),
      ...
    }),
    ...
  }
}
```

Here, users\$ is an _index_ into the users collection.

While it is straightforward to create a watch provider (change stream) for the `users` tree, it is not as easy to create one for the `users$` tree, especially when arbitrary filtering parameters are supported. IndexWatcher can help craft an index change stream using the entity change stream and an indexing function:

```js
store.use(
  '/users$',
  IndexWatcher(
    '/users', // Entity path prefix
    { country: true, createTime: true }, // Entity sub-query
    (user, params) => {
      // Indexing function
      if (params.country !== user.country) return; // Exclude from index.
      return [user.createTime]; // An array of index keys.
    },
  ),
);
```

This assumes:

- Index and entity trees with the same structure as above

See [Graffy documentation](https://aravindet.github.io/graffy/) for more.
