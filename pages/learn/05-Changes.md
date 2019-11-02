# Changes

We've already seen JSON Graphs that represent query results:

```js
{
  users: {
    1: { name: 'Alice', avatar: '👧', … },
    2: { name: 'Bob', avatar: '👨', … },
    …
  },
  posts: {
    1: { author: link('/users/2'), … },
    2: { author: link('/users/1'), … },
    …
  }
}
```

JSON Graphs also represent changes; let's say Alice changes her name to Alicia, this _change_ would be represented by a JSON Graph:

```js
{
  users: {
    1: { name: 'Alicia' }
  }
}
```

Properties that didn't change are omitted.

## Deletions

JSON Graph represent missing properties with `null`; in change objects, this represents deletion.

This is consistent with JSON Merge Patch.
